import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function requireUserId() {
  const { getMonetraSession } = await import("./session.server");
  const session = await getMonetraSession();
  if (!session.data.userId) throw new Error("Unauthorized");
  return session.data.userId;
}

export const listReminders = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("monetra_reminders")
    .select("id, title, note, amount, due_date, done, created_at")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id as string,
    title: r.title as string,
    note: (r.note as string | null) ?? "",
    amount: r.amount == null ? null : Number(r.amount),
    dueDate: (r.due_date as string).slice(0, 10),
    done: !!r.done,
  }));
});

const createSchema = z.object({
  title: z.string().min(1).max(120),
  note: z.string().max(500).optional().nullable(),
  amount: z.number().min(0).max(1_000_000_000).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createReminder = createServerFn({ method: "POST" })
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("monetra_reminders").insert({
      user_id: userId,
      title: data.title,
      note: data.note || null,
      amount: data.amount ?? null,
      due_date: data.dueDate,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleReminder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("monetra_reminders")
      .update({ done: data.done })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReminder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("monetra_reminders")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
