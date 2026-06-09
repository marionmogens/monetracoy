import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Wallet,
  Plus,
  TrendingDown,
  LogOut,
  Trash2,
  Bot,
  Send,
  X,
  LayoutDashboard,
  ListOrdered,
  Tags,
  Search,
  FileText,
  FileSpreadsheet,
  User as UserIcon,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Bell,
  Check,
} from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import {
  getDashboardData,
  addTransaction,
  deleteTransaction,
  addCategory,
  deleteCategory,
  updateDailyLimit,
  exportMonthlyCSV,
  exportMonthlyData,
} from "@/lib/finance.functions";
import { createWallet, adjustWallet } from "@/lib/wallets.functions";
import { listReminders, createReminder, toggleReminder, deleteReminder } from "@/lib/reminders.functions";
import { chatFinance } from "@/lib/chat.functions";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { updateProfile } from "@/lib/profile.functions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Monetra" }] }),
  component: Dashboard,
});

const rupiah = (n: number) =>
  "Rp " + Math.round(n).toLocaleString("id-ID");

const today = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const { user } = Route.useRouteContext() as { user: { email?: string; user_metadata?: { name?: string } } };
  const router = useRouter();
  const navigate = useNavigate();
  const fetchData = useServerFn(getDashboardData);

  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchData(),
  });

  const qc = useQueryClient();
  const data = dash.data;
  const fallbackEmail = user?.email || "";
  const fallbackName = user?.user_metadata?.name || fallbackEmail.split("@")[0] || "User";
  useEffect(() => {
    const h = () => qc.invalidateQueries({ queryKey: ["dashboard"] });
    window.addEventListener("monetra:refresh", h);
    return () => window.removeEventListener("monetra:refresh", h);
  }, [qc]);

  const [showAdd, setShowAdd] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [view, setView] = useState<"overview" | "transactions" | "wallets" | "categories" | "calendar" | "ai">("overview");
  const [txSearch, setTxSearch] = useState("");
  const [txType, setTxType] = useState<"all" | "income" | "expense">("all");
  const [txCategory, setTxCategory] = useState<string>("all");

  async function handleLogout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  const exportCsvFn = useServerFn(exportMonthlyCSV);
  const exportPdfFn = useServerFn(exportMonthlyData);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  async function doExportCsv() {
    setExporting("csv");
    try {
      const now = new Date();
      const { csv } = await exportCsvFn({ data: { year: now.getFullYear(), month: now.getMonth() + 1 } });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monetra-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function doExportPdf() {
    setExporting("pdf");
    try {
      const now = new Date();
      const res = await exportPdfFn({ data: { year: now.getFullYear(), month: now.getMonth() + 1 } });
      const doc = new jsPDF();
      const monthName = new Date(res.period.year, res.period.month - 1, 1).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      doc.setFontSize(18);
      doc.text("Monetra — Laporan Keuangan", 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Nama: ${user.name}`, 14, 26);
      doc.text(`Periode: ${monthName}`, 14, 32);
      let inc = 0;
      let exp = 0;
      for (const t of res.transactions) {
        if (t.type === "income") inc += t.amount;
        else exp += t.amount;
      }
      const fmt = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
      doc.text(`Pemasukan: ${fmt(inc)}    Pengeluaran: ${fmt(exp)}    Saldo: ${fmt(inc - exp)}`, 14, 38);
      autoTable(doc, {
        startY: 44,
        head: [["Tanggal", "Tipe", "Kategori", "Jumlah", "Catatan"]],
        body: res.transactions.map((t) => [
          t.date,
          t.type === "income" ? "Pemasukan" : "Pengeluaran",
          t.category,
          fmt(t.amount),
          t.note,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
      });
      doc.save(`monetra-${res.period.year}-${String(res.period.month).padStart(2, "0")}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const todayStr = today();
    let income = 0,
      expense = 0,
      todaySpend = 0;
    const byCat: Record<string, { name: string; color: string; value: number }> = {};
    const byDay: Record<string, { income: number; expense: number }> = {};
    for (const t of data.transactions) {
      if (!t.occurredAt.startsWith(ym)) continue;
      if (t.type === "income") income += t.amount;
      else {
        expense += t.amount;
        const key = t.categoryId || "none";
        byCat[key] = byCat[key] || { name: t.categoryName, color: t.categoryColor, value: 0 };
        byCat[key].value += t.amount;
      }
      if (t.occurredAt === todayStr && t.type === "expense") todaySpend += t.amount;
      byDay[t.occurredAt] = byDay[t.occurredAt] || { income: 0, expense: 0 };
      byDay[t.occurredAt][t.type] += t.amount;
    }
    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const k = d.toISOString().slice(0, 10);
      return {
        day: d.toLocaleDateString("id-ID", { weekday: "short" }),
        Pemasukan: byDay[k]?.income || 0,
        Pengeluaran: byDay[k]?.expense || 0,
      };
    });
    const walletTotal = (data.wallets || []).reduce((s, w) => s + w.balance, 0);
    return {
      income,
      expense,
      walletTotal,
      balance: income - expense - walletTotal,
      todaySpend,
      catData: Object.values(byCat),
      dailyData: last7,
    };
  }, [data]);


  const navItems = [
    { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { id: "transactions", label: "Transaksi", icon: ListOrdered },
    { id: "wallets", label: "Dompet", icon: Wallet },
    { id: "categories", label: "Kategori", icon: Tags },
    { id: "calendar", label: "Kalender", icon: CalendarIcon },
    { id: "ai", label: "Monetra AI", icon: Bot },
  ] as const;


  const filteredTx = useMemo(() => {
    if (!data) return [];
    const q = txSearch.trim().toLowerCase();
    return data.transactions.filter((t) => {
      if (txType !== "all" && t.type !== txType) return false;
      if (txCategory !== "all" && (t.categoryId || "none") !== txCategory) return false;
      if (q) {
        const hay = (t.note + " " + t.categoryName).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, txSearch, txType, txCategory]);

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-background md:p-4">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
          <Logo size={32} />
          <span className="font-semibold tracking-tight">Monetra</span>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <div className="my-3 border-t border-border" />
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ekspor</p>
          <button
            onClick={doExportPdf}
            disabled={exporting !== null}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "Mengekspor…" : "Ekspor PDF"}
          </button>
          <button
            onClick={doExportCsv}
            disabled={exporting !== null}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "csv" ? "Mengekspor…" : "Ekspor Excel/CSV"}
          </button>
        </nav>
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 rounded-xl p-2 transition hover:bg-muted">
            <button
              onClick={() => setShowProfile(true)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <Avatar name={user.name} url={data?.user?.avatarUrl ?? null} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </button>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>

      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={28} />
              <span className="text-sm font-semibold">Monetra</span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle className="!h-8 !w-8" />
              <button
                onClick={() => setShowProfile(true)}
                className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Profil"
              >
                <Avatar name={user.name} url={data?.user?.avatarUrl ?? null} size={28} />
              </button>
              <button onClick={handleLogout} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Keluar">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                </button>
              );
            })}
            <button
              onClick={doExportPdf}
              disabled={exporting !== null}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              onClick={doExportCsv}
              disabled={exporting !== null}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {!data && <p className="text-muted-foreground">Memuat…</p>}

          {data && stats && view === "overview" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Hai, {user.name} 👋</h1>
                <p className="mt-1 text-sm text-muted-foreground">Ringkasan keuanganmu bulan ini.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Total Saldo" value={rupiah(stats.balance)} accent="primary" icon={<Wallet className="h-4 w-4" />} />
                <StatCard label="Pengeluaran" value={rupiah(stats.expense)} accent="destructive" icon={<TrendingDown className="h-4 w-4" />} />
                <DailyWalletCard limit={data.user.dailyLimit} spent={stats.todaySpend} onEdit={() => setShowLimit(true)} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAdd(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Transaksi baru
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-5">
                <div className="rounded-3xl border border-border bg-card p-6 lg:col-span-3">
                  <h3 className="text-sm font-semibold tracking-tight">Tren 7 hari terakhir</h3>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dailyData}>
                        <XAxis dataKey="day" fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                        <YAxis fontSize={11} stroke="currentColor" className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                          formatter={(v: number) => rupiah(v)}
                        />
                        <Bar dataKey="Pemasukan" fill="var(--success)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Pengeluaran" fill="var(--primary)" radius={[6, 6, 0, 0]} />

                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
                  <h3 className="text-sm font-semibold tracking-tight">Pengeluaran per Kategori</h3>
                  {stats.catData.length === 0 ? (
                    <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada data bulan ini</p>
                  ) : (
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.catData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                            {stats.catData.map((c, i) => (
                              <Cell key={i} fill={c.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                            formatter={(v: number) => rupiah(v)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-tight">Transaksi Terakhir</h3>
                  <button onClick={() => setView("transactions")} className="text-xs font-medium text-primary hover:underline">
                    Lihat semua
                  </button>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {data.transactions.slice(0, 6).map((t) => (
                    <TxRow key={t.id} t={t} />
                  ))}
                  {data.transactions.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">Belum ada transaksi. Mulai dengan menambahkan satu.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {data && view === "transactions" && (
            <>
              <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Transaksi</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Menampilkan {filteredTx.length} dari {data.transactions.length} transaksi
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" /> Tambah
                  </button>
                </div>
              </div>

              <div className="mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Cari catatan atau kategori…"
                    className={inputCls + " pl-9"}
                  />
                </div>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Semua tipe</option>
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </select>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Semua kategori</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="none">Tanpa kategori</option>
                </select>
                {(txSearch || txType !== "all" || txCategory !== "all") && (
                  <button
                    onClick={() => {
                      setTxSearch("");
                      setTxType("all");
                      setTxCategory("all");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" /> Reset
                  </button>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="divide-y divide-border">
                  {filteredTx.map((t) => (
                    <TxRow key={t.id} t={t} />
                  ))}
                  {filteredTx.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {data.transactions.length === 0
                        ? "Belum ada transaksi."
                        : "Tidak ada transaksi yang cocok dengan filter."}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {data && view === "wallets" && <WalletsView wallets={data.wallets} categories={data.categories} />}

          {data && view === "categories" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Kategori</h1>
                <p className="mt-1 text-sm text-muted-foreground">Kelola kategori pemasukan & pengeluaran.</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <CategoriesInline categories={data.categories} />
              </div>
            </>
          )}

          {view === "calendar" && <CalendarView />}



          {view === "ai" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Monetra AI</h1>
                <p className="mt-1 text-sm text-muted-foreground">Tanya apa saja seputar keuanganmu — AI sudah tahu ringkasan bulan ini.</p>
              </div>
              <ChatInline />
            </>
          )}
        </main>
      </div>

      {showAdd && data && <AddTxModal categories={data.categories} wallets={data.wallets} onClose={() => setShowAdd(false)} />}

      {showCat && data && <CategoryModal categories={data.categories} onClose={() => setShowCat(false)} />}
      {showLimit && data && <LimitModal current={data.user.dailyLimit} onClose={() => setShowLimit(false)} />}
      {showProfile && data && (
        <ProfileModal
          name={data.user.name}
          email={data.user.email}
          avatarUrl={data.user.avatarUrl}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}


function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: "primary" | "success" | "destructive";
  icon: React.ReactNode;
}) {
  const bg =
    accent === "success"
      ? "bg-success/10 text-success"
      : accent === "destructive"
      ? "bg-destructive/10 text-destructive"
      : "bg-primary-soft text-primary";
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`grid h-7 w-7 place-items-center rounded-full ${bg}`}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function DailyWalletCard({ limit, spent, onEdit }: { limit: number; spent: number; onEdit: () => void }) {
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const over = limit > 0 && spent > limit;
  return (
    <button
      onClick={onEdit}
      className="rounded-3xl border border-border bg-card p-5 text-left transition hover:border-primary/40"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Dompet Harian</p>
        <span className={`text-xs font-medium ${over ? "text-destructive" : "text-muted-foreground"}`}>
          {limit > 0 ? `${pct.toFixed(0)}%` : "Atur"}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{rupiah(spent)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        dari {limit > 0 ? rupiah(limit) : "limit belum diatur"}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${over ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}

function TxRow({ t }: { t: any }) {
  const del = useServerFn(deleteTransaction);
  const fetchData = useServerFn(getDashboardData);
  async function onDelete() {
    if (!confirm("Hapus transaksi ini?")) return;
    await del({ data: { id: t.id } });
    // refetch via window event - use queryClient invalidate
    window.dispatchEvent(new Event("monetra:refresh"));
    await fetchData(); // warmup; the query will refetch via invalidation below
  }
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-9 w-9 shrink-0 rounded-full"
          style={{ backgroundColor: t.categoryColor + "33", color: t.categoryColor }}
        >
          <div className="grid h-full w-full place-items-center text-xs font-semibold">
            {t.categoryName?.slice(0, 1) || "?"}
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{t.note || t.categoryName}</p>
          <p className="text-xs text-muted-foreground">
            {t.categoryName} · {new Date(t.occurredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${t.type === "income" ? "text-success" : "text-destructive"}`}>
          {t.type === "income" ? "+" : "-"} {rupiah(t.amount)}
        </span>
        <button onClick={onDelete} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}


function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition";

function AddTxModal({
  categories,
  wallets,
  onClose,
}: {
  categories: Array<{ id: string; name: string; type: "income" | "expense"; color: string }>;
  wallets: Array<{ id: string; name: string; balance: number; categoryId: string | null }>;
  onClose: () => void;
}) {
  const add = useServerFn(addTransaction);
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const filteredCats = categories.filter((c) => c.type === type);
  // Auto-resolve wallet from selected category (expense only)
  const autoWallet =
    type === "expense" && categoryId
      ? wallets.find((w) => w.categoryId === categoryId) || null
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await add({
        data: {
          type,
          amount: Number(amount),
          categoryId: categoryId || null,
          walletId: autoWallet?.id || null,
          note,
          occurredAt: date,
        },
      });
      await router.invalidate();
      window.dispatchEvent(new Event("monetra:refresh"));
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Gagal menambah");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Transaksi baru" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategoryId("");
              }}
              className={`rounded-lg py-1.5 text-sm font-medium transition ${
                type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>

        {/* Amount + date */}
        <div className="grid grid-cols-[1fr_140px] gap-2">
          <input
            required
            autoFocus
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Jumlah (Rp)"
            className={inputCls}
          />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>

        {/* Category chips — drives wallet automatically */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Kategori</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                categoryId === ""
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              Tanpa kategori
            </button>
            {filteredCats.map((c) => {
              const hasWallet = type === "expense" && wallets.some((w) => w.categoryId === c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    categoryId === c.id
                      ? "border-primary bg-primary-soft text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                  {hasWallet && <Wallet className="h-3 w-3 opacity-60" />}
                </button>
              );
            })}
          </div>
        </div>




        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan (opsional)"
          className={inputCls}
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Modal>
  );
}


function CategoryModal({ categories, onClose }: { categories: any[]; onClose: () => void }) {
  const add = useServerFn(addCategory);
  const del = useServerFn(deleteCategory);
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState("#6366f1");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await add({ data: { name, type, color } });
    setName("");
    await router.invalidate();
    window.dispatchEvent(new Event("monetra:refresh"));
  }
  async function remove(id: string) {
    if (!confirm("Hapus kategori?")) return;
    await del({ data: { id } });
    await router.invalidate();
    window.dispatchEvent(new Event("monetra:refresh"));
  }
  return (
    <Modal title="Kategori" onClose={onClose}>
      <form onSubmit={submit} className="flex gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama kategori"
          className={inputCls}
        />
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="rounded-xl border border-input bg-background px-2 text-sm">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded-xl border border-input" />
        <button className="rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full" style={{ background: c.color }} />
              <span className="text-sm">{c.name}</span>
              <span className="text-xs text-muted-foreground">({c.type})</span>
            </div>
            <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function LimitModal({ current, onClose }: { current: number; onClose: () => void }) {
  const upd = useServerFn(updateDailyLimit);
  const router = useRouter();
  const [v, setV] = useState(String(current || ""));
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await upd({ data: { amount: Number(v) || 0 } });
    await router.invalidate();
    window.dispatchEvent(new Event("monetra:refresh"));
    setLoading(false);
    onClose();
  }
  return (
    <Modal title="Atur limit harian" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Tetapkan batas pengeluaran harian. Monetra akan memperingatkan kalau melebihi.
        </p>
        <input
          type="number"
          min="0"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Contoh: 100000"
          className={inputCls}
        />
        <button disabled={loading} className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          Simpan
        </button>
      </form>
    </Modal>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const send = useServerFn(chatFinance);
  const [msgs, setMsgs] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Halo! Saya Monetra AI 🤖 Mau saran soal apa hari ini? Coba tanya: 'Bagaimana cara menghemat pengeluaran makanan?'" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: "user" as const, content: input };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await send({ data: { messages: next } });
      setMsgs([...next, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMsgs([...next, { role: "assistant", content: "⚠ " + (e?.message || "Gagal") }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full flex-col rounded-t-3xl border border-border bg-card sm:h-[640px] sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Monetra AI</p>
              <p className="text-xs text-muted-foreground">Asisten finansial</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">Mengetik…</div>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya soal keuanganmu…"
            className={inputCls}
          />
          <button
            disabled={loading || !input.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function CategoriesInline({ categories }: { categories: any[] }) {
  const add = useServerFn(addCategory);
  const del = useServerFn(deleteCategory);
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState("#6366f1");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await add({ data: { name, type, color } });
    setName("");
    await router.invalidate();
    window.dispatchEvent(new Event("monetra:refresh"));
  }
  async function remove(id: string) {
    if (!confirm("Hapus kategori?")) return;
    await del({ data: { id } });
    await router.invalidate();
    window.dispatchEvent(new Event("monetra:refresh"));
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama kategori"
          className={inputCls + " flex-1 min-w-[160px]"}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-12 rounded-xl border border-input"
        />
        <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Tambah
        </button>
      </form>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full" style={{ background: c.color }} />
              <span className="text-sm font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">
                {c.type === "income" ? "Pemasukan" : "Pengeluaran"}
              </span>
            </div>
            <button
              onClick={() => remove(c.id)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
        )}
      </div>
    </div>
  );
}

function ChatInline() {
  const send = useServerFn(chatFinance);
  const [msgs, setMsgs] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "Halo! Saya Monetra AI 🤖 Mau saran soal apa hari ini? Coba tanya: 'Bagaimana cara menghemat pengeluaran makanan?'",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: "user" as const, content: input };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await send({ data: { messages: next } });
      setMsgs([...next, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMsgs([...next, { role: "assistant", content: "⚠ " + (e?.message || "Gagal") }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Monetra AI</p>
          <p className="text-xs text-muted-foreground">Asisten finansial pribadi</p>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              Mengetik…
            </div>
          </div>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya soal keuanganmu…"
          className={inputCls}
        />
        <button
          disabled={loading || !input.trim()}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Kirim
        </button>
      </form>
    </div>
  );
}


function WalletsView({
  wallets,
  categories,
}: {
  wallets: Array<{ id: string; name: string; balance: number; color: string; categoryId: string | null }>;
  categories: Array<{ id: string; name: string; type: "income" | "expense"; color: string }>;
}) {
  const create = useServerFn(createWallet);
  const adjust = useServerFn(adjustWallet);
  const del = useServerFn(deleteWallet);
  const router = useRouter();
  const usedCatIds = new Set(wallets.map((w) => w.categoryId).filter(Boolean) as string[]);
  const availableCats = categories.filter((c) => c.type === "expense");

  const [categoryId, setCategoryId] = useState<string>("");
  const [initial, setInitial] = useState("");
  const [err, setErr] = useState("");

  async function refresh() {
    await router.invalidate();
    window.dispatchEvent(new Event("monetra:refresh"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) {
      setErr("Pilih kategori untuk dompet baru");
      return;
    }
    try {
      await create({
        data: {
          name: cat.name,
          initialBalance: Number(initial) || 0,
          categoryId: cat.id,
          color: cat.color,
        },
      });
      setCategoryId("");
      setInitial("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Gagal");
    }
  }

  async function topup(id: string) {
    const v = prompt("Top up jumlah (Rp):");
    if (!v) return;
    const amount = Number(v);
    if (!amount) return;
    await adjust({ data: { id, amount } });
    await refresh();
  }
  async function spend(id: string) {
    const v = prompt("Pengeluaran dari dompet (Rp):");
    if (!v) return;
    const amount = Number(v);
    if (!amount) return;
    try {
      await adjust({ data: { id, amount: -Math.abs(amount) } });
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Gagal");
    }
  }
  async function remove(id: string) {
    if (!confirm("Hapus dompet ini?")) return;
    await del({ data: { id } });
    await refresh();
  }

  const total = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dompet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Total dialokasikan:{" "}
          <span className="font-medium text-foreground">Rp {Math.round(total).toLocaleString("id-ID")}</span>
        </p>
      </div>

      <form onSubmit={submit} className="mb-6 rounded-3xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold tracking-tight">Buat dompet baru</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Dompet dibuat dari kategori. Untuk menambah pilihan, buat kategori baru di tab Kategori.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls}
          >
            <option value="">
              {availableCats.length === 0 ? "Tidak ada kategori tersisa — buat di tab Kategori" : "Pilih kategori…"}
            </option>
            {availableCats.map((c) => {
              const used = usedCatIds.has(c.id);
              return (
                <option key={c.id} value={c.id} disabled={used}>
                  {c.name}{used ? " (sudah ada dompet)" : ""}
                </option>
              );
            })}
          </select>
          <input
            type="number"
            min="0"
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
            placeholder="Saldo awal (Rp)"
            className={inputCls}
          />
          <button
            disabled={availableCats.length === 0}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Buat
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      </form>





      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => (
          <div key={w.id} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full" style={{ background: w.color + "33", color: w.color }}>
                  <div className="grid h-full w-full place-items-center text-xs font-semibold">{w.name.slice(0, 1)}</div>
                </div>
                <p className="font-medium">{w.name}</p>
              </div>
              <button onClick={() => remove(w.id)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">Rp {Math.round(w.balance).toLocaleString("id-ID")}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => topup(w.id)}
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                + Top up
              </button>
              <button
                onClick={() => spend(w.id)}
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                − Pakai
              </button>
            </div>
          </div>
        ))}
        {wallets.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground">
            Belum ada dompet. Buat dompet pertamamu di atas.
          </p>
        )}
      </div>
    </>
  );
}

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  const initial = (name || "?").trim().slice(0, 1).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="shrink-0 grid place-items-center rounded-full bg-primary-soft text-primary font-semibold"
    >
      {initial}
    </div>
  );
}

function ProfileModal({
  name,
  email,
  avatarUrl,
  onClose,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  onClose: () => void;
}) {
  const upd = useServerFn(updateProfile);
  const router = useRouter();
  const [n, setN] = useState(name);
  const [url, setUrl] = useState<string | null>(avatarUrl);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_200_000) {
      setErr("Gambar terlalu besar (maks 1.2MB)");
      return;
    }
    setErr("");
    // compress to ~256px jpeg dataURL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = new Image();
    img.onload = () => {
      const max = 256;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      setUrl(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      await upd({ data: { name: n.trim(), avatarUrl: url } });
      await router.invalidate();
      window.dispatchEvent(new Event("monetra:refresh"));
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Profil" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={n} url={url} size={64} />
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
              <UserIcon className="h-3.5 w-3.5" /> Ganti foto
              <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </label>
            {url && (
              <button
                type="button"
                onClick={() => setUrl(null)}
                className="block text-xs text-muted-foreground hover:text-destructive"
              >
                Hapus foto
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama</label>
          <input value={n} onChange={(e) => setN(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
          <input value={email} disabled className={inputCls + " opacity-60"} />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Modal>
  );
}

function CalendarView() {
  const list = useServerFn(listReminders);
  const create = useServerFn(createReminder);
  const toggle = useServerFn(toggleReminder);
  const del = useServerFn(deleteReminder);

  const { data: reminders, refetch } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => list(),
  });

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string>(today.toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // make Monday=0
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: Array<{ dateStr: string | null; day: number | null }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ dateStr: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ dateStr, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ dateStr: null, day: null });

  const byDate: Record<string, Array<{ id: string; title: string; done: boolean; amount: number | null }>> = {};
  for (const r of reminders || []) {
    (byDate[r.dueDate] = byDate[r.dueDate] || []).push({
      id: r.id,
      title: r.title,
      done: r.done,
      amount: r.amount,
    });
  }
  const selectedItems = (reminders || []).filter((r) => r.dueDate === selected);

  function prev() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
  }
  function next() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setErr("");
    setSaving(true);
    try {
      await create({
        data: {
          title: title.trim(),
          note: note.trim() || null,
          amount: amount ? Number(amount) : null,
          dueDate: selected,
        },
      });
      setTitle("");
      setNote("");
      setAmount("");
      await refetch();
    } catch (e: any) {
      setErr(e?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(id: string, done: boolean) {
    await toggle({ data: { id, done } });
    await refetch();
  }
  async function onDelete(id: string) {
    if (!confirm("Hapus pengingat ini?")) return;
    await del({ data: { id } });
    await refetch();
  }

  const upcoming = (reminders || [])
    .filter((r) => !r.done && r.dueDate >= today.toISOString().slice(0, 10))
    .slice(0, 5);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kalender & Pengingat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tandai tanggal bayar tagihan, cicilan, atau target lain.
          </p>
        </div>
        {upcoming.length > 0 && (
          <div className="hidden md:flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-medium text-foreground">
            <Bell className="h-3.5 w-3.5 text-accent-foreground" />
            {upcoming.length} pengingat mendatang
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Calendar */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold capitalize tracking-tight">{monthName}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prev}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const n = new Date();
                  setCursor({ year: n.getFullYear(), month: n.getMonth() });
                  setSelected(n.toISOString().slice(0, 10));
                }}
                className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted"
              >
                Hari ini
              </button>
              <button
                onClick={next}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c.dateStr) return <div key={i} className="aspect-square" />;
              const items = byDate[c.dateStr] || [];
              const isSelected = c.dateStr === selected;
              const isToday = c.dateStr === today.toISOString().slice(0, 10);
              const allDone = items.length > 0 && items.every((x) => x.done);
              return (
                <button
                  key={c.dateStr}
                  onClick={() => setSelected(c.dateStr!)}
                  className={`group relative flex aspect-square flex-col items-center justify-start gap-1 rounded-xl border p-1.5 text-xs transition ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/40 hover:bg-muted/60"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                      isToday ? "bg-primary text-primary-foreground font-semibold" : ""
                    }`}
                  >
                    {c.day}
                  </span>
                  {items.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-0.5">
                      {items.slice(0, 3).map((it) => (
                        <span
                          key={it.id}
                          className={`block h-1.5 w-1.5 rounded-full ${
                            it.done ? "bg-success/70" : "bg-accent"
                          }`}
                        />
                      ))}
                      {items.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{items.length - 3}</span>
                      )}
                    </div>
                  )}
                  {allDone && (
                    <span className="absolute right-1 top-1 text-success">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              Tambah pengingat untuk{" "}
              <span className="text-primary">
                {new Date(selected).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </h3>
            <form onSubmit={submit} className="mt-3 space-y-2">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul (cth: Bayar listrik)"
                className={inputCls}
              />
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Nominal (opsional)"
                className={inputCls}
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan (opsional)"
                rows={2}
                className={inputCls + " resize-none"}
              />
              {err && <p className="text-xs text-destructive">{err}</p>}
              <button
                disabled={saving}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan pengingat"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              Pengingat tanggal ini
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({selectedItems.length})
              </span>
            </h3>
            <div className="mt-3 space-y-2">
              {selectedItems.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada pengingat di tanggal ini.</p>
              )}
              {selectedItems.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-2 rounded-xl border border-border bg-background p-3"
                >
                  <button
                    onClick={() => onToggle(r.id, !r.done)}
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                      r.done
                        ? "border-success bg-success text-success-foreground"
                        : "border-border hover:border-primary"
                    }`}
                    aria-label="Tandai selesai"
                  >
                    {r.done && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        r.done ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {r.title}
                    </p>
                    {r.amount != null && (
                      <p className="text-xs text-muted-foreground">
                        Rp {Math.round(r.amount).toLocaleString("id-ID")}
                      </p>
                    )}
                    {r.note && <p className="mt-0.5 text-xs text-muted-foreground">{r.note}</p>}
                  </div>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {upcoming.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold tracking-tight">Mendatang</h3>
              <ul className="mt-3 space-y-2">
                {upcoming.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="flex-1 truncate">{r.title}</span>
                    <span className="text-muted-foreground">
                      {new Date(r.dueDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
