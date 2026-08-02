import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User2, Link2, CreditCard, Users, History, Languages, ShieldCheck, Sparkles } from "lucide-react";
import lamsaLogo from "@/assets/lamsa-logo.png";
import type { ReactNode } from "react";
import { useLanguage, type TKey } from "@/lib/i18n";

const tabs: ReadonlyArray<{ to: string; labelKey: TKey; icon: typeof User2 }> = [
  { to: "/dashboard", labelKey: "nav.profile", icon: User2 },
  { to: "/dashboard/quick-links", labelKey: "nav.quickLinks", icon: Sparkles },
  { to: "/dashboard/links", labelKey: "nav.links", icon: Link2 },
  { to: "/dashboard/cards", labelKey: "nav.cards", icon: CreditCard },
  { to: "/dashboard/events", labelKey: "nav.events", icon: History },
  { to: "/dashboard/leads", labelKey: "nav.leads", icon: Users },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t, toggle, lang } = useLanguage();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const activeTab = tabs.find((tab) => tab.to === pathname) ?? tabs[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 px-4 py-4 lg:px-6">
        {/* Sidebar */}
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col overflow-hidden rounded-3xl bg-sidebar text-sidebar-foreground lg:flex">
          <div className="border-b border-sidebar-border p-5">
            <Link to="/" className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[var(--gold)] shadow-lg shadow-[oklch(0.78_0.13_82/0.25)]">
                <img src={lamsaLogo} alt={lang === "ar" ? "لمسة" : "Lamsa"} width={28} height={28} className="size-7 object-contain" />
              </div>
              <div>
                <p className="font-brand text-2xl tracking-tight">{t("pub.brand.name")}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold-soft)]">Premium NFC</p>
              </div>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {tabs.map((tab) => {
              const active = pathname === tab.to;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-2 end-0 w-[3px] rounded-s bg-[var(--gold)]" />
                  )}
                  <Icon className={`size-4 ${active ? "text-[var(--gold)]" : ""}`} />
                  <span>{t(tab.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-sidebar-foreground/60 transition hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <ShieldCheck className="size-4" />
              {t("pub.shell.adminPanel")}
            </Link>
            <button
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-sidebar-foreground/60 transition hover:bg-destructive/20 hover:text-destructive-foreground"
            >
              <LogOut className="size-4" />
              {t("action.signout")}
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 lg:hidden">
                <img src={lamsaLogo} alt={lang === "ar" ? "لمسة" : "Lamsa"} width={22} height={22} className="size-5 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                  Dashboard
                </p>
                <h1 className="truncate font-display text-lg font-bold text-foreground">
                  {t(activeTab.labelKey)}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggle}
                className="gap-1.5"
                aria-label="toggle language"
              >
                <Languages className="size-4" />
                <span className="text-xs font-semibold uppercase">{lang === "ar" ? "EN" : "ع"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 lg:hidden"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </header>

          {/* Mobile tab bar */}
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:hidden">
            {tabs.map((tab) => {
              const active = pathname === tab.to;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                    active
                      ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-[var(--gold-soft)]"
                      : "border-border/60 bg-card/40 text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t(tab.labelKey)}
                </Link>
              );
            })}
          </nav>

          <main className="flex-1 pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}