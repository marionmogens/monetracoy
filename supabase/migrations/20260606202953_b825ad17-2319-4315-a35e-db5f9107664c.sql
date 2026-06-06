CREATE TABLE IF NOT EXISTS public.monetra_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.monetra_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT,
  amount NUMERIC(14,2),
  due_date DATE NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monetra_reminders_user_date
  ON public.monetra_reminders(user_id, due_date);

GRANT ALL ON public.monetra_reminders TO service_role;

ALTER TABLE public.monetra_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY monetra_reminders_no_direct_access
  ON public.monetra_reminders
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);