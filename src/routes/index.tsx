import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Wallet, PieChart, Bot, Download, Target, Sparkles, ChevronLeft, ChevronRight, Quote, CalendarDays } from "lucide-react";
import { Logo as LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monetra — Atur Keuangan Lebih Cerdas" },
      {
        name: "description",
        content:
          "Monetra adalah money tracker modern dengan dompet harian, kategori, grafik, ekspor CSV, dan asisten AI keuangan.",
      },
      { property: "og:title", content: "Monetra — Atur Keuangan Lebih Cerdas" },
      {
        property: "og:description",
        content: "Catat pemasukan, kontrol pengeluaran harian, dan dapatkan saran AI personal.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary-soft/40 via-background to-background text-foreground">
      {/* Decorative soft blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
      <div className="pointer-events-none absolute top-[110vh] left-1/3 h-80 w-80 rounded-full bg-primary-soft/60 blur-3xl" />
      <div className="relative">
        <Header />
        <Hero />
        <Features />
        <HowItWorks />
        <Quotes />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8 md:px-12 lg:px-20">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">Monetra</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#fitur" className="hover:text-foreground transition-colors">Fitur</a>
          <a href="#cara-kerja" className="hover:text-foreground transition-colors">Cara Kerja</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Masuk
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
          >
            Mulai gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return <LogoMark size={32} />;
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl gap-12 px-8 py-16 md:grid-cols-2 md:items-center md:px-12 md:py-24 lg:px-20">
      <div className="space-y-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary-soft/40 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Asisten AI keuangan personal
        </div>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Atur uangmu, <span className="text-primary">tenangkan</span> pikiranmu.
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
          Monetra membantumu mencatat pemasukan & pengeluaran, mengatur dompet harian,
          dan memahami kebiasaan finansial lewat grafik dan saran AI.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            Buat akun gratis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#fitur"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            Lihat fitur
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
          <span>✓ Gratis selamanya</span>
          <span>✓ Data terenkripsi</span>
          <span>✓ Siap pakai di HP & laptop</span>
        </div>
      </div>

      <HeroMock />
    </section>
  );
}

function HeroMock() {
  const days = ["S", "S", "R", "K", "J", "S", "M"];
  const barSets = [
    [38, 62, 45, 78, 55, 90, 68],
    [52, 48, 70, 55, 82, 64, 75],
    [44, 70, 58, 85, 60, 72, 88],
  ];
  const chats = [
    { q: "Berapa budget makanan?", a: "Sisa Rp 320rb minggu ini. Coba Rp 75rb/hari ya!" },
    { q: "Pengeluaran terbesar?", a: "Belanja online — Rp 1.2jt bulan ini. Naik 22%." },
    { q: "Bisa nabung berapa?", a: "Berdasarkan ritme kamu, Rp 1.5jt/bulan aman." },
  ];
  const [barIdx, setBarIdx] = useState(0);
  const [chatIdx, setChatIdx] = useState(0);

  useEffect(() => {
    const b = setInterval(() => setBarIdx((i) => (i + 1) % barSets.length), 1400);
    const c = setInterval(() => setChatIdx((i) => (i + 1) % chats.length), 1800);
    return () => {
      clearInterval(b);
      clearInterval(c);
    };
  }, []);


  const bars = barSets[barIdx];
  const chat = chats[chatIdx];

  return (
    <div className="relative">
      <div className="animate-pulse-glow absolute -inset-10 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/25 via-accent/30 to-transparent blur-3xl" />

      {/* Laptop */}
      <div className="animate-float-laptop relative mx-auto w-full max-w-xl">
        {/* Screen bezel */}
        <div className="rounded-t-2xl border border-border bg-neutral-900 p-3 shadow-2xl shadow-primary/20">
          <div className="mx-auto mb-2 h-1.5 w-1.5 rounded-full bg-neutral-700" />
          <div className="overflow-hidden rounded-lg bg-card">
            {/* Mini toolbar */}
            <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <div className="ml-3 flex-1 truncate rounded bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                monetra.app/dashboard
              </div>
            </div>

            {/* App body */}
            <div className="grid grid-cols-5 gap-3 p-4">
              {/* Chart card */}
              <div className="col-span-3 rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Saldo</p>
                    <p key={barIdx} className="animate-count-up text-base font-semibold tracking-tight">
                      Rp 4.250.000
                    </p>
                  </div>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                    +12.4%
                  </span>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <div className="flex h-20 flex-1 items-end gap-1.5">
                    {bars.map((h, i) => (
                      <div key={`${barIdx}-${i}`} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="animate-grow-bar w-full rounded-t bg-gradient-to-t from-primary to-accent"
                          style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }}
                        />
                        <span className="text-[8px] text-muted-foreground">{days[i]}</span>
                      </div>
                    ))}
                  </div>
                  <DonutChart key={`d-${barIdx}`} />
                </div>
              </div>

              {/* Chatbot card */}
              <div className="col-span-2 flex flex-col rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-3 w-3" />
                  </div>
                  <p className="text-xs font-medium">Monetra AI</p>
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                </div>
                <div className="mt-2 space-y-1.5">
                  <div
                    key={`q-${chatIdx}`}
                    className="animate-chat-pop ml-auto max-w-[90%] rounded-lg rounded-tr-sm bg-primary px-2 py-1 text-[10px] text-primary-foreground"
                  >
                    {chat.q}
                  </div>
                  <div
                    key={`a-${chatIdx}`}
                    className="animate-chat-pop max-w-[95%] rounded-lg rounded-tl-sm bg-muted px-2 py-1 text-[10px] text-foreground"
                    style={{ animationDelay: "350ms" }}
                  >
                    {chat.a}
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5">
                  <span className="flex-1 truncate text-[10px] text-muted-foreground">Tanya AI…</span>
                  <span className="flex gap-0.5">
                    <span className="animate-typing-dot h-1 w-1 rounded-full bg-primary" />
                    <span className="animate-typing-dot h-1 w-1 rounded-full bg-primary" style={{ animationDelay: "0.2s" }} />
                    <span className="animate-typing-dot h-1 w-1 rounded-full bg-primary" style={{ animationDelay: "0.4s" }} />
                  </span>
                </div>
              </div>

              {/* Category bars row */}
              <div className="col-span-5 grid grid-cols-3 gap-2">
                {[
                  { name: "Makanan", color: "#ef4444", pct: 70 },
                  { name: "Transport", color: "#f97316", pct: 45 },
                  { name: "Belanja", color: "#8b5cf6", pct: 30 },
                ].map((c, i) => (
                  <div key={c.name} className="rounded-lg border border-border bg-background p-2">
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{c.name}</span>
                      <span>{c.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Laptop base */}
        <div className="relative mx-auto h-3 w-[108%] -translate-x-[3.7%] rounded-b-2xl bg-gradient-to-b from-neutral-800 to-neutral-700 shadow-xl">
          <div className="absolute left-1/2 top-1 h-1 w-16 -translate-x-1/2 rounded-full bg-neutral-900/60" />
        </div>
        <div className="mx-auto h-1 w-[60%] rounded-b-xl bg-neutral-700/40" />
      </div>
    </div>
  );
}


function DonutChart() {
  // Cycle 3 segment sets for a "live" feel
  const sets = [
    [
      { c: "var(--primary)", v: 45 },
      { c: "var(--accent)", v: 30 },
      { c: "#64748b", v: 25 },
    ],
    [
      { c: "var(--primary)", v: 55 },
      { c: "var(--accent)", v: 25 },
      { c: "#64748b", v: 20 },
    ],
    [
      { c: "var(--primary)", v: 35 },
      { c: "var(--accent)", v: 40 },
      { c: "#64748b", v: 25 },
    ],
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % sets.length), 1500);
    return () => clearInterval(t);
  }, []);
  const seg = sets[idx];
  const r = 14;
  const C = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg viewBox="0 0 40 40" className="h-20 w-20 -rotate-90 transition-all duration-700">
      <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--muted) / 0.5)" strokeWidth="6" />
      {seg.map((s, i) => {
        const len = (s.v / 100) * C;
        const dash = `${len} ${C - len}`;
        const dashOff = -off;
        off += len;
        return (
          <circle
            key={i}
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={s.c}
            strokeWidth="6"
            strokeDasharray={dash}
            strokeDashoffset={dashOff}
            strokeLinecap="butt"
            style={{ transition: "stroke-dasharray 700ms ease-out, stroke-dashoffset 700ms ease-out" }}
          />
        );
      })}
    </svg>
  );
}



const features = [
  { icon: Wallet, title: "Dompet per kategori", desc: "Pisahkan saldo untuk makan, transport, belanja — sesuai kategorimu." },
  { icon: PieChart, title: "Grafik harian & bulanan", desc: "Lihat tren pengeluaran lewat diagram batang dan donat." },
  { icon: Target, title: "Batas harian", desc: "Tetapkan limit pengeluaran tiap hari, dipantau otomatis." },
  { icon: CalendarDays, title: "Kalender & reminder", desc: "Catat tagihan dan jadwal pembayaran di kalender." },
  { icon: Bot, title: "Asisten AI", desc: "Tanyakan saldo, tren, dan saran finansial dalam bahasa sehari-hari." },
  { icon: Download, title: "Ekspor CSV & PDF", desc: "Unduh laporan bulanan kapan pun kamu butuh." },
];

function Features() {
  return (
    <section id="fitur" className="border-t border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-8 py-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Keuangan yang teratur dimulai dari <span className="text-primary">kebiasaan mencatat.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Semua yang kamu butuh untuk mengatur uang harian — tanpa ribet.
          </p>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Daftar",
      desc: "Buat akun dengan email & password. Tanpa kartu kredit.",
      icon: Sparkles,
    },
    {
      n: "02",
      title: "Catat",
      desc: "Tambah pemasukan & pengeluaran lewat antarmuka yang ringan.",
      icon: Wallet,
    },
    {
      n: "03",
      title: "Pantau",
      desc: "Lihat grafik dan minta saran dari asisten AI Monetra.",
      icon: Bot,
    },
  ];
  return (
    <section id="cara-kerja" className="relative">
      <div className="mx-auto grid max-w-7xl gap-16 px-8 py-24 md:grid-cols-2 md:items-start md:gap-20 md:px-12 md:py-32 lg:px-20">
        {/* Left — sticky heading */}
        <div className="md:sticky md:top-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Cara Kerja
          </div>
          <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Tiga langkah. <br />
            <span className="text-primary">Itu saja.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Mulai mengatur keuanganmu dalam hitungan menit — tidak perlu spreadsheet
            atau pengetahuan finansial.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
          >
            Coba sekarang
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Right — vertical timeline */}
        <ol className="relative space-y-6 md:space-y-8">
          <div
            aria-hidden
            className="absolute left-7 top-6 bottom-6 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent"
          />
          {steps.map((s) => (
            <li
              key={s.n}
              className="group relative flex gap-5 rounded-3xl border border-border bg-card/80 p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 text-xs font-medium text-primary/70">
                  <span>Langkah {s.n}</span>
                </div>
                <h3 className="font-display mt-1 text-xl font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CTA() {
  const stats = [
    { v: "100%", l: "Gratis" },
    { v: "<2 mnt", l: "Setup" },
    { v: "24/7", l: "Asisten AI" },
  ];
  return (
    <section className="px-8 pb-24 md:px-12 lg:px-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-primary to-accent p-10 text-primary-foreground shadow-2xl shadow-primary/30 md:p-16">
        {/* Decorative grid + blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />

        <div className="relative grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Mulai perjalanan finansialmu
            </span>
            <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              Mulai hari ini. <br />
              <span className="text-primary-foreground/80">Gratis selamanya.</span>
            </h2>
            <p className="mt-5 max-w-md text-base text-primary-foreground/80">
              Bergabung dengan ribuan orang yang sudah lebih tenang soal uang.
              Tanpa kartu kredit, tanpa komitmen.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="group inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground shadow-lg transition-all hover:scale-[1.02] hover:bg-background/95"
              >
                Buat akun gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-medium backdrop-blur transition-all hover:bg-white/20"
              >
                Sudah punya akun
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {stats.map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur"
              >
                <p className="font-display text-xl font-semibold tracking-tight md:text-2xl">{s.v}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-primary-foreground/70">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// TODO: Ganti gambar di array `quotes` dengan gambar punyamu sendiri.
// Letakkan file di /public/quotes/ (mis. q1.jpg) lalu set `image: "/quotes/q1.jpg"`.
const quotes = [
  {
    text: "Do not save what is left after spending; spend what is left after saving.",
    author: "Warren Buffett",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
  },
  {
    text: "A budget is telling your money where to go instead of wondering where it went.",
    author: "Dave Ramsey",
    image: "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=1200&q=80",
  },
  {
    text: "Beware of little expenses; a small leak will sink a great ship.",
    author: "Benjamin Franklin",
    image: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=1200&q=80",
  },
  {
    text: "Wealth consists not in having great possessions, but in having few wants.",
    author: "Epictetus",
    image: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200&q=80",
  },
];

function Quotes() {
  const [i, setI] = useState(0);
  const total = quotes.length;
  const go = (delta: number) => setI((p) => (p + delta + total) % total);

  // Auto-advance
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total]);

  return (
    <section className="relative border-y border-border/60 bg-gradient-to-br from-primary-soft/40 via-background to-accent/15">
      {/* Full-bleed slider */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${i * 100}%)` }}
        >
          {quotes.map((q, idx) => (
            <article
              key={idx}
              className="grid w-full shrink-0 items-center gap-10 px-16 py-20 md:grid-cols-[1fr_1.4fr] md:gap-16 md:px-28 md:py-28 lg:px-36"
              aria-hidden={idx !== i}
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden rounded-[2rem] shadow-2xl shadow-primary/10 md:h-[420px]">
                <img
                  src={q.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[6s] ease-out"
                  style={{ transform: idx === i ? "scale(1.06)" : "scale(1)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
              </div>
              {/* Quote */}
              <div className="flex flex-col justify-center gap-6">
                <Quote className="h-10 w-10 text-primary/50" />
                <p className="font-quote text-2xl italic leading-[1.3] tracking-tight text-foreground md:text-[2.25rem]">
                  “{q.text}”
                </p>
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-primary/40" />
                  <p className="text-sm font-medium tracking-wide text-muted-foreground">
                    {q.author}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Left arrow — inside, edge-anchored */}
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Sebelumnya"
          className="absolute left-3 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/80 shadow-lg backdrop-blur transition hover:bg-card md:left-6 md:h-14 md:w-14"
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Berikutnya"
          className="absolute right-3 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/80 shadow-lg backdrop-blur transition hover:bg-card md:right-6 md:h-14 md:w-14"
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {quotes.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-8 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-8 py-8 text-xs text-muted-foreground md:flex-row md:px-12 lg:px-20">
        <div className="flex items-center gap-2">
          <Logo />
          <span>© {new Date().getFullYear()} Monetra</span>
        </div>
        <p>Atur uangmu lebih cerdas.</p>
      </div>
    </footer>
  );
}

