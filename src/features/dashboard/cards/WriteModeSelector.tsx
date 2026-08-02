import { memo } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Contact2, Link2, XCircle } from "lucide-react";
import type { VCardIssue } from "@/lib/vcard";
import type { WriteMode } from "./types";
import { useLanguage } from "@/lib/i18n";

type Props = {
  writeMode: WriteMode;
  onChange: (mode: WriteMode) => void;
  username: string | null;
  vcardSupported: boolean;
  vcardErrors: VCardIssue[];
};

function WriteModeSelectorImpl({
  writeMode,
  onChange,
  username,
  vcardSupported,
  vcardErrors,
}: Props) {
  const { t } = useLanguage();
  return (
    <>
      <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
        <RadioGroup
          value={writeMode}
          onValueChange={(v) => onChange(v as WriteMode)}
          className="grid gap-2 sm:grid-cols-2"
        >
          <label
            htmlFor="wm-url"
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${writeMode === "url" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <RadioGroupItem id="wm-url" value="url" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">
                <Link2 className="size-4" />
                {t("dash.wm.urlTitle")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("dash.wm.urlDescPrefix")}{" "}
                {username ? (
                  <code dir="ltr" className="rounded bg-muted px-1 py-0.5">
                    /u/{username}
                  </code>
                ) : (
                  <span className="text-amber-600">{t("dash.wm.setUsernameFirst")}</span>
                )}
                {t("dash.wm.urlDescSuffix")}
              </p>
            </div>
          </label>
          <label
            htmlFor="wm-vcard"
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${writeMode === "vcard" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <RadioGroupItem id="wm-vcard" value="vcard" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">
                <Contact2 className="size-4" />
                {t("dash.wm.vcardTitle")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("dash.wm.vcardDesc")}
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {writeMode === "vcard" && !vcardSupported && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              {t("dash.wm.vcardUnsupported")}{" "}
              <b>{t("dash.wm.urlModeWord")}</b> {t("dash.wm.vcardUnsupportedSuffix")}
            </div>
          </div>
        </div>
      )}

      {writeMode === "vcard" && vcardSupported && vcardErrors.length > 0 && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
            <XCircle className="size-4" />
            {t("dash.wm.fixBeforeWrite")}
          </div>
          <ul className="ms-6 list-disc space-y-1 text-destructive/90">
            {vcardErrors.map((iss, i) => (
              <li key={i}>
                {iss.message}
                {iss.suggestion && (
                  <span className="block text-muted-foreground">{iss.suggestion}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export const WriteModeSelector = memo(WriteModeSelectorImpl);