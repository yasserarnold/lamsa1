import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/AdminShell";
import { ListSkeleton } from "@/components/ui-ext/ListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSecurityStatus, listSecurityEvents } from "@/lib/security.functions";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ShieldCheck, Activity } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { makeRouteError, makeRouteNotFound } from "@/components/route-boundaries";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/security")({
  component: SecurityPage,
  errorComponent: makeRouteError("admin.security"),
  notFoundComponent: makeRouteNotFound(),
});

function statusIcon(s: "pass" | "warn" | "fail") {
  if (s === "pass") return <CheckCircle2 className="size-5 text-emerald-500" />;
  if (s === "warn") return <AlertTriangle className="size-5 text-amber-500" />;
  return <XCircle className="size-5 text-destructive" />;
}

function severityBadge(sev: string) {
  const variant =
    sev === "critical" ? "destructive" : sev === "warn" ? "secondary" : "outline";
  return <Badge variant={variant as never}>{sev}</Badge>;
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card-elevated overflow-hidden rounded-3xl p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SecurityPage() {
  const { t, locale } = useLanguage();
  const statusFn = useServerFn(getSecurityStatus);
  const eventsFn = useServerFn(listSecurityEvents);

  const statusQ = useQuery({
    queryKey: ["admin", "security", "status"],
    queryFn: () => statusFn(),
    refetchInterval: 60_000,
  });

  const eventsQ = useQuery({
    queryKey: ["admin", "security", "events"],
    queryFn: () => eventsFn({ data: { limit: 100 } }),
    refetchInterval: 30_000,
  });

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <Section
          title={t("admin.security.statusTitle")}
          description={t("admin.security.statusDesc")}
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                statusQ.refetch();
                eventsQ.refetch();
              }}
            >
              <RefreshCw className="size-4" />
              {t("admin.security.refresh")}
            </Button>
          }
        >
          {statusQ.isLoading ? (
            <ListSkeleton rows={4} />
          ) : statusQ.data ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Activity className="size-3.5" /> {t("admin.security.events24h")}
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold">
                    {statusQ.data.metrics.events24h}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="size-3.5" /> {t("admin.security.critical24h")}
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold text-destructive">
                    {statusQ.data.metrics.critical24h}
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
                {statusQ.data.checks.map((c) => (
                  <li key={c.key} className="flex items-start gap-3 p-4">
                    {statusIcon(c.status)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.label}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {t("admin.security.lastUpdate").replace("{time}", relativeTime(statusQ.data.generatedAt))}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("admin.security.statusLoadFail")}</p>
          )}
        </Section>

        <Section
          title={t("admin.security.eventsTitle")}
          description={t("admin.security.eventsDesc")}
        >
          {eventsQ.isLoading ? (
            <ListSkeleton rows={5} />
          ) : eventsQ.data && eventsQ.data.events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="text-start">
                    <th className="py-2 pe-3 text-start">{t("admin.security.col.time")}</th>
                    <th className="py-2 pe-3 text-start">{t("admin.security.col.severity")}</th>
                    <th className="py-2 pe-3 text-start">{t("admin.security.col.category")}</th>
                    <th className="py-2 pe-3 text-start">{t("admin.security.col.event")}</th>
                    <th className="py-2 pe-3 text-start">{t("admin.security.col.user")}</th>
                    <th className="py-2 pe-3 text-start">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {eventsQ.data.events.map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="py-2 pe-3 text-xs text-muted-foreground">
                        {relativeTime(e.created_at)}
                      </td>
                      <td className="py-2 pe-3">{severityBadge(e.severity)}</td>
                      <td className="py-2 pe-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.category}</code>
                      </td>
                      <td className="py-2 pe-3">{e.action}</td>
                      <td className="py-2 pe-3 text-xs text-muted-foreground">
                        {e.actor_id ? String(e.actor_id).slice(0, 8) : "—"}
                      </td>
                      <td className="py-2 pe-3 text-xs text-muted-foreground">{e.ip ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("admin.security.eventsEmpty")}
            </p>
          )}
        </Section>

        <Section
          title={t("admin.security.testsTitle")}
          description={t("admin.security.testsDesc")}
        >
          <ul className="grid gap-2 text-sm">
            <li>
              <a className="text-primary hover:underline" href="/admin/actions">
                {t("admin.security.linkActions")}
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="/admin/scanner">
                {t("admin.security.linkScanner")}
              </a>
            </li>
            <li className="text-xs text-muted-foreground">
              {t("admin.security.linkAuto")} <code>bunx vitest run src/lib/security.integration.test.ts</code>
            </li>
          </ul>
        </Section>
      </div>
    </AdminShell>
  );
}