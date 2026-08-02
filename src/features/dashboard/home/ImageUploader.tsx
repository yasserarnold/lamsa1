import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUp, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/**
 * Circular (avatar) or wide (cover) image dropzone.
 * The whole area is a native `<label>` for the file input, so a single
 * tap opens the picker on every device (no hover required).
 */
export function ImageUploader({
  currentUrl,
  busy,
  progress,
  onFile,
  kind,
}: {
  currentUrl: string | null | undefined;
  busy: boolean;
  progress?: number;
  onFile: (file: File) => void;
  kind: "avatar" | "cover";
}) {
  const { t } = useLanguage();
  const rounded = kind === "avatar";
  const showProgress = busy && typeof progress === "number";
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  return (
    <div className={rounded ? "w-24" : "w-full"}>
      <label
        className={`group relative block cursor-pointer overflow-hidden border-2 border-dashed border-border bg-muted/30 ${
          rounded ? "size-24 rounded-full" : "aspect-[3/1] w-full rounded-2xl"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
        aria-label={rounded ? t("dash.imageUploader.changeAvatarAria") : t("dash.imageUploader.changeCoverAria")}
        aria-busy={busy}
      >
        {currentUrl ? (
          rounded ? (
            <Avatar className="size-24">
              <AvatarImage src={currentUrl} alt="" />
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
          ) : (
            <img
              src={currentUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          )
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <ImageUp className="size-6" />
          </div>
        )}
        <span
          className={`absolute inset-0 grid place-items-center gap-1 text-xs font-medium text-white transition ${
            busy
              ? "bg-black/50 opacity-100"
              : currentUrl
                ? "bg-black/30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                : "bg-black/10"
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              {showProgress && <span className="tabular-nums">{Math.round(pct)}%</span>}
            </>
          ) : currentUrl ? (
            t("dash.imageUploader.change")
          ) : (
            t("dash.imageUploader.chooseImage")
          )}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {busy && (
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={showProgress ? Math.round(pct) : undefined}
          aria-label={t("dash.imageUploader.uploadingAria")}
        >
          <div
            className={`h-full bg-[var(--gold)] transition-[width] duration-300 ease-out ${
              showProgress ? "" : "animate-pulse"
            }`}
            style={{ width: showProgress ? `${pct}%` : "40%" }}
          />
        </div>
      )}
    </div>
  );
}
