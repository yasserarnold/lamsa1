import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useLanguage } from "@/lib/i18n";
import { amIAdmin, bulkImportUids, adminStats, listAdminActions } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { Loader2, Upload, Download, FileText, ScrollText } from "lucide-react";
import { qk } from "@/lib/query-keys";

export const Route = createFileRoute("/_authenticated/admin/cards")({
  head: () => ({
    meta: [
      { title: "لوحة المسؤول — استيراد البطاقات" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCardsPage,
});

type ImportRow = {
  uid: string;
  normalized: string;
  status: "accepted" | "duplicate_input" | "invalid" | "exists" | "error";
  reason?: string;
  type?: string;
};

const STATUS_LABEL_KEYS: Record<ImportRow["status"], string> = {
  accepted: "admin.cards.status.accepted",
  duplicate_input: "admin.cards.status.duplicate_input",
  invalid: "admin.cards.status.invalid",
  exists: "admin.cards.status.exists",
  error: "admin.cards.status.error",
};

function parseInput(text: string): string[] {
  return text
    .split(/[\r\n,;\t\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCsv(rows: ImportRow[]) {
  const header = "raw,normalized,status,type,reason,exported_at";
  const exportedAt = new Date().toISOString();
  const body = rows
    .map((r) =>
      [r.uid, r.normalized, r.status, r.type ?? "", r.reason ?? "", exportedAt]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
  return `\ufeff${header}\n${body}\n`;
}

function AdminCardsPage() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const importFn = useServerFn(bulkImportUids);
  const statsFn = useServerFn(adminStats);
  const actionsFn = useServerFn(listAdminActions);

  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;

  useEffect(() => {
    if (adminQuery.data && !adminQuery.data.isAdmin) {
      toast.error(t("admin.common.adminOnly"));
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminQuery.data, navigate]);

  const statsQuery = useQuery({
    queryKey: qk.admin.stats(),
    queryFn: () => statsFn(),
    enabled: isAdmin,
  });

  const actionsQuery = useQuery({
    queryKey: qk.admin.scannerActions(),
    queryFn: () => actionsFn({ data: { limit: 30 } }),
    enabled: isAdmin,
  });

  const [text, setText] = useState("");
  const [isOfficial, setIsOfficial] = useState(true);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<null | { total: number; accepted: number; invalid: number; duplicate_input: number; exists: number; errors: number }>(null);

  const parsed = useMemo(() => parseInput(text), [text]);

  const mutation = useMutation({
    mutationFn: (uids: string[]) => importFn({ data: { uids, is_official: isOfficial } }),
    onSuccess: (res) => {
      setRows(res.results as ImportRow[]);
      setSummary(res.summary);
      qc.invalidateQueries({ queryKey: qk.admin.stats() });
      qc.invalidateQueries({ queryKey: qk.admin.scannerActions() });
      toast.success(t("admin.cards.importSuccess").replace("{accepted}", String(res.summary.accepted)).replace("{total}", String(res.summary.total)));
    },
    onError: (e) => toastError(e),
  });

  async function onCsvFile(file: File) {
    const t = await file.text();
    // Support CSV where UID is first column; strip header if it looks non-hex
    const lines = t.split(/\r?\n/).map((l) => l.split(",")[0]?.trim() ?? "").filter(Boolean);
    if (lines[0] && !/^[0-9A-Fa-f\s:-]+$/.test(lines[0])) lines.shift();
    setText(lines.join("\n"));
  }

  function downloadReport() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfc-import-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <h2 className="font-display text-2xl font-bold">{t("admin.cards.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.cards.subtitle")}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t("admin.cards.stat.total")} value={statsQuery.data?.total ?? 0} />
          <StatCard label={t("admin.cards.stat.active")} value={statsQuery.data?.active ?? 0} />
          <StatCard label={t("admin.cards.stat.unassigned")} value={statsQuery.data?.unassigned ?? 0} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.cards.importTitle")}</CardTitle>
            <CardDescription>{t("admin.cards.importDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="is-official" checked={isOfficial} onCheckedChange={setIsOfficial} />
                <Label htmlFor="is-official">{t("admin.cards.official")}</Label>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                <FileText className="size-4" />
                {t("admin.cards.uploadCsv")}
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onCsvFile(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={t("admin.cards.textareaPlaceholder")}
              className="font-mono text-sm"
              dir="ltr"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t("admin.cards.lineCount").replace("{count}", String(parsed.length))}</span>
              <Button
                onClick={() => mutation.mutate(parsed)}
                disabled={parsed.length === 0 || mutation.isPending}
                className="gap-2"
              >
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {t("admin.cards.import")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("admin.cards.resultTitle")}</CardTitle>
                <CardDescription>
                  {t("admin.cards.resultDesc")
                    .replace("{total}", String(summary.total))
                    .replace("{accepted}", String(summary.accepted))
                    .replace("{duplicate}", String(summary.duplicate_input))
                    .replace("{exists}", String(summary.exists))
                    .replace("{invalid}", String(summary.invalid))
                    .replace("{errors}", String(summary.errors))}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={downloadReport} className="gap-2">
                <Download className="size-4" />
                {t("admin.cards.downloadCsv")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-right">{t("admin.cards.col.original")}</th>
                      <th className="p-2 text-right">{t("admin.cards.col.normalized")}</th>
                      <th className="p-2 text-right">{t("admin.cards.col.status")}</th>
                      <th className="p-2 text-right">{t("admin.cards.col.reason")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 font-mono text-xs" dir="ltr">{r.uid}</td>
                        <td className="p-2 font-mono text-xs" dir="ltr">{r.normalized || "—"}</td>
                        <td className="p-2">
                          <Badge variant={r.status === "accepted" ? "default" : r.status === "invalid" || r.status === "error" ? "destructive" : "secondary"}>
                            {t(STATUS_LABEL_KEYS[r.status] as any)}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{r.reason ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="size-4 text-[var(--gold)]" />
              {t("admin.cards.importLogTitle")}
            </CardTitle>
            <CardDescription>{t("admin.cards.importLogDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {actionsQuery.isPending ? (
              <div className="grid place-items-center py-6"><Loader2 className="size-5 animate-spin" /></div>
            ) : (() => {
              const scans = (actionsQuery.data ?? []).filter((a: { action?: string | null }) => a.action === "card_scan_import");
              if (scans.length === 0) return <p className="text-sm text-muted-foreground">{t("admin.cards.importLogEmpty")}</p>;
              return (
                <ul className="space-y-2">
                  {scans.map((a: { id?: string; metadata?: Record<string, unknown> | null; created_at?: string | null }) => {
                    const m = (a.metadata ?? {}) as Record<string, number | boolean>;
                    return (
                      <li key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3 text-sm">
                        <div>
                          <p className="font-medium">
                            {t("admin.cards.importLogLine").replace("{accepted}", String(Number(m.accepted) || 0)).replace("{total}", String(Number(m.total) || 0))}
                            {m.is_official ? ` ${t("admin.cards.official.official")}` : ` ${t("admin.cards.official.unofficial")}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {t("admin.cards.importLogDetail")
                              .replace("{exists}", String(Number(m.exists) || 0))
                              .replace("{duplicate}", String(Number(m.duplicate_input) || 0))
                              .replace("{invalid}", String(Number(m.invalid) || 0))
                              .replace("{errors}", String(Number(m.errors) || 0))}
                          </p>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {a.created_at ? new Date(a.created_at).toLocaleString(locale) : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}