import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function requireUserId() {
  const { getMonetraSession } = await import("./session.server");
  const session = await getMonetraSession();
  if (!session.data.userId) throw new Error("Unauthorized");
  return session.data.userId;
}

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  avatarUrl: z
    .string()
    .max(500_000)
    .optional()
    .nullable(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { name: string; avatar_url?: string | null } = { name: data.name };
    if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;
    const { error } = await supabaseAdmin
      .from("monetra_users")
      .update(patch)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
