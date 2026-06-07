import { createFileRoute, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Monetra" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const router = useRouter();
  const { user } = Route.useRouteContext() as { user: { email?: string } };

  async function handleSignOut() {
    await supabase.auth.signOut();
    await router.invalidate();
    window.location.href = "/auth";
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Keluar
          </button>
        </div>
        <p className="text-muted-foreground">
          Halo, {user?.email}. Auth Supabase aktif. UI dashboard masih placeholder.
        </p>
      </div>
    </div>
  );
}
