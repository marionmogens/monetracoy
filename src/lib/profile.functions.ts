import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("monetra_users")
      .select("id, email, name, daily_limit, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id: data.id as string,
      email: data.email as string,
      name: data.name as string,
      dailyLimit: Number(data.daily_limit),
      avatarUrl: (data.avatar_url as string | null) ?? null,
    };
  });

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  avatarUrl: z.string().max(500_000).optional().nullable(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: { name: string; avatar_url?: string | null } = { name: data.name };
    if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;
    const { error } = await supabase
      .from("monetra_users")
      .update(patch)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
