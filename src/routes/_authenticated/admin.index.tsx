import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useLanguage } from "@/lib/i18n";
import { amIAdmin, adminOverview } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, CreditCard, Inbox, Link2, Upload, TrendingUp, Globe } from "lucide-react";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "لوحة المسؤول — نظرة عامة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const overviewFn = useServerFn(adminOverview);

  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;

  useEffect(() => {
    if (adminQuery.data && !adminQuery.data.isAdmin) {
      toast.error(t("admin.common.adminOnly"));
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminQuery.data, navigate]);

  const overview = useQuery({
    queryKey: qk.admin.overview(),
    queryFn: () => overviewFn(),
    enabled: isAdmin,
  });

  if (adminQuery.isPending || (isAdmin && overview.isPending)) {
    return (
      <AdminShell>
        <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin" /></div>
      </AdminShell>
    );
  }
  if (!isAdmin) return null;

  const c = overview.data?.counts;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">{t("admin.overview.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.overview.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/admin/cards"><Upload className="size-4 me-2" />{t("admin.overview.importUids")}</Link></Button>
            <Button asChild size="sm"><Link to="/admin/users"><Users className="size-4 me-2" />{t("admin.overview.users")}</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label={t("admin.overview.stat.users")} value={c?.profiles ?? 0} icon={Users} hint={`${c?.published ?? 0} ${t("admin.overview.stat.usersHint")}`} />
          <StatCard label={t("admin.overview.stat.cards")} value={c?.cards ?? 0} icon={CreditCard} hint={`${c?.activeCards ?? 0} ${t("admin.overview.stat.cardsHint")}`} />
          <StatCard label={t("admin.overview.stat.leads")} value={c?.leads ?? 0} icon={Inbox} />
          <StatCard label={t("admin.overview.stat.links")} value={c?.links ?? 0} icon={Link2} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Inbox className="size-4 text-[var(--gold)]" />{t("admin.overview.recentLeads")}</CardTitle>
              <CardDescription>{t("admin.overview.recentLeadsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(overview.data?.recentLeads ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("admin.overview.noLeads")}</p>
              )}
              {(overview.data?.recentLeads ?? []).map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="truncate text-xs text-muted-foreground" dir="ltr">{l.mobile}{l.interest ? ` — ${l.interest}` : ""}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{new Date(l.created_at).toLocaleDateString(locale)}</span>
                </div>
              ))}
              <div className="pt-2">
                <Button asChild variant="ghost" size="sm" className="w-full"><Link to="/admin/leads">{t("admin.overview.viewAll")}</Link></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Globe className="size-4 text-[var(--gold)]" />{t("admin.overview.recentUsers")}</CardTitle>
              <CardDescription>{t("admin.overview.recentUsersDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(overview.data?.recentProfiles ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("admin.overview.none")}</p>
              )}
              {(overview.data?.recentProfiles ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.full_name || p.username || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">@{p.username ?? "—"}</p>
                  </div>
                  {p.is_published ? <Badge className="text-[10px]">{t("admin.overview.published")}</Badge> : <Badge variant="secondary" className="text-[10px]">{t("admin.overview.draft")}</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4 text-[var(--gold)]" />{t("admin.overview.recentCards")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="p-2 text-start">{t("admin.overview.col.uid")}</th>
                    <th className="p-2 text-start">{t("admin.overview.col.status")}</th>
                    <th className="p-2 text-start">{t("admin.overview.col.linked")}</th>
                    <th className="p-2 text-start">{t("admin.overview.col.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.data?.recentCards ?? []).map((c) => (
                    <tr key={c.id} className="border-b border-border/40">
                      <td className="p-2 font-mono text-xs" dir="ltr">{c.card_uid}</td>
                      <td className="p-2"><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge></td>
                      <td className="p-2 text-xs">{c.profile_id ? t("admin.common.yes") : t("admin.common.dash")}</td>
                      <td className="p-2 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString(locale)}</td>
                    </tr>
                  ))}
                  {(overview.data?.recentCards ?? []).length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">{t("admin.overview.noCards")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: number; icon: any; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold font-display">{value.toLocaleString(useLanguage().locale)}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
            {hint && <div className="text-[10px] text-[var(--gold-soft)] mt-0.5">{hint}</div>}
          </div>
          <div className="grid size-9 place-items-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}