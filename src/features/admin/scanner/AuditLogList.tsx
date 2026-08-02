import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, ScrollText } from "lucide-react";
import type { AdminAction } from "./utils";
import { useLanguage } from "@/lib/i18n";

export function AuditLogList({
  scans,
  isPending,
  onExport,
}: {
  scans: AdminAction[];
  isPending: boolean;
  onExport: () => void;
}) {
  const { t, locale } = useLanguage();
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="size-4 text-[var(--gold)]" />
            {t("admin.auditLog.title")}
          </CardTitle>
          <CardDescription>{t("admin.auditLog.desc")}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} disabled={scans.length === 0} className="gap-2">
          <Download className="size-4" /> {t("admin.auditLog.export")}
        </Button>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="grid place-items-center py-6"><Loader2 className="size-5 animate-spin" /></div>
        ) : scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.auditLog.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {scans.slice(0, 30).map((a) => {
              const m = (a.metadata ?? {}) as Record<string, unknown>;
              const result = String(m.result ?? "");
              return (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs" dir="ltr">{String(m.normalized || m.uid || "—")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {result === "found" ? t("admin.auditLog.found").replace("{status}", String(m.status ?? "")) : result === "not_found" ? t("admin.auditLog.notFound") : t("admin.auditLog.invalid")}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(a.created_at).toLocaleString(locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}