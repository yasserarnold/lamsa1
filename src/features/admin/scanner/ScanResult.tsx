import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, UserPlus, XCircle } from "lucide-react";
import { fmtDate, STATUS_LABEL_KEY } from "./utils";
import { useLanguage } from "@/lib/i18n";

type Result =
  | { ok: false; reason: "invalid" | "not_found"; message: string; normalized: string }
  | {
      ok: true;
      message?: string;
      normalized: string;
      card: {
        card_uid: string;
        status: string;
        is_official: boolean;
        activated_at: string | null;
        last_written_at: string | null;
      };
      profile: { username: string | null; full_name: string | null } | null;
    };

export function ScanResult({ result, onAssign }: { result: Result; onAssign: (uid: string) => void }) {
  const { t, locale } = useLanguage();
  if (!result.ok) {
    const Icon = result.reason === "invalid" ? AlertTriangle : XCircle;
    const canRegister = result.reason === "not_found" && /^[0-9A-F]{8,32}$/.test(result.normalized || "");
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <Icon className="size-5 text-destructive shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-destructive">{result.message}</p>
          <p className="text-xs text-muted-foreground mt-1" dir="ltr">UID: {result.normalized || "—"}</p>
          {canRegister && (
            <Button size="sm" className="mt-2 gap-1 h-7" onClick={() => onAssign(result.normalized)}>
              <UserPlus className="size-3" /> {t("admin.scanResult.registerNow")}
            </Button>
          )}
        </div>
      </div>
    );
  }
  const c = result.card;
  return (
    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-emerald-500" />
        <p className="font-medium">{t("admin.scanResult.valid")}</p>
        <Badge variant={c.status === "active" ? "default" : c.status === "disabled" ? "destructive" : "secondary"}>
          {t(STATUS_LABEL_KEY[c.status] ?? "admin.status.active")}
        </Badge>
        <Badge variant={c.is_official ? "default" : "outline"}>{c.is_official ? t("admin.scanResult.official") : t("admin.scanResult.unofficial")}</Badge>
        <Button size="sm" variant="outline" className="ms-auto h-7 gap-1" onClick={() => onAssign(c.card_uid)}>
          <UserPlus className="size-3" /> {result.profile ? t("admin.scanResult.reassign") : t("admin.scanResult.assign")}
        </Button>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <p><span className="text-foreground">{t("admin.scanResult.uid")}</span> <span dir="ltr" className="font-mono">{c.card_uid}</span></p>
        <p><span className="text-foreground">{t("admin.scanResult.owner")}</span> {result.profile?.full_name || result.profile?.username || t("admin.scanResult.unassigned")}</p>
        <p><span className="text-foreground">{t("admin.scanResult.activated")}</span> {fmtDate(c.activated_at, locale)}</p>
        <p><span className="text-foreground">{t("admin.scanResult.lastWritten")}</span> {fmtDate(c.last_written_at, locale)}</p>
      </div>
    </div>
  );
}