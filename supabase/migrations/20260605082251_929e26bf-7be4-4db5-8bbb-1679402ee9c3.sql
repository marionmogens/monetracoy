
CREATE TABLE IF NOT EXISTS public.monetra_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  daily_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monetra_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.monetra_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monetra_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.monetra_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'wallet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monetra_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.monetra_users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.monetra_categories(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.monetra_wallets(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount NUMERIC(14,2) NOT NULL,
  note TEXT,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monetra_savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.monetra_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  saved_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monetra_users_email ON public.monetra_users(email);
CREATE INDEX IF NOT EXISTS idx_monetra_tx_user_date ON public.monetra_transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_monetra_cat_user ON public.monetra_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_monetra_goals_user ON public.monetra_savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_monetra_wallets_user ON public.monetra_wallets(user_id);

GRANT ALL ON public.monetra_users TO service_role;
GRANT ALL ON public.monetra_categories TO service_role;
GRANT ALL ON public.monetra_wallets TO service_role;
GRANT ALL ON public.monetra_transactions TO service_role;
GRANT ALL ON public.monetra_savings_goals TO service_role;

ALTER TABLE public.monetra_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetra_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetra_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetra_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetra_savings_goals ENABLE ROW LEVEL SECURITY;
