import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { signupUser, loginUser } from "@/lib/auth.functions";
import { Logo } from "@/components/Logo";
import { ArrowRight } from "lucide-react";

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient soft indigo wash + a single warm accent glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background" />
      <div className="pointer-events-none absolute -top-32 -left-32 -z-10 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 -z-10 h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-3xl" />

      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-base font-semibold tracking-tight">Monetra</span>
        </Link>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-2 inline-flex w-fit rounded-full bg-primary-soft px-3 py-1 text-[11px] font-medium text-primary">
            {isSignup ? "Akun baru" : "Selamat datang"}
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            {isSignup ? (
              <>
                Atur uangmu.<br />
                <span className="text-primary">Lebih ringan.</span>
              </>
            ) : (
              <>
                Lanjutkan,<br />
                <span className="text-primary">kelola hari ini.</span>
              </>
            )}
          </h1>

          {/* Tab switch */}
          <div className="mt-8 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className={`rounded-full py-2 text-center text-sm font-medium transition ${
                !isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Masuk
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className={`rounded-full py-2 text-center text-sm font-medium transition ${
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
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Dibuat dengan tenang. ✨
        </p>
      </div>
    </div>
  );
}

const fieldCls =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground";
