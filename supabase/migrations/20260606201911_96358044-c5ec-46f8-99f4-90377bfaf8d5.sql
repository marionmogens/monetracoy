
-- All app access uses server-side service_role via TanStack server functions
-- with a custom session cookie. Block any direct anon/authenticated access.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['monetra_users','monetra_categories','monetra_wallets','monetra_transactions','monetra_savings_goals'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t || '_no_direct_access', t);
  END LOOP;
END $$;
