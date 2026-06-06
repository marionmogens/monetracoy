import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function requireUserId() {
  const { getMonetraSession } = await import("./session.server");
  const session = await getMonetraSession();
  if (!session.data.userId) throw new Error("Unauthorized");
  return session.data.userId;
}

async function getAvailableFunds(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: txs }, { data: wallets }] = await Promise.all([
    supabaseAdmin.from("monetra_transactions").select("type, amount").eq("user_id", userId),
    supabaseAdmin.from("monetra_wallets").select("balance").eq("user_id", userId),
  ]);
  let income = 0;
  let expense = 0;
  for (const t of txs || []) {
    if (t.type === "income") income += Number(t.amount);
    else expense += Number(t.amount);
  }
  const allocated = (wallets || []).reduce((s, w) => s + Number(w.balance), 0);
  return income - expense - allocated;
}

const createSchema = z.object({
  categoryId: z.string().uuid(),
  initialBalance: z.number().min(0).max(1_000_000_000),
});

const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

export const createWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load category (must belong to user) and prevent duplicates
    const { data: cat, error: catErr } = await supabaseAdmin
      .from("monetra_categories")
      .select("id, name, color, type")
      .eq("id", data.categoryId)
      .eq("user_id", userId)
      .maybeSingle();
    if (catErr || !cat) throw new Error("Kategori tidak ditemukan");

    const { data: existing } = await supabaseAdmin
      .from("monetra_wallets")
      .select("id")
      .eq("user_id", userId)
      .eq("category_id", data.categoryId)
      .maybeSingle();
    if (existing) throw new Error("Dompet untuk kategori ini sudah ada");

    const avail = await getAvailableFunds(userId);
    if (avail <= 0) {
      throw new Error(
        "Tidak ada dana yang bisa dialokasikan. Tambahkan pemasukan dulu sebelum membuat dompet."
      );
    }
    if (data.initialBalance > avail) {
      throw new Error(
        `Saldo awal melebihi dana tersedia (${rupiah(avail)}). Kurangi nominalnya atau tambahkan pemasukan.`
      );
    }
    const { error } = await supabaseAdmin.from("monetra_wallets").insert({
      user_id: userId,
      category_id: data.categoryId,
      name: cat.name,
      balance: data.initialBalance,
      color: cat.color,
      icon: "wallet",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


const topUpSchema = z.object({
  id: z.string().uuid(),
  amount: z
    .number()
    .min(-1_000_000_000)
    .max(1_000_000_000)
    .refine((v) => v !== 0, "Jumlah tidak boleh 0"),
});

export const adjustWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => topUpSchema.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w, error: wErr } = await supabaseAdmin
      .from("monetra_wallets")
      .select("balance")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (wErr || !w) throw new Error(wErr?.message || "Dompet tidak ditemukan");

    // Top up (positive) requires available funds
    if (data.amount > 0) {
      const avail = await getAvailableFunds(userId);
      if (data.amount > avail) {
        throw new Error(
          `Dana tersedia hanya ${rupiah(avail)}. Tambah pemasukan dulu sebelum top up.`
        );
      }
    }

    const next = Number(w.balance) + data.amount;
    if (next < 0) throw new Error("Saldo dompet tidak boleh negatif");
    const { error } = await supabaseAdmin
      .from("monetra_wallets")
      .update({ balance: next })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("monetra_wallets")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
