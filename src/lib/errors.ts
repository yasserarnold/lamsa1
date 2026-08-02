import { toast } from "sonner";
import { reportError, type ErrorContext } from "./reporting";

export type { ErrorContext } from "./reporting";

/**
 * Central error helpers — Arabic-first, user-facing messages.
 * Keep this file free of framework imports so it works on server + client.
 */

type AnyErr = unknown;

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function extractMessage(err: AnyErr): string | undefined {
  if (!err) return undefined;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    return (
      pickString(o.message) ||
      pickString((o.error as { message?: string } | undefined)?.message) ||
      pickString(o.error_description as string | undefined) ||
      pickString(o.hint as string | undefined) ||
      pickString(o.details as string | undefined)
    );
  }
  return undefined;
}

function isNetworkError(msg: string): boolean {
  return /failed to fetch|network ?error|networkerror|load failed|net::err|econnrefused|econnreset|fetch failed/i.test(
    msg,
  );
}

/** True when the error looks like a transient network / 5xx / timeout failure. */
export function isTransient(err: unknown): boolean {
  const msg = extractMessage(err) ?? "";
  if (isNetworkError(msg)) return true;
  if (/timeout|timed out|ETIMEDOUT|temporarily unavailable/i.test(msg)) return true;
  const status =
    (err as { status?: number } | null)?.status ??
    (err as { statusCode?: number } | null)?.statusCode;
  if (typeof status === "number" && (status === 408 || status === 429 || status >= 500)) {
    return true;
  }
  // AbortError from fetch cancellation isn't retryable.
  const name = (err as { name?: string } | null)?.name;
  if (name === "AbortError") return false;
  return false;
}

/** Map common backend / auth / postgres messages to Arabic-friendly text. */
function mapKnown(msg: string): string | undefined {
  const m = msg.trim();

  // Auth / session
  if (/invalid login credentials/i.test(m)) return "بيانات الدخول غير صحيحة";
  if (/email not confirmed/i.test(m)) return "لم يتم تفعيل البريد الإلكتروني بعد";
  if (/user already registered|already exists/i.test(m))
    return "الحساب موجود بالفعل — سجّل الدخول";
  if (/password.*(should|at least|characters)/i.test(m))
    return "كلمة المرور قصيرة جدًا (٦ أحرف على الأقل)";
  if (/rate limit|too many requests/i.test(m))
    return "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة";
  if (/^unauthorized$|no authorization header|jwt expired|invalid jwt/i.test(m))
    return "انتهت الجلسة — سجّل الدخول من جديد";
  if (/forbidden|صلاحيات غير كافية/i.test(m)) return "لا تملك صلاحية لهذا الإجراء";

  // Postgres / PostgREST
  if (/row-level security|permission denied|42501/i.test(m))
    return "غير مسموح بهذا الإجراء (سياسة الوصول)";
  if (/duplicate key|unique.*violat|23505/i.test(m))
    return "هذه القيمة مستخدمة من قبل";
  if (/foreign key|23503/i.test(m)) return "توجد بيانات مرتبطة تمنع هذا الإجراء";
  if (/not.?null.*violat|23502/i.test(m)) return "حقل مطلوب مفقود";
  if (/PGRST116|Results contain 0 rows/i.test(m)) return "لا توجد نتائج";

  // Network
  if (isNetworkError(m)) return "تعذّر الاتصال بالخادم — تحقق من الإنترنت";

  return undefined;
}

/** Return a user-facing Arabic string for any thrown value. */
export function formatError(err: AnyErr, fallback = "حدث خطأ غير متوقع"): string {
  const raw = extractMessage(err);
  if (!raw) return fallback;
  const mapped = mapKnown(raw);
  if (mapped) return mapped;
  // Already Arabic or short enough? keep it.
  if (/[\u0600-\u06FF]/.test(raw) || raw.length <= 140) return raw;
  return fallback;
}

/** Show a sonner toast for any error and forward it to reporting with context. */
export function toastError(err: AnyErr, fallback?: string, ctx: ErrorContext = {}): void {
  reportError(err, { op: ctx.op ?? "toastError", ...ctx });
  toast.error(formatError(err, fallback));
}

/** NFC operation kind — used to tailor the guidance message. */
export type NfcOp = "scan" | "write" | "read" | "generic";

export type NfcErrorInfo = {
  title: string;
  hint: string;
  /** DOMException.name or best-effort classification. */
  code: string;
};

/**
 * Translate Web NFC / DOMException failures to Arabic guidance with a
 * concrete "what to do next" hint for the user.
 */
export function describeNfcError(
  err: AnyErr,
  op: NfcOp = "generic",
  fallback = "فشل الاتصال بالبطاقة",
): NfcErrorInfo {
  const name =
    err instanceof DOMException
      ? err.name
      : (err as { name?: string } | null)?.name ?? "UnknownError";

  const OP: Record<NfcOp, string> = {
    scan: "المسح",
    write: "الكتابة",
    read: "القراءة",
    generic: "العملية",
  };
  const opAr = OP[op];

  switch (name) {
    case "NotAllowedError":
      return {
        code: name,
        title: `تم رفض إذن NFC أثناء ${opAr}`,
        hint: "افتح إعدادات الموقع في المتصفح واسمح بصلاحية NFC، ثم أعد المحاولة.",
      };
    case "NotSupportedError":
      return {
        code: name,
        title: "NFC غير مدعوم على هذا الجهاز",
        hint: "استخدم Chrome أو Edge على هاتف أندرويد يدعم NFC. iOS Safari لا يدعم Web NFC.",
      };
    case "NotReadableError":
      return {
        code: name,
        title: `تعذّرت ${op === "write" ? "الكتابة على" : "قراءة"} البطاقة`,
        hint: "قرّب البطاقة من الجزء الخلفي/العلوي للهاتف ببطء، وثبّتها حتى تنتهي العملية.",
      };
    case "NetworkError":
      return {
        code: name,
        title: `انقطع الاتصال بالبطاقة أثناء ${opAr}`,
        hint: "لا تحرّك البطاقة قبل انتهاء العملية. حاول مرة أخرى.",
      };
    case "AbortError":
      return {
        code: name,
        title: "تم إلغاء العملية",
        hint: "أعد الضغط على الزر عندما تكون مستعدًا لتقريب البطاقة.",
      };
    case "InvalidStateError":
      return {
        code: name,
        title: "خاصية NFC غير مفعّلة",
        hint: "فعّل NFC من إعدادات الهاتف (الاتصال والمشاركة)، ثم حاول مجددًا.",
      };
    case "SecurityError":
      return {
        code: name,
        title: "المتصفح رفض الوصول لـ NFC",
        hint: "افتح الموقع عبر HTTPS، وتأكد أنك في نافذة رئيسية (ليست iframe).",
      };
    case "TimeoutError":
      return {
        code: name,
        title: `انتهت مهلة ${opAr}`,
        hint: "قد تكون البطاقة بعيدة أو تحرّكت. حاول مرة أخرى مع تثبيتها.",
      };
    case "TypeError":
      return {
        code: name,
        title: `تعذّر إعداد ${opAr}`,
        hint:
          op === "write"
            ? "البيانات المرسلة كبيرة أو غير صالحة. جرّب وضع URL بدل vCard إن ظهرت مجددًا."
            : "تحقّق من دعم المتصفح للعملية.",
      };
    default:
      return {
        code: name,
        title: formatError(err, fallback),
        hint: "قرّب البطاقة، تأكّد من تفعيل NFC، ثم أعد المحاولة.",
      };
  }
}

/** Toast wrapper specialised for NFC operations. */
export function toastNfcError(
  err: AnyErr,
  fallback?: string,
  ctxOrOp: NfcOp | (ErrorContext & { op?: NfcOp | string }) = "generic",
): void {
  const op: NfcOp =
    typeof ctxOrOp === "string" ? ctxOrOp : ((ctxOrOp.op as NfcOp) ?? "generic");
  const info = describeNfcError(err, op, fallback);
  const ctx: ErrorContext =
    typeof ctxOrOp === "string" ? { op: `nfc.${op}` } : { ...ctxOrOp, op: ctxOrOp.op ?? `nfc.${op}` };
  reportError(err, {
    ...ctx,
    tags: { ...(ctx.tags ?? {}), nfc_code: info.code, nfc_op: op },
  });
  toast.error(info.title, { description: info.hint });
}

/* -------------------------------------------------------------------------- */
/* Retry helper                                                                */
/* -------------------------------------------------------------------------- */

export type RetryOptions = {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Base delay in ms; each retry waits baseMs * 2^(attempt-1). Default 400. */
  baseMs?: number;
  /** Cap on any single wait. Default 4000. */
  maxDelayMs?: number;
  /** Called before each retry (not before the first attempt). */
  onRetry?: (info: { attempt: number; attempts: number; error: unknown; nextDelayMs: number }) => void;
  /** Override transient classifier. */
  shouldRetry?: (err: unknown) => boolean;
  /** AbortSignal to cancel further retries. */
  signal?: AbortSignal;
};

/**
 * Run an async operation with exponential-backoff retries on transient
 * network/5xx/timeout failures. Non-transient errors are re-thrown immediately.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseMs = opts.baseMs ?? 400;
  const maxDelayMs = opts.maxDelayMs ?? 4000;
  const shouldRetry = opts.shouldRetry ?? isTransient;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new DOMException("Aborted", "AbortError");
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const canRetry = attempt < attempts && shouldRetry(err);
      if (!canRetry) throw err;
      const delay = Math.min(maxDelayMs, baseMs * 2 ** (attempt - 1));
      opts.onRetry?.({ attempt, attempts, error: err, nextDelayMs: delay });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, delay);
        opts.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(t);
            reject(opts.signal!.reason ?? new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    }
  }
  throw lastErr;
}

/**
 * Run an async op with retries, and only call toastError after all attempts
 * fail. Shows an informative retry toast on each attempt after the first.
 */
export async function runWithRetryToast<T>(
  fn: (attempt: number) => Promise<T>,
  ctx: ErrorContext & { fallback?: string; retry?: RetryOptions } = {},
): Promise<T | undefined> {
  const { fallback, retry, ...errCtx } = ctx;
  try {
    return await withRetry(fn, {
      ...(retry ?? {}),
      onRetry: (info) => {
        toast.message("جارٍ إعادة المحاولة…", {
          description: `المحاولة ${info.attempt + 1} من ${info.attempts}`,
        });
        retry?.onRetry?.(info);
      },
    });
  } catch (err) {
    toastError(err, fallback, {
      ...errCtx,
      tags: { ...(errCtx.tags ?? {}), retried: (retry?.attempts ?? 3) },
    });
    return undefined;
  }
}
