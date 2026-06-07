
-- 1. Wipe all old monetra data
TRUNCATE TABLE public.monetra_transactions, public.monetra_reminders, public.monetra_savings_goals, public.monetra_wallets, public.monetra_categories, public.monetra_users CASCADE;

-- 2. Drop the old monetra_users (we'll use auth.users + trigger-created row)
DROP TABLE public.monetra_users CASCADE;

-- 3. Recreate monetra_users as a profile table linked to auth.users
CREATE TABLE public.monetra_users (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  daily_limit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetra_users TO authenticated;
GRANT ALL ON public.monetra_users TO service_role;

ALTER TABLE public.monetra_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own row select" ON public.monetra_users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own row insert" ON public.monetra_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own row update" ON public.monetra_users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own row delete" ON public.monetra_users FOR DELETE TO authenticated USING (auth.uid() = id);

-- 4. Drop old open-deny policies on other monetra_* tables and replace with proper user-scoped policies
DROP POLICY IF EXISTS monetra_categories_no_direct_access ON public.monetra_categories;
DROP POLICY IF EXISTS monetra_reminders_no_direct_access ON public.monetra_reminders;
DROP POLICY IF EXISTS monetra_savings_goals_no_direct_access ON public.monetra_savings_goals;
DROP POLICY IF EXISTS monetra_transactions_no_direct_access ON public.monetra_transactions;
DROP POLICY IF EXISTS monetra_wallets_no_direct_access ON public.monetra_wallets;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetra_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetra_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetra_savings_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetra_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetra_wallets TO authenticated;

CREATE POLICY "own select" ON public.monetra_categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.monetra_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.monetra_categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.monetra_categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own select" ON public.monetra_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.monetra_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.monetra_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.monetra_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own select" ON public.monetra_savings_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.monetra_savings_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.monetra_savings_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.monetra_savings_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own select" ON public.monetra_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.monetra_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.monetra_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.monetra_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own select" ON public.monetra_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.monetra_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.monetra_wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.monetra_wallets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Trigger: auto-create monetra_users row + default categories on signup
CREATE OR REPLACE FUNCTION public.handle_new_monetra_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.monetra_users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.monetra_categories (user_id, name, type, color) VALUES
    (NEW.id, 'Gaji', 'income', '#22c55e'),
    (NEW.id, 'Bonus', 'income', '#10b981'),
    (NEW.id, 'Makanan', 'expense', '#ef4444'),
    (NEW.id, 'Transportasi', 'expense', '#f97316'),
    (NEW.id, 'Belanja', 'expense', '#8b5cf6'),
    (NEW.id, 'Hiburan', 'expense', '#ec4899'),
    (NEW.id, 'Tagihan', 'expense', '#0ea5e9');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_monetra ON auth.users;
CREATE TRIGGER on_auth_user_created_monetra
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_monetra_user();
