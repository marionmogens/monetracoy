import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const msgSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .min(1)
    .max(30),
});

export const chatFinance = createServerFn({ method: "POST" })
  .inputValidator((d) => msgSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI belum dikonfigurasi");

    const { getMonetraSession } = await import("./session.server");
    const session = await getMonetraSession();
    let context = "";
    if (session.data.userId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      const startStr = monthStart.toISOString().slice(0, 10);
      const [{ data: txRows }, { data: userRow }] = await Promise.all([
        supabaseAdmin
          .from("monetra_transactions")
          .select("type, amount")
          .eq("user_id", session.data.userId)
          .gte("occurred_at", startStr),
        supabaseAdmin
          .from("monetra_users")
          .select("daily_limit")
          .eq("id", session.data.userId)
          .maybeSingle(),
      ]);
      let income = 0;
      let expense = 0;
      for (const r of txRows || []) {
        if (r.type === "income") income += Number(r.amount);
        else expense += Number(r.amount);
      }
      const limit = Number(userRow?.daily_limit || 0);
      context = `\nData keuangan pengguna bulan ini: Pemasukan Rp${income.toLocaleString("id-ID")}, Pengeluaran Rp${expense.toLocaleString("id-ID")}. Limit harian: Rp${limit.toLocaleString("id-ID")}.`;
    }

    const system = `Kamu Monetra AI, asisten keuangan pribadi berbahasa Indonesia yang santai dan natural seperti teman ngobrol.

Aturan jawaban:
- Singkat, langsung ke poin. Maksimal 2-3 kalimat untuk pertanyaan ringan.
- Hindari bullet point dan heading kecuali benar-benar perlu listing.
- Gaya percakapan biasa, tidak formal.
- Jangan mengulang pertanyaan user.
- Pakai data keuangan user kalau relevan, jangan dipaksakan.${context}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...data.messages],
        temperature: 0.8,
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Terlalu banyak permintaan, coba lagi sebentar.");
      if (res.status === 402) throw new Error("Kuota AI habis. Tambahkan kredit di workspace.");
      throw new Error("AI gagal merespons");
    }
    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content || "Maaf, tidak ada respons.";
    return { reply };
  });
