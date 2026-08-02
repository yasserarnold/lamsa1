import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useLanguage } from "@/lib/i18n";
import { amIAdmin, listAdminActionsPaged } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Download, ChevronLeft, ChevronRight, ScrollText, Filter } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";

export const Route = createFileRoute("/_authenticated/admin/actions")({
  head: () => ({
    meta: [
      { title: "لوحة المسؤول — سجل الإجراءات" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminActionsPage,
});

const ACTION_LABEL_KEYS: Record<string, string> = {
  user_banned: "admin.actions.label.userBanned",
  user_unbanned: "admin.actions.label.userUnbanned",
  role_granted: "admin.actions.label.roleGranted",
  role_revoked: "admin.actions.label.roleRevoked",
  card_scan_import: "admin.actions.label.cardScanImport",
  card_scan_lookup: "admin.actions.label.cardScanLookup",
} as const;

function fmt(d: string | null, locale: string) {
  return d ? new Date(d).toLocaleString(locale) : "—";
}

function AdminActionsPage() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const listFn = useServerFn(listAdminActionsPaged);

  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;
  useEffect(() => {
    if (adminQuery.data && !adminQuery.data.isAdmin) {
      toast.error(t("admin.common.adminOnly"));
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminQuery.data, navigate]);

  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");
  const [period, setPeriod] = useState<"all" | "24h" | "7d" | "30d" | "90d">("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { from, to } = useMemo(() => {
    if (period === "all") return { from: undefined as string | undefined, to: undefined as string | undefined };
    const now = new Date();
    const dMs = period === "24h" ? 864e5 : period === "7d" ? 7 * 864e5 : period === "30d" ? 30 * 864e5 : 90 * 864e5;
    return { from: new Date(now.getTime() - dMs).toISOString(), to: now.toISOString() };
  }, [period]);

  const query = useQuery({
    queryKey: qk.admin.actions({ q, action, period, page }),
    queryFn: () => listFn({ data: { q: q || undefined, action, from, to, page, pageSize } }),
    enabled: isAdmin,
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function exportCsv() {
    try {
      const res = await listFn({ data: { q: q || undefined, action, from, to, page: 1, pageSize: 1000 } });
      const list = res.rows ?? [];
      const header = ["created_at", "action", "actor_username", "actor_full_name", "target_type", "target_id", "metadata"];
      const body = list.map((r: any) => [
        r.created_at,
        r.action,
        r.actor_username ?? "",
        r.actor_full_name ?? "",
        r.target_type ?? "",
        r.target_id ?? "",
        r.metadata ? JSON.stringify(r.metadata) : "",
      ].map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","));
      const csv = `\uFEFF${header.join(",")}\n${body.join("\n")}\n`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-actions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("admin.actions.exportSuccess").replace("{count}", String(list.length)));
    } catch (e) {
      toastError(e, t("admin.actions.exportFail"));
    }
  }

  if (adminQuery.isPending) {
    return (
      <AdminShell>
        <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin" /></div>
      </AdminShell>
    );
  }
  if (!isAdmin) return null;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <ScrollText className="size-5 text-[var(--gold)]" />{t("admin.actions.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.actions.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{t("admin.actions.results").replace("{count}", String(total))}</CardTitle>
                <CardDescription>{t("admin.common.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder={t("admin.actions.searchPlaceholder")}
                    className="ps-9 w-56"
                  />
                </div>
                <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.actions.filter.all")}</SelectItem>
                    <SelectItem value="card_scan_lookup">{t("admin.actions.label.cardScanLookup")}</SelectItem>
                    <SelectItem value="card_scan_import">{t("admin.actions.label.cardScanImport")}</SelectItem>
                    <SelectItem value="user_banned">{t("admin.actions.label.userBanned")}</SelectItem>
                    <SelectItem value="user_unbanned">{t("admin.actions.label.userUnbanned")}</SelectItem>
                    <SelectItem value="role_granted">{t("admin.actions.label.roleGranted")}</SelectItem>
                    <SelectItem value="role_revoked">{t("admin.actions.label.roleRevoked")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={period} onValueChange={(v) => { setPeriod(v as typeof period); setPage(1); }}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.actions.filter.periodAll")}</SelectItem>
                    <SelectItem value="24h">{t("admin.actions.filter.24h")}</SelectItem>
                    <SelectItem value="7d">{t("admin.actions.filter.7d")}</SelectItem>
                    <SelectItem value="30d">{t("admin.actions.filter.30d")}</SelectItem>
                    <SelectItem value="90d">{t("admin.actions.filter.90d")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2">
                  <Download className="size-4" /> {t("admin.actions.export")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="p-3 text-start">{t("admin.actions.col.date")}</th>
                    <th className="p-3 text-start">{t("admin.actions.col.action")}</th>
                    <th className="p-3 text-start">{t("admin.actions.col.admin")}</th>
                    <th className="p-3 text-start">{t("admin.actions.col.target")}</th>
                    <th className="p-3 text-start">{t("admin.actions.col.details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isFetching && rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
                  )}
                  {rows.map((r: any) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.created_at, locale)}</td>
                      <td className="p-3">
                        <Badge variant={r.action.startsWith("card_scan") ? "secondary" : r.action.includes("banned") ? "destructive" : "default"} className="text-[10px]">
                          {ACTION_LABEL_KEYS[r.action] ? t(ACTION_LABEL_KEYS[r.action] as any) : r.action}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">
                        {r.actor_id ? (
                          <Link to="/admin/users/$userId" params={{ userId: r.actor_id }} className="hover:underline">
                            {r.actor_full_name || r.actor_username || r.actor_id.slice(0, 8)}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-xs">
                        {r.target_type === "user" && r.target_id ? (
                          <Link to="/admin/users/$userId" params={{ userId: r.target_id }} className="font-mono hover:underline" dir="ltr">
                            {r.target_id.slice(0, 8)}…
                          </Link>
                        ) : r.target_id ? (
                          <span className="font-mono" dir="ltr">{r.target_id}</span>
                        ) : (
                          <span className="text-muted-foreground">{r.target_type ?? "—"}</span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-muted-foreground max-w-md">
                        {r.metadata && Object.keys(r.metadata as object).length > 0 ? (
                          <code dir="ltr" className="break-all">{JSON.stringify(r.metadata)}</code>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                  {!query.isFetching && rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">{t("admin.actions.empty")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">{t("admin.common.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}