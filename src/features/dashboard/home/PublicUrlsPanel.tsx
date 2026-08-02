import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Info,
  QrCode,
  Contact,
  AlertTriangle,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  diagnosePublicSiteUrl,
  publicProfileUrl,
  getPublicSiteUrl,
} from "@/lib/public-url";
import { buildVCard } from "@/lib/vcard";
import { PanelCard } from "@/components/ui-ext/PanelCard";
import { useLanguage } from "@/lib/i18n";

type Row = { key: string; label: string; icon: typeof Globe; url: string };

export function PublicUrlsPanel({ username }: { username: string | null }) {
  const { t } = useLanguage();
  const diagnostic = useMemo(() => diagnosePublicSiteUrl(), []);
  const domain = getPublicSiteUrl();
  const [copied, setCopied] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<Set<string>>(new Set());
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState<number>(1024);
  const [qrDownloading, setQrDownloading] = useState(false);
  const [qrDecoded, setQrDecoded] = useState<
    | { url: string; matches: boolean; at: number }
    | null
  >(null);
  // Holds the exact vCard text currently rendered in the field. The download
  // button reads from this ref so the .vcf file is byte-identical to what the
  // user sees, instead of re-building it from separate inputs.
  const vcardSourceRef = useRef<HTMLTextAreaElement | null>(null);

  const rows: Row[] = useMemo(() => {
    if (!username) return [];
    const shareUrl = publicProfileUrl(username);
    return [
      { key: "preview", label: t("dash.publicUrls.previewShare"), icon: ExternalLink, url: shareUrl },
      { key: "qr", label: t("dash.publicUrls.qrPayload"), icon: QrCode, url: shareUrl },
      { key: "vcard", label: t("dash.publicUrls.vcardUrlField"), icon: Contact, url: shareUrl },
    ];
  }, [username, domain, t]);

  const shareUrl = rows.find((r) => r.key === "qr")?.url ?? null;

  const vcardText = useMemo(() => {
    if (!username || !shareUrl) return null;
    return buildVCard({
      fullName: username,
      url: shareUrl,
      links: [],
    });
  }, [username, shareUrl]);

  async function copyVcard() {
    if (!vcardText) return;
    try {
      await navigator.clipboard.writeText(vcardText);
      toast.success(t("dash.publicUrls.toastCopiedVcardRaw"));
    } catch {
      toast.error(t("dash.publicUrls.errCopyFailed"));
    }
  }

  function downloadVcard() {
    const text = vcardSourceRef.current?.value ?? vcardText ?? "";
    if (!text || !username) return;
    const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${username}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    toast.success(t("dash.publicUrls.toastVcardDownloaded"));
  }

  function verifyVcardUrl() {
    const text = vcardSourceRef.current?.value ?? vcardText ?? "";
    if (!text || !shareUrl) {
      toast.error(t("dash.publicUrls.errNoVcardToVerify"));
      return;
    }
    // Extract the URL line (ignore params like URL;TYPE=WORK:...)
    const line = text
      .split(/\r?\n/)
      .find((l) => /^URL(;[^:]*)?:/i.test(l));
    if (!line) {
      toast.error(t("dash.publicUrls.errNoUrlFieldInVcard"));
      return;
    }
    const extracted = line.slice(line.indexOf(":") + 1).trim();
    if (extracted === shareUrl) {
      toast.success(t("dash.publicUrls.toastVcardUrlMatch"), {
        description: extracted,
      });
    } else {
      toast.error(t("dash.publicUrls.toastVcardUrlMismatch"), {
        description: `${t("dash.publicUrls.extracted")}: ${extracted}\n${t("dash.publicUrls.expected")}: ${shareUrl}`,
      });
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!shareUrl) {
      setQrDataUrl(null);
      return;
    }
    // Clear the stale preview so the UI immediately reflects the URL change
    // while the new QR is being generated.
    setQrDataUrl(null);
    setQrDecoded(null);
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(shareUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#0b0b0b", light: "#ffffff" },
        }),
      )
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  async function downloadQr() {
    if (!shareUrl || !username) return;
    setQrDownloading(true);
    try {
      // Re-render at the requested resolution with higher error-correction
      // so large prints still scan even with a logo/crop.
      const { default: QRCode } = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#0b0b0b", light: "#ffffff" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-${username}-${qrSize}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(t("dash.publicUrls.toastQrDownloaded").replace("{size}", String(qrSize)).replace("{size}", String(qrSize)));
    } catch {
      toast.error(t("dash.publicUrls.errQrGenerateFailed"));
    } finally {
      setQrDownloading(false);
    }
  }

  async function verifyQrPayload() {
    if (!shareUrl || !qrDataUrl) {
      toast.error(t("dash.publicUrls.errNoQrToVerify"));
      return;
    }
    try {
      const [{ default: jsQR }] = await Promise.all([
        import("jsqr"),
      ]);
      const img = new Image();
      img.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load failed"));
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas ctx");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(data.data, data.width, data.height);
      if (!decoded) {
        setQrDecoded(null);
        toast.error(t("dash.publicUrls.errQrDecodeFailed"));
        return;
      }
      const matches = decoded.data === shareUrl;
      setQrDecoded({ url: decoded.data, matches, at: Date.now() });
      if (decoded.data === shareUrl) {
        toast.success(t("dash.publicUrls.toastQrMatch"), {
          description: `${t("dash.publicUrls.extracted")}: ${decoded.data}`,
        });
      } else {
        toast.error(t("dash.publicUrls.toastQrMismatch"), {
          description: `${t("dash.publicUrls.extracted")}: ${decoded.data}\n${t("dash.publicUrls.expected")}: ${shareUrl}`,
        });
      }
    } catch {
      toast.error(t("dash.publicUrls.errQrVerifyFailed"));
    }
  }

  async function copy(key: string, url: string, label: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      toast.success(t("dash.publicUrls.toastCopied").replace("{label}", label), { description: url });
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      toast.error(t("dash.publicUrls.errCopyFailed"));
    }
  }

  function verifyOrigins() {
    if (rows.length === 0) {
      toast.error(t("dash.publicUrls.toastNoLinksToVerify"));
      return;
    }
    let expected: URL;
    try {
      expected = new URL(domain);
    } catch {
      toast.error(t("dash.publicUrls.errInvalidDomain"), { description: domain });
      return;
    }
    const bad = new Set<string>();
    const details: string[] = [];
    for (const r of rows) {
      try {
        const u = new URL(r.url);
        if (u.origin !== expected.origin) {
          bad.add(r.key);
          details.push(`${r.label}: ${u.origin}`);
        }
      } catch {
        bad.add(r.key);
        details.push(`${r.label}: ${t("dash.publicUrls.errInvalidUrl")}`);
      }
    }
    setMismatches(bad);
    setVerifiedAt(Date.now());
    if (bad.size === 0) {
      toast.success(t("dash.publicUrls.toastAllOriginsMatch"), { description: expected.origin });
    } else {
      toast.error(
        t("dash.publicUrls.toastOriginMismatch").replace("{count}", String(bad.size)).replace("{origin}", expected.origin),
        { description: details.join(" • ") },
      );
    }
  }

  const source =
    diagnostic.level === "ok"
      ? diagnostic.source === "override"
        ? { label: t("dash.publicUrls.sourceOverride"), tone: "gold" as const }
        : { label: t("dash.publicUrls.sourceCurrentDomain"), tone: "gold" as const }
      : { label: t("dash.publicUrls.sourceDefault"), tone: "warn" as const };

  return (
    <PanelCard title={t("dash.publicUrls.title")} icon={Globe}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/40 p-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("dash.publicUrls.domainUsed")}
            </p>
            <p dir="ltr" className="mt-0.5 truncate font-mono text-sm">
              {domain}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                source.tone === "gold"
                  ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                  : "bg-amber-500/15 text-amber-600"
              }`}
            >
              {source.label}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={verifyOrigins}
              disabled={!username}
            >
              <ShieldCheck className="size-3.5" />
              {t("dash.publicUrls.verifyNow")}
            </Button>
          </div>
        </div>

        {verifiedAt !== null && (
          <div
            className={`rounded-xl border p-2.5 text-xs ${
              mismatches.size === 0
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                : "border-red-500/30 bg-red-500/5 text-red-700"
            }`}
          >
            {mismatches.size === 0
              ? `✓ ${t("dash.publicUrls.allMatch")} ${domain}`
              : `⚠︎ ${mismatches.size} ${t("dash.publicUrls.someMismatch")}`}
          </div>
        )}

        {diagnostic.level !== "ok" && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-700">
                {diagnostic.message}
              </p>
              <p className="mt-1 text-muted-foreground">{diagnostic.hint}</p>
            </div>
          </div>
        )}

        {!username ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
            <Info className="size-4" />
            {t("dash.publicUrls.chooseUsernameFirst")}
          </div>
        ) : (
          <>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-4 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-lg bg-white p-2">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR code"
                  className="size-32 sm:size-36"
                />
              ) : (
                <div className="size-32 animate-pulse rounded bg-muted sm:size-36" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("dash.publicUrls.qrContent")}
              </p>
              <p
                dir="ltr"
                className="break-all font-mono text-xs text-foreground/80"
              >
                {shareUrl}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <label className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/50 px-2 text-xs text-muted-foreground">
                  <span>{t("dash.publicUrls.resolution")}</span>
                  <select
                    value={qrSize}
                    onChange={(e) => setQrSize(Number(e.target.value))}
                    className="h-7 bg-transparent text-xs text-foreground outline-none"
                    aria-label={t("dash.publicUrls.resolutionAria")}
                  >
                    <option value={512}>512×512</option>
                    <option value={1024}>1024×1024</option>
                    <option value={2048}>2048×2048</option>
                    <option value={4096}>4096×4096</option>
                  </select>
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={downloadQr}
                  disabled={!qrDataUrl || qrDownloading}
                >
                  <Download className="size-3.5" />
                  {qrDownloading ? t("dash.publicUrls.preparing") : t("dash.publicUrls.downloadPng")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={verifyQrPayload}
                  disabled={!qrDataUrl}
                >
                  <ShieldCheck className="size-3.5" />
                  {t("dash.publicUrls.verifyQrContent")}
                </Button>
              </div>
              {qrDecoded && (
                <div
                  className={`mt-2 rounded-md border p-2 text-xs ${
                    qrDecoded.matches
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-red-500/40 bg-red-500/5"
                  }`}
                >
                  <p className="mb-1 font-medium">
                    {qrDecoded.matches
                      ? t("dash.publicUrls.qrExtractedMatch")
                      : t("dash.publicUrls.qrExtractedMismatch")}
                  </p>
                  <p
                    dir="ltr"
                    className="break-all font-mono text-[11px] text-foreground/90"
                  >
                    {qrDecoded.url}
                  </p>
                  {!qrDecoded.matches && (
                    <p
                      dir="ltr"
                      className="mt-1 break-all font-mono text-[11px] text-muted-foreground"
                    >
                      {t("dash.publicUrls.expected")}: {shareUrl}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
            {rows.map((r) => {
              const Icon = r.icon;
              const isCopied = copied === r.key;
              const isBad = mismatches.has(r.key);
              return (
                <li
                  key={r.key}
                  className={`flex items-center gap-2 p-2.5 ${
                    isBad ? "bg-red-500/5" : ""
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 ${
                      isBad ? "text-red-500" : "text-[var(--gold-soft)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {r.label}
                      {isBad && (
                        <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-red-600">
                          {t("dash.publicUrls.mismatchBadge")}
                        </span>
                      )}
                    </p>
                    <p
                      dir="ltr"
                      className="truncate font-mono text-xs"
                      title={r.url}
                    >
                      {r.url}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => copy(r.key, r.url, r.label)}
                  >
                    {isCopied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8"
                  >
                    <a href={r.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
          {vcardText && (
            <div className="rounded-xl border border-border/50 bg-background/40 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <FileText className="size-3.5" />
                  {t("dash.publicUrls.rawVcard")}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={copyVcard}
                  >
                    <Copy className="size-3.5" />
                    {t("dash.publicUrls.copyAll")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={downloadVcard}
                  >
                    <Download className="size-3.5" />
                    {t("dash.publicUrls.downloadVcf")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={verifyVcardUrl}
                  >
                    <ShieldCheck className="size-3.5" />
                    {t("dash.publicUrls.verifyUrl")}
                  </Button>
                </div>
              </div>
              <ul
                dir="ltr"
                className="max-h-56 divide-y divide-border/40 overflow-auto rounded-lg bg-background/60 font-mono text-[11px] leading-relaxed"
              >
                {vcardText.split(/\r?\n/).filter(Boolean).map((line, i) => {
                  const idx = line.indexOf(":");
                  const rawKey = idx > 0 ? line.slice(0, idx) : line;
                  const value = idx > 0 ? line.slice(idx + 1) : "";
                  // Field name may include params (e.g. TEL;TYPE=CELL) — copy full line for those.
                  const fieldName = rawKey.split(";")[0];
                  const copyable = idx > 0 ? value : line;
                  const copyKey = `vcard-${i}`;
                  const isCopied = copied === copyKey;
                  return (
                    <li
                      key={copyKey}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30"
                    >
                      <span className="min-w-0 flex-1 break-all text-foreground/80">
                        <span className="text-primary">{rawKey}</span>
                        {idx > 0 && (
                          <>
                            <span className="text-muted-foreground">:</span>
                            <span className="text-foreground/90">{value}</span>
                          </>
                        )}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 shrink-0"
                        aria-label={t("dash.publicUrls.copyFieldAria").replace("{field}", fieldName)}
                        title={t("dash.publicUrls.copyFieldAria").replace("{field}", fieldName)}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(copyable);
                            setCopied(copyKey);
                            toast.success(t("dash.publicUrls.toastCopiedField").replace("{field}", fieldName), {
                              description: copyable,
                            });
                            setTimeout(
                              () => setCopied((c) => (c === copyKey ? null : c)),
                              1600,
                            );
                          } catch {
                            toast.error(t("dash.publicUrls.errCopyFailed"));
                          }
                        }}
                      >
                        {isCopied ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <textarea
                ref={vcardSourceRef}
                value={vcardText}
                readOnly
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("dash.publicUrls.urlAlwaysUses")}{" "}
                <span dir="ltr" className="font-mono">{domain}</span>
              </p>
            </div>
          )}
          </>
        )}
      </div>
    </PanelCard>
  );
}