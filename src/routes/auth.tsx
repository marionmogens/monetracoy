import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { signupUser, loginUser } from "@/lib/auth.functions";
import { Logo } from "@/components/Logo";
import { ArrowRight, Wallet } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).catch("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Masuk — Monetra" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const router = useRouter();
  const signup = useServerFn(signupUser);
  const login = useServerFn(loginUser);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignup) {
        await signup({ data: { name, email, password } });
      } else {
        await login({ data: { email, password } });
      }
      await router.invalidate();
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-accent p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={36} />
          <span className="text-lg font-semibold tracking-tight">Monetra</span>
        </Link>
        <div className="space-y-5">
          <Wallet className="h-10 w-10 opacity-80" />
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Mulai perjalanan keuanganmu yang lebih sehat.
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            Catat, pantau, dan dapatkan saran dari AI — semuanya dalam satu tempat yang rapi.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">
          "Uang yang dikelola dengan baik memberikan kebebasan."
        </p>
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-background/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="font-semibold tracking-tight">Monetra</span>
            </Link>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isSignup ? "Buat akun baru" : "Selamat datang kembali"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? "Hanya butuh 30 detik untuk mulai mengatur keuanganmu."
              : "Masuk untuk lanjut mengelola keuanganmu."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {isSignup && (
              <Field label="Nama">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  placeholder="Nama lengkap"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                placeholder="kamu@email.com"
              />
            </Field>
            <Field label="Password">
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                placeholder="Minimal 6 karakter"
              />
            </Field>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {loading ? "Memproses..." : isSignup ? "Daftar" : "Masuk"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <Link
              to="/auth"
              search={{ mode: isSignup ? "signin" : "signup" }}
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? "Masuk" : "Daftar"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
