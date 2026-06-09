import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getAvailableFunds(supabase: SupabaseClient, userId: string) {
  const [{ data: txs }, { data: wallets }] = await Promise.all([
    supabase.from("monetra_transactions").select("type, amount").eq("user_id", userId),
    supabase.from("monetra_wallets").select("balance").eq("user_id", userId),
  ]);
  let income = 0;
  let expense = 0;
  for (const t of txs || []) {
    if (t.type === "income") income += Number(t.amount);
    else expense += Number(t.amount);
  }
  const allocated = (wallets || []).reduce((s: number, w: any) => s + Number(w.balance), 0);
  return income - expense - allocated;
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  initialBalance: z.number().min(0).max(1_000_000_000),
  categoryId: z.string().uuid().optional().nullable(),
  color: z.string().max(20).optional(),
});

const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

export const createWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const avail = await getAvailableFunds(supabase, userId);
    if (data.initialBalance > 0 && data.initialBalance > avail) {
      throw new Error(
        `Saldo awal melebihi dana tersedia (${rupiah(avail)}). Tambah pemasukan dulu atau kurangi nominalnya.`
      );
    }
    const { error } = await supabase.from("monetra_wallets").insert({
      user_id: userId,
      category_id: data.categoryId || null,
      name: data.name,
      balance: data.initialBalance,
      color: data.color || "#3b4cca",
      icon: "wallet",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const topUpSchema = z.object({
  id: z.string().uuid(),
  amount: z
    .number()
    .positive("Jumlah top up harus lebih dari 0")
    .max(1_000_000_000)
});

export const adjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => topUpSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: w, error: wErr } = await supabase
      .from("monetra_wallets")
      .select("balance")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (wErr || !w) throw new Error(wErr?.message || "Dompet tidak ditemukan");

    const avail = await getAvailableFunds(supabase, userId);
    if (data.amount > avail) {
      throw new Error(
        `Dana tersedia hanya ${rupiah(avail)}. Tambah pemasukan dulu sebelum top up.`
      );
    }

    const next = Number(w.balance) + data.amount;
    const { error } = await supabase
      .from("monetra_wallets")
      .update({ balance: next })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("monetra_wallets")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
