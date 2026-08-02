import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import {
  amIAdmin,
  listAllCards,
  lookupCardByUid,
  listAdminActions,
  adminAssignCardToUser,
  listAllUsers,
  adminUpdateCardStatus,
  adminUnassignCard,
  adminDeleteCard,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toastError, toastNfcError } from "@/lib/errors";
import {
  Loader2, Radio, Download, Search, ChevronLeft, ChevronRight, RefreshCw, UserPlus, RotateCw,
  Power, PowerOff, Unlink, Trash2,
} from "lucide-react";
import { qk } from "@/lib/query-keys";
import { ScanResult } from "@/features/admin/scanner/ScanResult";
import { ErrorReviewPanel } from "@/features/admin/scanner/ErrorReviewPanel";
import { AuditLogList } from "@/features/admin/scanner/AuditLogList";
import { STATUS_LABEL_KEY, downloadCsv, fmtDate, normalizeUid, type AdminAction, type CardRow } from "@/features/admin/scanner/utils";
import { useLanguage } from "@/lib/i18n";

const AssignCardDialog = lazy(() => import("@/features/admin/AssignCardDialog"));

export const Route = createFileRoute("/_authenticated/admin/scanner")({
  head: () => ({
    meta: [
      { title: "لوحة المسؤول — ماسح البطاقات" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminScannerPage,
});

function AdminScannerPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const listFn = useServerFn(listAllCards);
  const lookupFn = useServerFn(lookupCardByUid);
  const actionsFn = useServerFn(listAdminActions);
  const assignFn = useServerFn(adminAssignCardToUser);
  const usersFn = useServerFn(listAllUsers);
  const updateStatusFn = useServerFn(adminUpdateCardStatus);
  const unassignFn = useServerFn(adminUnassignCard);
  const deleteFn = useServerFn(adminDeleteCard);

  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;

  useEffect(() => {
    if (adminQuery.data && !adminQuery.data.isAdmin) {
      toast.error(t("admin.common.adminOnly"));
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminQuery.data, navigate]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "disabled" | "unassigned">("all");
  const [type, setType] = useState<"all" | "official" | "unofficial">("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [autoRefresh, setAutoRefresh] = useState(true);

  const listQuery = useQuery({
    queryKey: qk.admin.cards({ q, status, type, page }),
    queryFn: () => listFn({ data: { q: q || undefined, status, type, page, pageSize } }),
    enabled: isAdmin,
    refetchInterval: autoRefresh ? 30_000 : false,
    refetchOnWindowFocus: autoRefresh,
  });

  const actionsQuery = useQuery({
    queryKey: qk.admin.scannerActions(),
    queryFn: () => actionsFn({ data: { limit: 100 } }),
    enabled: isAdmin,
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const [scanUid, setScanUid] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupFn>> | null>(null);
  const nfcSupported = typeof window !== "undefined" && "NDEFReader" in window;
  const [assignUid, setAssignUid] = useState<string | null>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: qk.admin.cards() });
    qc.invalidateQueries({ queryKey: qk.admin.scannerActions() });
  };

  const statusMut = useMutation({
    mutationFn: (args: { id: string; status: "active" | "disabled" | "unassigned" }) =>
      updateStatusFn({ data: args }),
    onSuccess: () => { toast.success(t("admin.scanner.statusUpdated")); invalidateAll(); },
    onError: (e) => toastError(e),
  });
  const unassignMut = useMutation({
    mutationFn: (id: string) => unassignFn({ data: { id } }),
    onSuccess: () => { toast.success(t("admin.scanner.unassigned")); invalidateAll(); },
    onError: (e) => toastError(e),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success(t("admin.scanner.deleted")); invalidateAll(); },
    onError: (e) => toastError(e),
  });
  const rowBusy = statusMut.isPending || unassignMut.isPending || deleteMut.isPending;

  const lookupMut = useMutation({
    mutationFn: (uid: string) => lookupFn({ data: { uid } }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: qk.admin.scannerActions() });
      qc.invalidateQueries({ queryKey: qk.admin.cards() });
      if (r.ok) toast.success(t("admin.scanner.foundSuccess"));
      else toast.error(r.message);
    },
    onError: (e) => toastError(e),
  });

  async function handleScan() {
    if (!nfcSupported) {
      toast.error(t("admin.scanner.nfcNotSupported"));
      return;
    }
    try {
      setScanning(true);
      // @ts-expect-error - NDEFReader lacks types
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.onreading = (ev: { serialNumber?: string }) => {
        const uid = normalizeUid(ev.serialNumber ?? "");
        if (uid) {
          setScanUid(uid);
          lookupMut.mutate(uid);
        }
        setScanning(false);
      };
    } catch (e) {
      toastNfcError(e, t("admin.scanner.scanFailed"));
      setScanning(false);
    }
  }

  function exportCsv() {
    const rows = (listQuery.data?.rows ?? []) as CardRow[];
    downloadCsv(
      `nfc-cards-${new Date().toISOString().slice(0, 10)}.csv`,
      ["card_uid", "status", "type", "profile_username", "profile_full_name", "activated_at", "last_written_at", "created_at"],
      rows.map((r) => [
        r.card_uid, r.status, r.is_official ? "official" : "unofficial",
        r.profile_username ?? "", r.profile_full_name ?? "",
        r.activated_at ?? "", r.last_written_at ?? "", r.created_at ?? "",
      ]),
    );
  }

  function exportAuditCsv() {
    const scans = (actionsQuery.data ?? []).filter((a: { action?: string | null }) => a.action === "card_scan_lookup");
    downloadCsv(
      `scan-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      ["created_at", "uid", "normalized", "result", "status", "is_official", "target_id"],
      scans.map((a: { metadata?: Record<string, unknown> | null; id?: string; created_at?: string | null; target_id?: string | null }) => {
        const m = (a.metadata ?? {}) as Record<string, unknown>;
        return [a.created_at, String(m.uid ?? ""), String(m.normalized ?? ""), String(m.result ?? ""), String(m.status ?? ""), String(m.is_official ?? ""), a.target_id ?? ""];
      }),
    );
  }

  if (adminQuery.isPending) {
    return (
      <AdminShell>
        <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin" /></div>
      </AdminShell>
    );
  }
  if (!isAdmin) return null;

  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = (listQuery.data?.rows ?? []) as CardRow[];
  const allScans = ((actionsQuery.data ?? []) as AdminAction[]).filter((a) => a.action === "card_scan_lookup");
  // Unique problem scans (invalid or not_found) — latest per normalized UID
  const problemMap = new Map<string, AdminAction>();
  for (const a of allScans) {
    const m = (a.metadata ?? {}) as Record<string, unknown>;
    const res = String(m.result ?? "");
    if (res !== "invalid" && res !== "not_found") continue;
    const key = String(m.normalized || m.uid || a.id);
    if (!problemMap.has(key)) problemMap.set(key, a);
  }
  const problems = Array.from(problemMap.values());

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">{t("admin.scanner.title")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("admin.scanner.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh((v) => !v)}
                className="gap-2"
                title={t("admin.scanner.autoRefreshTitle")}
              >
                <RefreshCw className={`size-4 ${autoRefresh ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
                {autoRefresh ? t("admin.scanner.autoRefreshOn") : t("admin.scanner.autoRefreshOff")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  qc.invalidateQueries({ queryKey: qk.admin.cards() });
                  qc.invalidateQueries({ queryKey: qk.admin.scannerActions() });
                }}
                className="gap-2"
              >
                <RotateCw className="size-4" /> {t("admin.scanner.refreshNow")}
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="size-4 text-[var(--gold)]" />
              {t("admin.scanner.scanTitle")}
            </CardTitle>
            <CardDescription>{t("admin.scanner.scanDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <Label htmlFor="scan-uid" className="sr-only">{t("admin.scanner.uidLabel")}</Label>
                <Input
                  id="scan-uid"
                  value={scanUid}
                  onChange={(e) => setScanUid(e.target.value)}
                  placeholder={t("admin.scanner.uidPlaceholder")}
                  dir="ltr"
                  className="font-mono"
                />
              </div>
              <Button
                onClick={() => scanUid && lookupMut.mutate(scanUid)}
                disabled={!scanUid || lookupMut.isPending}
                className="gap-2"
              >
                {lookupMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                {t("admin.scanner.verify")}
              </Button>
              <Button variant="outline" onClick={handleScan} disabled={scanning || !nfcSupported} className="gap-2">
                {scanning ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
                {t("admin.scanner.scanNfc")}
              </Button>
            </div>
            {!nfcSupported && (
              <p className="text-xs text-muted-foreground">{t("admin.scanner.nfcHint")}</p>
            )}
            {result && (
              <ScanResult
                result={result as never}
                onAssign={(uid) => setAssignUid(uid)}
              />
            )}
          </CardContent>
        </Card>

        <ErrorReviewPanel
          problems={problems}
          isLookupPending={lookupMut.isPending}
          onRecheck={(uid) => { setScanUid(uid); lookupMut.mutate(uid); }}
          onAssign={(uid) => setAssignUid(uid)}
        />

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>{t("admin.scanner.allCardsTitle")}</CardTitle>
              <CardDescription>
                {t("admin.scanner.allCardsDesc").replace("{count}", String(total)).replace("{page}", String(page)).replace("{total}", String(totalPages))}
                {listQuery.isFetching ? t("admin.scanner.refreshing") : ""}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0} className="gap-2">
              <Download className="size-4" />
              {t("admin.scanner.exportCsv")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px]">
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder={t("admin.scanner.searchPlaceholder")}
                dir="ltr"
                className="font-mono"
              />
              <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder={t("admin.scanner.filter.status")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.scanner.filter.statusAll")}</SelectItem>
                  <SelectItem value="active">{t("admin.scanner.filter.active")}</SelectItem>
                  <SelectItem value="disabled">{t("admin.scanner.filter.disabled")}</SelectItem>
                  <SelectItem value="unassigned">{t("admin.scanner.filter.unassigned")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={(v) => { setType(v as typeof type); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder={t("admin.scanner.filter.type")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.scanner.filter.typeAll")}</SelectItem>
                  <SelectItem value="official">{t("admin.scanner.filter.official")}</SelectItem>
                  <SelectItem value="unofficial">{t("admin.scanner.filter.unofficial")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-right">{t("admin.scanner.col.uid")}</th>
                    <th className="p-2 text-right">{t("admin.scanner.col.status")}</th>
                    <th className="p-2 text-right">{t("admin.scanner.col.type")}</th>
                    <th className="p-2 text-right">{t("admin.scanner.col.owner")}</th>
                    <th className="p-2 text-right">{t("admin.scanner.col.activated")}</th>
                    <th className="p-2 text-right">{t("admin.scanner.col.lastWritten")}</th>
                    <th className="p-2 text-right">{t("admin.scanner.col.created")}</th>
                    <th className="p-2 text-right">{t("admin.scanner.col.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.isPending ? (
                    <tr><td colSpan={8} className="p-6 text-center"><Loader2 className="size-5 animate-spin inline" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{t("admin.scanner.empty")}</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-2 font-mono text-xs" dir="ltr">{r.card_uid}</td>
                      <td className="p-2">
                        <Badge variant={r.status === "active" ? "default" : r.status === "disabled" ? "destructive" : "secondary"}>
                          {(STATUS_LABEL_KEY[r.status] ? t(STATUS_LABEL_KEY[r.status]) : r.status)}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant={r.is_official ? "default" : "outline"}>{r.is_official ? t("admin.scanner.filter.official") : t("admin.scanner.filter.unofficial")}</Badge>
                      </td>
                      <td className="p-2">
                        {r.profile_username ? (
                          <Link to="/admin/users/$userId" params={{ userId: r.profile_id! }} className="text-[var(--gold-soft)] hover:underline">
                            {r.profile_full_name || r.profile_username}
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setAssignUid(r.card_uid)}>
                            <UserPlus className="size-3" /> {t("admin.scanner.register")}
                          </Button>
                        )}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{fmtDate(r.activated_at)}</td>
                      <td className="p-2 text-xs text-muted-foreground">{fmtDate(r.last_written_at)}</td>
                      <td className="p-2 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {r.status !== "active" && (
                            <Button
                              size="sm" variant="outline" className="h-7 gap-1"
                              title={t("admin.scanner.action.activate")}
                              disabled={rowBusy || !r.profile_id}
                              onClick={() => statusMut.mutate({ id: r.id, status: "active" })}
                            >
                              <Power className="size-3" />
                            </Button>
                          )}
                          {r.status !== "disabled" && (
                            <Button
                              size="sm" variant="outline" className="h-7 gap-1"
                              title={t("admin.scanner.action.disable")}
                              disabled={rowBusy}
                              onClick={() => statusMut.mutate({ id: r.id, status: "disabled" })}
                            >
                              <PowerOff className="size-3" />
                            </Button>
                          )}
                          {r.profile_id && (
                            <Button
                              size="sm" variant="outline" className="h-7 gap-1"
                              title={t("admin.scanner.action.unassign")}
                              disabled={rowBusy}
                              onClick={() => {
                                if (confirm(t("admin.scanner.action.unassignConfirm").replace("{uid}", r.card_uid))) {
                                  unassignMut.mutate(r.id);
                                }
                              }}
                            >
                              <Unlink className="size-3" />
                            </Button>
                          )}
                          <Button
                            size="sm" variant="outline" className="h-7 gap-1 text-destructive hover:text-destructive"
                            title={t("admin.scanner.action.delete")}
                            disabled={rowBusy}
                            onClick={() => {
                              if (confirm(t("admin.scanner.action.deleteConfirm").replace("{uid}", r.card_uid))) {
                                deleteMut.mutate(r.id);
                              }
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1">
                <ChevronRight className="size-4" /> {t("admin.scanner.prev")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("admin.scanner.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                {t("admin.scanner.next")} <ChevronLeft className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <AuditLogList scans={allScans} isPending={actionsQuery.isPending} onExport={exportAuditCsv} />
      </div>

      {assignUid && (
        <Suspense fallback={null}>
          <AssignCardDialog
            uid={assignUid}
            onClose={() => setAssignUid(null)}
            onDone={() => {
              setAssignUid(null);
              qc.invalidateQueries({ queryKey: qk.admin.cards() });
              qc.invalidateQueries({ queryKey: qk.admin.scannerActions() });
              if (scanUid) lookupMut.mutate(scanUid);
            }}
            assignFn={assignFn}
            usersFn={usersFn}
          />
        </Suspense>
      )}
    </AdminShell>
  );
}

