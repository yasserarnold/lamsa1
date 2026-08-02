import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RotateCw, UserPlus } from "lucide-react";
import type { AdminAction } from "./utils";
import { useLanguage } from "@/lib/i18n";

export function ErrorReviewPanel({
  problems,
  isLookupPending,
  onRecheck,
  onAssign,
}: {
  problems: AdminAction[];
  isLookupPending: boolean;
  onRecheck: (uid: string) => void;
  onAssign: (uid: string) => void;
}) {
  const { t, locale } = useLanguage();
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-destructive" />
            {t("admin.errorReview.title")}
          </CardTitle>
          <CardDescription>{t("admin.errorReview.desc").replace("{count}", String(problems.length))}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {problems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.errorReview.empty")}</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-right">{t("admin.errorReview.col.uid")}</th>
                  <th className="p-2 text-right">{t("admin.errorReview.col.reason")}</th>
                  <th className="p-2 text-right">{t("admin.errorReview.col.time")}</th>
                  <th className="p-2 text-right">{t("admin.errorReview.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((a) => {
                  const m = (a.metadata ?? {}) as Record<string, unknown>;
                  const uid = String(m.normalized || m.uid || "");
                  const res = String(m.result ?? "");
                  const canRegister = res === "not_found" && /^[0-9A-F]{8,32}$/.test(uid);
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-2 font-mono text-xs" dir="ltr">{uid || "—"}</td>
                      <td className="p-2">
                        {res === "invalid" ? (
                          <span className="text-xs text-destructive">{t("admin.errorReview.reasonInvalid")}</span>
                        ) : (
                          <span className="text-xs text-amber-500">{t("admin.errorReview.reasonNotFound")}</span>
                        )}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString(locale)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!uid || isLookupPending}
                            onClick={() => onRecheck(uid)}
                            className="gap-1 h-7"
                          >
                            <RotateCw className="size-3" /> {t("admin.errorReview.recheck")}
                          </Button>
                          {canRegister && (
                            <Button size="sm" className="gap-1 h-7" onClick={() => onAssign(uid)}>
                              <UserPlus className="size-3" /> {t("admin.errorReview.register")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}