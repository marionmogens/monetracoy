import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(120),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(120),
});

export const signupUser = createServerFn({ method: "POST" })
  .inputValidator((d) => signupSchema.parse(d))
  .handler(async ({ data }) => {
    const bcrypt = (await import("bcryptjs")).default;
    const { getMonetraSession } = await import("./session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const { data: existingUser, error: existsError } = await supabaseAdmin
      .from("monetra_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existsError) throw new Error(existsError.message);
    if (existingUser) {
      throw new Error("Email sudah terdaftar");
    }

    const hash = await bcrypt.hash(data.password, 10);
    const { data: user, error: insertError } = await supabaseAdmin
      .from("monetra_users")
      .insert({ email, name: data.name, password_hash: hash })
      .select("id, email, name, daily_limit")
      .single();

    if (insertError || !user) throw new Error(insertError?.message || "Gagal membuat akun");

    // seed default categories
    const defaults: Array<[string, "income" | "expense", string]> = [
      ["Gaji", "income", "#22c55e"],
      ["Bonus", "income", "#10b981"],
      ["Makanan", "expense", "#ef4444"],
      ["Transportasi", "expense", "#f97316"],
      ["Belanja", "expense", "#8b5cf6"],
      ["Hiburan", "expense", "#ec4899"],
      ["Tagihan", "expense", "#0ea5e9"],
    ];
    const { error: categoryError } = await supabaseAdmin.from("monetra_categories").insert(
      defaults.map(([name, type, color]) => ({
        user_id: user.id,
        name,
        type,
        color,
      }))
    );

    if (categoryError) throw new Error(categoryError.message);

    const session = await getMonetraSession();
    await session.update({ userId: user.id });
    return { id: user.id, email: user.email, name: user.name };
  });

export const loginUser = createServerFn({ method: "POST" })
  .inputValidator((d) => loginSchema.parse(d))
  .handler(async ({ data }) => {
    const bcrypt = (await import("bcryptjs")).default;
    const { getMonetraSession } = await import("./session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: u, error } = await supabaseAdmin
      .from("monetra_users")
      .select("id, email, name, password_hash")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!u) throw new Error("Email atau password salah");

    const ok = await bcrypt.compare(data.password, u.password_hash);
    if (!ok) throw new Error("Email atau password salah");
    const session = await getMonetraSession();
    await session.update({ userId: u.id });
    return { id: u.id, email: u.email, name: u.name };
  });

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const { getMonetraSession } = await import("./session.server");
  const session = await getMonetraSession();
  await session.clear();
  return { ok: true };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getMonetraSession } = await import("./session.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const session = await getMonetraSession();
  if (!session.data.userId) return null;
  const { data: u, error } = await supabaseAdmin
    .from("monetra_users")
    .select("id, email, name, daily_limit, avatar_url")
    .eq("id", session.data.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!u) return null;

  return {
    id: u.id as string,
    email: u.email as string,
    name: u.name as string,
    dailyLimit: Number(u.daily_limit),
    avatarUrl: (u.avatar_url as string | null) ?? null,
  };
});
