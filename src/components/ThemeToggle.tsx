import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    localStorage.setItem("monetra-theme", theme);
  } catch {}
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved =
      (typeof localStorage !== "undefined" &&
        (localStorage.getItem("monetra-theme") as "light" | "dark" | null)) ||
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle tema"
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground hover:bg-muted " +
        className
      }
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
