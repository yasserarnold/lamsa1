import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Contact2,
  Eye,
  Info,
  Link2,
  Loader2,
  Nfc,
  Radio,
  XCircle,
} from "lucide-react";
import type { VCardIssue } from "@/lib/vcard";
import type { WriteMode } from "./types";
import { useLanguage } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  writeMode: WriteMode;
  cardUid: string | null;
  bytes: number;
  username: string | null;
  profileUrl: string;
  vcardText: string;
  vcardIssues: VCardIssue[];
  vcardSupported: boolean;
  nfcSupported: boolean;
  isWriting: boolean;
  onWrite: () => void;
};

function WritePreviewDialogImpl(props: Props) {
  const {
    open,
    onOpenChange,
    writeMode,
    cardUid,
    bytes,
    username,
    profileUrl,
    vcardText,
    vcardIssues,
    vcardSupported,
    nfcSupported,
    isWriting,
    onWrite,
  } = props;
  const { t } = useLanguage();
  const vcardErrors = vcardIssues.filter((i) => i.severity === "error");
  const disabled =
    !cardUid ||
    !nfcSupported ||
    isWriting ||
    (writeMode === "url" && !username) ||
    (writeMode === "vcard" && (!vcardSupported || vcardErrors.length > 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="size-5" />
            {t("dash.preview.title")}
          </DialogTitle>
          <DialogDescription>
            {t("dash.preview.desc")}
          </DialogDescription>
        </DialogHeader>

        {cardUid && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                <Nfc className="size-3" />
                <code dir="ltr">{cardUid}</code>
              </Badge>
              <Badge variant="outline" className="gap-1">
                {writeMode === "vcard" ? (
                  <Contact2 className="size-3" />
                ) : (
                  <Link2 className="size-3" />
                )}
                {writeMode === "vcard" ? t("dash.preview.vcardMode") : t("dash.preview.urlMode")}
              </Badge>
              <Badge variant="outline">{bytes} bytes</Badge>
            </div>

            {writeMode === "url" ? (
              username ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("dash.preview.willOpen")}
                  </div>
                  <code className="block break-all text-sm" dir="ltr">
                    {profileUrl}
                  </code>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                  {t("dash.preview.setUsernameFirst")}
                </div>
              )
            ) : !vcardSupported ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="size-4" />
                  {t("dash.preview.deviceNoVcard")}
                </div>
                <p>
                  {t("dash.preview.deviceNoVcardDesc")} <b>{t("dash.preview.urlModeWord")}</b> {t("dash.preview.deviceNoVcardSuffix")}
                </p>
              </div>
            ) : (
              <>
                {vcardIssues.length > 0 && (
                  <div className="space-y-1">
                    {vcardIssues.map((iss, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-md p-2 text-xs ${
                          iss.severity === "error"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-900 dark:text-amber-200"
                        }`}
                      >
                        {iss.severity === "error" ? (
                          <XCircle className="mt-0.5 size-4 shrink-0" />
                        ) : (
                          <Info className="mt-0.5 size-4 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold">{iss.message}</div>
                          {iss.suggestion && (
                            <div className="opacity-80">{iss.suggestion}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {vcardErrors.length === 0 && (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                    {t("dash.preview.vcardValid")}
                  </div>
                )}
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("dash.preview.vcardContent")}
                  </div>
                  <pre
                    dir="ltr"
                    className="max-h-52 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed font-mono"
                  >
                    {vcardText}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dash.preview.cancel")}
          </Button>
          <Button onClick={onWrite} disabled={disabled} className="gap-2">
            {isWriting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Radio className="size-4" />
            )}
            {t("dash.preview.writeNow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const WritePreviewDialog = memo(WritePreviewDialogImpl);