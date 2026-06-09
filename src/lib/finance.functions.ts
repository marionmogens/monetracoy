import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureMonetraUser(supabase: any, userId: string, claims: any) {
  const { data: existing, error: existingError } = await supabase
    .from("monetra_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (!existing) {
    const email = claims?.email || "";
    const name = claims?.user_metadata?.name || claims?.name || email.split("@")[0] || "User";
    const { error: insertError } = await supabase
      .from("monetra_users")
      .insert({ id: userId, email, name });
    if (insertError) throw new Error(insertError.message);
  }

  const { data: categories, error: categoryCheckError } = await supabase
    .from("monetra_categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (categoryCheckError) throw new Error(categoryCheckError.message);
  if (!categories?.length) {
    const defaults: Array<[string, "income" | "expense", string]> = [
      ["Gaji", "income", "#22c55e"],
      ["Bonus", "income", "#10b981"],
      ["Makanan", "expense", "#ef4444"],
      ["Transportasi", "expense", "#f97316"],
      ["Belanja", "expense", "#8b5cf6"],
      ["Hiburan", "expense", "#ec4899"],
      ["Tagihan", "expense", "#0ea5e9"],
    ];
    const { error: seedError } = await supabase.from("monetra_categories").insert(
      defaults.map(([name, type, color]) => ({ user_id: userId, name, type, color }))
    );
    if (seedError) throw new Error(seedError.message);
  }
}

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    await ensureMonetraUser(supabase, userId, claims);

    const [userRes, txRes, catRes, walletRes] = await Promise.all([
      supabase
        .from("monetra_users")
        .select("id, name, email, daily_limit, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("monetra_transactions")
        .select(
          "id, type, amount, note, occurred_at, category_id, wallet_id, monetra_categories(name, color)"
        )
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("monetra_categories")
        .select("id, name, type, color")
        .eq("user_id", userId)
        .order("name"),
      supabase
        .from("monetra_wallets")
        .select("id, name, balance, color, icon, category_id")
        .eq("user_id", userId)
        .order("created_at"),
    ]);

    if (userRes.error || !userRes.data)
      throw new Error(userRes.error?.message || "User tidak ditemukan");
    if (txRes.error) throw new Error(txRes.error.message);
    if (catRes.error) throw new Error(catRes.error.message);
    if (walletRes.error) throw new Error(walletRes.error.message);

    const u = userRes.data;
    return {
      user: {
        id: u.id as string,
        name: u.name as string,
        email: u.email as string,
        dailyLimit: Number(u.daily_limit),
        avatarUrl: (u.avatar_url as string | null) ?? null,
      },
      categories: (catRes.data || []).map((c: any) => ({
        id: c.id as string,
        name: c.name as string,
        type: c.type as "income" | "expense",
        color: c.color as string,
      })),
      wallets: (walletRes.data || []).map((w: any) => ({
        id: w.id as string,
        name: w.name as string,
        balance: Number(w.balance),
        color: w.color as string,
        icon: w.icon as string,
        categoryId: (w.category_id as string | null) ?? null,
      })),
      transactions: (txRes.data || []).map((t: any) => {
        const cat = Array.isArray(t.monetra_categories)
          ? t.monetra_categories[0]
          : t.monetra_categories;
        return {
          id: t.id as string,
          type: t.type as "income" | "expense",
          amount: Number(t.amount),
          note: (t.note as string) || "",
          occurredAt: (t.occurred_at as string).slice(0, 10),
          categoryId: t.category_id as string | null,
          walletId: t.wallet_id as string | null,
          categoryName: (cat?.name as string) || "Tanpa kategori",
          categoryColor: (cat?.color as string) || "#94a3b8",
        };
      }),
    };
  });

const txSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().max(1_000_000_000),
  note: z.string().max(200).optional().default(""),
  categoryId: z.string().uuid().nullable().optional(),
  walletId: z.string().uuid().nullable().optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const addTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => txSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let categoryId = data.categoryId || null;

    if (data.walletId) {
      const { data: w, error: wErr } = await supabase
        .from("monetra_wallets")
        .select("id, balance, category_id")
        .eq("id", data.walletId)
        .eq("user_id", userId)
        .maybeSingle();
      if (wErr || !w) throw new Error(wErr?.message || "Dompet tidak ditemukan");
      categoryId = (w.category_id as string | null) ?? categoryId;
      const delta = data.type === "expense" ? -data.amount : data.amount;
      const newBal = Number(w.balance) + delta;
      if (newBal < 0) throw new Error("Saldo dompet tidak cukup");
      const { error: uErr } = await supabase
        .from("monetra_wallets")
        .update({ balance: newBal })
        .eq("id", data.walletId)
        .eq("user_id", userId);
      if (uErr) throw new Error(uErr.message);
    }

    const { error } = await supabase.from("monetra_transactions").insert({
      user_id: userId,
      category_id: categoryId,
      wallet_id: data.walletId || null,
      type: data.type,
      amount: data.amount,
      note: data.note || null,
      occurred_at: data.occurredAt,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: tx } = await supabase
      .from("monetra_transactions")
      .select("type, amount, wallet_id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (tx?.wallet_id) {
      const { data: w } = await supabase
        .from("monetra_wallets")
        .select("balance")
        .eq("id", tx.wallet_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (w) {
        const reverse =
          tx.type === "expense" ? Number(tx.amount) : -Number(tx.amount);
        await supabase
          .from("monetra_wallets")
          .update({ balance: Number(w.balance) + reverse })
          .eq("id", tx.wallet_id)
          .eq("user_id", userId);
      }
    }

    const { error } = await supabase
      .from("monetra_transactions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const catSchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const addCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => catSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("monetra_categories")
      .insert({ user_id: userId, name: data.name, type: data.type, color: data.color });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("monetra_categories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateDailyLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ amount: z.number().min(0).max(1_000_000_000) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("monetra_users")
      .update({ daily_limit: data.amount })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const exportMonthlyCSV = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const start = `${data.year}-${String(data.month).padStart(2, "0")}-01`;
    const endMonth = data.month === 12 ? 1 : data.month + 1;
    const endYear = data.month === 12 ? data.year + 1 : data.year;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
    const { data: rows, error } = await supabase
      .from("monetra_transactions")
      .select("occurred_at, type, amount, note, monetra_categories(name)")
      .eq("user_id", userId)
      .gte("occurred_at", start)
      .lt("occurred_at", end)
      .order("occurred_at");
    if (error) throw new Error(error.message);
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const header = "Tanggal,Tipe,Kategori,Jumlah,Catatan";
    const lines = (rows || []).map((r: any) => {
      const cat = Array.isArray(r.monetra_categories)
        ? r.monetra_categories[0]
        : r.monetra_categories;
      return [
        (r.occurred_at as string).slice(0, 10),
        r.type,
        esc(cat?.name || ""),
        Number(r.amount).toFixed(2),
        esc(r.note || ""),
      ].join(",");
    });
    return { csv: [header, ...lines].join("\n") };
  });

export const exportMonthlyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const start = `${data.year}-${String(data.month).padStart(2, "0")}-01`;
    const endMonth = data.month === 12 ? 1 : data.month + 1;
    const endYear = data.month === 12 ? data.year + 1 : data.year;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
    const [{ data: userRow }, { data: rows, error }] = await Promise.all([
      supabase
        .from("monetra_users")
        .select("name, email")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("monetra_transactions")
        .select("occurred_at, type, amount, note, monetra_categories(name)")
        .eq("user_id", userId)
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .order("occurred_at"),
    ]);
    if (error) throw new Error(error.message);
    const txs = (rows || []).map((r: any) => {
      const cat = Array.isArray(r.monetra_categories)
        ? r.monetra_categories[0]
        : r.monetra_categories;
      return {
        date: (r.occurred_at as string).slice(0, 10),
        type: r.type as "income" | "expense",
        category: cat?.name || "Tanpa kategori",
        amount: Number(r.amount),
        note: (r.note as string) || "",
      };
    });
    return {
      user: { name: userRow?.name || "", email: userRow?.email || "" },
      period: { year: data.year, month: data.month },
      transactions: txs,
    };
  });
