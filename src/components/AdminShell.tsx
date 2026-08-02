import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LayoutDashboard, Users, CreditCard, Inbox, LogOut, ArrowLeft, Nfc, Radio, ScrollText, Lock, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage, type TKey } from "@/lib/i18n";

const tabs = [
  { to: "/admin", labelKey: "admin.shell.tab.overview" as TKey, icon: LayoutDashboard, exact: true },
  { to: "/admin/users", labelKey: "admin.shell.tab.users" as TKey, icon: Users, exact: false },
  { to: "/admin/cards", labelKey: "admin.shell.tab.cards" as TKey, icon: CreditCard, exact: false },
  { to: "/admin/scanner", labelKey: "admin.shell.tab.scanner" as TKey, icon: Radio, exact: false },
  { to: "/admin/actions", labelKey: "admin.shell.tab.actions" as TKey, icon: ScrollText, exact: false },
  { to: "/admin/leads", labelKey: "admin.shell.tab.leads" as TKey, icon: Inbox, exact: false },
  { to: "/admin/security", labelKey: "admin.shell.tab.security" as TKey, icon: Lock, exact: false },
  { to: "/admin/settings", labelKey: "admin.shell.tab.settings" as TKey, icon: Settings2, exact: false },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useLanguage();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 px-4 py-4 lg:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col overflow-hidden rounded-3xl bg-sidebar text-sidebar-foreground lg:flex">
          <div className="border-b border-sidebar-border p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[var(--gold)] text-[oklch(0.16_0.03_165)] shadow-lg shadow-[oklch(0.78_0.13_82/0.25)]">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="font-display text-lg font-bold tracking-tight">{t("admin.shell.title")}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold-soft)]">Admin Console</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {tabs.map((tab) => {
              const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
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
                  {active && <span className="absolute inset-y-2 end-0 w-[3px] rounded-s bg-[var(--gold)]" />}
                  <Icon className={`size-4 ${active ? "text-[var(--gold)]" : ""}`} />
                  <span>{t(tab.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-sidebar-border p-3 space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-sidebar-foreground/60 transition hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <ArrowLeft className="size-4" />
              {t("admin.shell.backToDashboard")}
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-sidebar-foreground/60 transition hover:bg-destructive/20 hover:text-destructive-foreground"
            >
              <LogOut className="size-4" />
              {t("admin.shell.signOut")}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] lg:hidden">
                <Nfc className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--gold-soft)]">Admin</p>
                <h1 className="truncate font-display text-lg font-bold text-foreground">{t("admin.shell.title")}</h1>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-2 lg:hidden">
              <Link to="/dashboard"><ArrowLeft className="size-4" /></Link>
            </Button>
          </header>

          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:hidden">
            {tabs.map((tab) => {
              const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
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
