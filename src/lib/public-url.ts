/**
 * Canonical public site URL for shareable links (profile QR, NFC write,
 * copy-link, vCard URL).
 *
 * Priority:
 *   1) VITE_PUBLIC_SITE_URL env — explicit override (set only if you want
 *      to force a specific domain regardless of where the app is served).
 *   2) window.location.origin when NOT running on a Lovable preview/editor
 *      host — this auto-follows whichever custom domain the site is served
 *      from, so changing the connected domain "just works".
 *   3) When on a preview/editor host with no override, fall back to the current
 *      published Lovable URL so shared links don't leak the preview subdomain.
 */
const PUBLISHED_FALLBACK = "https://krotak.lovable.app";

function isPreviewHost(origin: string): boolean {
  return /lovableproject\.com|lovable\.dev|id-preview--/.test(origin);
}

export function getPublicSiteUrl(): string {
  // Test/runtime override: set `globalThis.__PUBLIC_SITE_URL__` to force a
  // specific canonical origin regardless of build-time env inlining.
  const runtimeOverride = (globalThis as { __PUBLIC_SITE_URL__?: string })
    .__PUBLIC_SITE_URL__;
  const envUrl =
    runtimeOverride ??
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (!isPreviewHost(origin)) return origin;
  }
  return PUBLISHED_FALLBACK;
}

export function publicProfileUrl(username: string): string {
  return `${getPublicSiteUrl()}/u/${username}`;
}

export type PublicUrlDiagnostic =
  | { level: "ok"; source: "override" | "origin"; url: string }
  | {
      level: "warn" | "error";
      code:
        | "invalid_override"
        | "missing_on_preview"
        | "fallback_used";
      url: string;
      message: string;
      hint: string;
    };

/**
 * Diagnose the current public URL configuration. Called once on client boot
 * so misconfiguration surfaces before it produces wrong QR/NFC/vCard links.
 */
export function diagnosePublicSiteUrl(): PublicUrlDiagnostic {
  const runtimeOverride = (globalThis as { __PUBLIC_SITE_URL__?: string })
    .__PUBLIC_SITE_URL__;
  const envUrl =
    runtimeOverride ??
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_PUBLIC_SITE_URL;

  const hintFix =
    'أضِف في ملف .env السطر: VITE_PUBLIC_SITE_URL=https://your-domain.com ثم أعِد تشغيل الخادم. (بديلاً: اربط الدومين المخصص وافتح الموقع من عليه فيتم اكتشافه تلقائيًا.)';

  if (envUrl) {
    try {
      const u = new URL(envUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        throw new Error("bad protocol");
      }
      return { level: "ok", source: "override", url: u.origin };
    } catch {
      return {
        level: "error",
        code: "invalid_override",
        url: envUrl,
        message: `VITE_PUBLIC_SITE_URL يحتوي على قيمة غير صالحة: "${envUrl}"`,
        hint: hintFix,
      };
    }
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (!isPreviewHost(origin)) {
      return { level: "ok", source: "origin", url: origin };
    }
    return {
      level: "warn",
      code: "missing_on_preview",
      url: PUBLISHED_FALLBACK,
      message: `VITE_PUBLIC_SITE_URL غير مضبوط، وأنت تعمل على دومين المعاينة. سيتم استخدام ${PUBLISHED_FALLBACK} لروابط QR/NFC/vCard.`,
      hint: hintFix,
    };
  }

  return {
    level: "warn",
    code: "fallback_used",
    url: PUBLISHED_FALLBACK,
    message: `VITE_PUBLIC_SITE_URL غير مضبوط. سيتم استخدام ${PUBLISHED_FALLBACK} كافتراضي.`,
    hint: hintFix,
  };
}

let didAudit = false;
/**
 * Emit a one-time console + (dev) toast about public URL configuration.
 * Errors surface in both dev and prod; warnings only in dev to avoid noise
 * for end users. Safe to call multiple times — de-duplicated per session.
 */
export function auditPublicSiteUrl(
  toast?: {
    error: (msg: string, opts?: { description?: string }) => void;
    warning?: (msg: string, opts?: { description?: string }) => void;
  },
): PublicUrlDiagnostic {
  const result = diagnosePublicSiteUrl();
  if (didAudit) return result;
  didAudit = true;
  if (result.level === "ok") return result;

  const isDev =
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

  if (result.level === "error") {
    console.error(`[public-url] ${result.message}\n→ ${result.hint}`);
    toast?.error(result.message, { description: result.hint });
  } else if (isDev) {
    console.warn(`[public-url] ${result.message}\n→ ${result.hint}`);
    (toast?.warning ?? toast?.error)?.(result.message, {
      description: result.hint,
    });
  }
  return result;
}

// Test helper — reset the one-shot guard between test cases.
export function __resetPublicUrlAudit() {
  didAudit = false;
}