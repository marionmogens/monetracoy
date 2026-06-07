# Refactor ke Supabase Auth Bawaan

Tujuan: hilangin kebutuhan `SUPABASE_SERVICE_ROLE_KEY` di local dev. Setelah refactor, jalanin di VSCode cuma butuh `.env` yang udah ada (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY).

## Konsekuensi penting (baca dulu)

1. **User lama di tabel `monetra_users` ga bisa kepake lagi.** Password tersimpan sebagai bcrypt hash di kolom `password_hash` — ga bisa di-migrate ke `auth.users`. Semua user (termasuk akun lo sendiri) harus **daftar ulang** dengan email yang sama.
2. **Data transaksi/wallet/kategori bakal "kehilangan owner"** karena `user_id` lama (UUID dari `monetra_users.id`) beda sama UUID baru dari `auth.users.id`. Ada 3 pilihan: (a) wipe semua data lama dan mulai bersih, (b) bikin script remap setelah lo daftar ulang, (c) keep saja, data lama jadi orphan.
3. Setelah ini, server function pake `requireSupabaseAuth` (RLS aktif) — lebih aman dan ga butuh service role.

## Langkah-langkah

### 1. Database migration
- Aktifkan RLS proper di semua tabel `monetra_*` (`SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid()`)
- Drop policy `*_no_direct_access` yang lama
- Hapus kolom `password_hash` dari `monetra_users` (atau drop tabel ini sekalian — datanya dipindah ke `auth.users` + opsional `profiles` table)
- Tambah trigger `on_auth_user_created` untuk auto-seed kategori default + buat row di `monetra_users` (atau ganti pakai `profiles`)

### 2. Auth config
- Enable email auth dengan `auto_confirm_email: true` (biar di dev ga perlu cek email tiap signup)
- Tambah Google sign-in (default Lovable Cloud)

### 3. Server functions
- Hapus `src/lib/session.server.ts` dan `src/lib/auth.functions.ts`
- Convert `finance.functions.ts`, `wallets.functions.ts`, `reminders.functions.ts`, `profile.functions.ts`, `chat.functions.ts` dari `supabaseAdmin + session.userId` → `requireSupabaseAuth` + `context.supabase` + `context.userId`
- Hapus semua `await import("@/integrations/supabase/client.server")`

### 4. Frontend
- `src/routes/auth.tsx`: ganti `signupUser`/`loginUser` server fn → `supabase.auth.signUp` / `supabase.auth.signInWithPassword` langsung di client
- `src/routes/__root.tsx`: pasang `onAuthStateChange` listener + invalidate router/query cache
- Pindahin `/dashboard` ke `src/routes/_authenticated/dashboard.tsx` (dengan layout gate `_authenticated/route.tsx`)
- Ganti tombol logout: `supabase.auth.signOut()`

### 5. Local dev
Setelah refactor selesai:
- Pull repo via GitHub di VSCode
- File `.env` udah ada via Lovable (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY)
- `bun install` + `bun run dev`
- Login/signup jalan tanpa service role

## Pertanyaan sebelum mulai

1. **Data lama**: wipe semua (`TRUNCATE` semua `monetra_*`) atau keep as-is (orphan)?
2. **Google sign-in**: aktifin sekarang atau email/password aja dulu?
3. **Email confirm**: auto-confirm di dev (gampang) atau real email verification (production-ready)?

Bales 3 jawaban itu, gua langsung jalanin step 1–4 di satu turn besar.