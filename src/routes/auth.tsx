import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { signupUser, loginUser } from "@/lib/auth.functions";
import { Logo } from "@/components/Logo";
import { ArrowRight, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* LEFT — brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-[oklch(0.32_0.14_258)] p-12 text-primary-foreground">
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <Link to="/" className="relative z-10 flex items-center gap-2">
          <Logo size={32} />
          <span className="text-base font-semibold tracking-tight">Monetra</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <h2 className="text-5xl font-semibold leading-[1.05] tracking-tight">
            Atur uangmu.<br />
            <span className="text-accent">Lebih ringan.</span>
          </h2>
          <ul className="space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-white/10 backdrop-blur">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              Lacak harian, lihat tren bulanan.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-white/10 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              Asisten AI siap menjawab.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-white/10 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              Aman & privasi terjaga.
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Monetra
        </p>
      </aside>

      {/* RIGHT — form */}
      <main className="relative flex items-center justify-center px-6 py-10 sm:px-12">
        <div className="pointer-events-none absolute -top-24 -right-24 -z-0 h-72 w-72 rounded-full bg-accent/15 blur-3xl lg:hidden" />
        <div className="relative w-full max-w-sm">
          {/* mobile logo */}
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Logo size={28} />
            <span className="text-sm font-semibold tracking-tight">Monetra</span>
          </Link>

          <div className="mb-2 inline-flex w-fit rounded-full bg-primary-soft px-3 py-1 text-[11px] font-medium text-primary">
            {isSignup ? "Akun baru" : "Selamat datang"}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isSignup ? "Mulai gratis." : "Masuk lagi."}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignup ? "Hanya butuh 30 detik." : "Lanjutkan dari mana kamu berhenti."}
          </p>

          <div className="mt-6 inline-flex rounded-full bg-muted p-1 text-sm">
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className={`rounded-full px-5 py-1.5 font-medium transition ${
                !isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Masuk
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className={`rounded-full px-5 py-1.5 font-medium transition ${
                isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Daftar
            </Link>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {isSignup && (
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldCls}
                placeholder="Nama"
                autoComplete="name"
              />
            )}
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldCls}
              placeholder="Email"
              autoComplete="email"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className={fieldCls}
              placeholder="Password"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />

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
              {loading ? "Memproses…" : isSignup ? "Buat akun" : "Masuk"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
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
      </main>
    </div>
  );
}

const fieldCls =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition placeholder:text-muted-foreground";
