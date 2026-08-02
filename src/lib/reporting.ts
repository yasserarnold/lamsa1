/**
 * Error reporting facade.
 *
 * Default: console + existing Lovable error report.
 * If VITE_SENTRY_DSN is set at build time, Sentry Browser is initialised
 * lazily on first client-side use and receives structured context.
 *
 * Server-safe: no side effects at import time; all init happens inside
 * initReporting() which must be called from the browser.
 */
import { reportLovableError } from "./lovable-error-reporting";

export type ErrorContext = {
  /** Logical area: "nfc.write", "server-fn:getMyProfile", "form:contact"… */
  op?: string;
  /** Route path (e.g. "/dashboard/cards"). */
  route?: string;
  /** User id when known — never PII. */
  userId?: string;
  /** Free-form structured tags for filtering (mode, cardUid last-4, retries…). */
  tags?: Record<string, string | number | boolean | undefined>;
  /** Additional non-searchable payload. */
  extra?: Record<string, unknown>;
};

type SentryLike = {
  captureException: (err: unknown, hint?: { tags?: Record<string, string>; extra?: Record<string, unknown> }) => void;
  setUser: (u: { id?: string } | null) => void;
  init: (opts: Record<string, unknown>) => void;
};

let sentry: SentryLike | null = null;
let initPromise: Promise<void> | null = null;
let pendingUserId: string | null | undefined = undefined;

function getDsn(): string | undefined {
  try {
    return (import.meta as { env?: Record<string, string> }).env?.VITE_SENTRY_DSN;
  } catch {
    return undefined;
  }
}

export function initReporting(): void {
  if (typeof window === "undefined") return;
  if (initPromise) return;
  const dsn = getDsn();
  if (!dsn) return;
  initPromise = import("@sentry/react")
    .then((mod) => {
      const S = mod as unknown as SentryLike;
      S.init({
        dsn,
        environment: (import.meta as { env?: Record<string, string> }).env?.MODE ?? "production",
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        // Don't capture noisy expected redirects/aborts.
        beforeSend(event: { exception?: { values?: Array<{ type?: string; value?: string }> } }) {
          const first = event.exception?.values?.[0];
          const name = first?.type ?? "";
          const msg = first?.value ?? "";
          if (name === "AbortError" || /redirect|not_?found/i.test(msg)) return null;
          return event;
        },
      });
      sentry = S;
      // Flush any user id set before the SDK finished loading.
      if (pendingUserId !== undefined) {
        S.setUser(pendingUserId ? { id: pendingUserId } : null);
        pendingUserId = undefined;
      }
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.warn("[reporting] Sentry init failed", e);
    });
}

export function setReportingUser(userId: string | null): void {
  if (!sentry) {
    // Buffer until the lazy Sentry import resolves; then initReporting flushes.
    pendingUserId = userId;
    return;
  }
  sentry.setUser(userId ? { id: userId } : null);
}

function toStringTags(tags?: ErrorContext["tags"]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!tags) return out;
  for (const [k, v] of Object.entries(tags)) {
    if (v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

/** Report an error to console + Lovable + Sentry (if initialised). */
export function reportError(err: unknown, ctx: ErrorContext = {}): void {
  const tags = toStringTags(ctx.tags);
  const route =
    ctx.route ??
    (typeof window !== "undefined" ? window.location?.pathname : undefined);
  const enrichedTags = { ...tags };
  if (ctx.op) enrichedTags.op = ctx.op;
  if (route) enrichedTags.route = route;

  // eslint-disable-next-line no-console
  console.error(`[error${ctx.op ? `:${ctx.op}` : ""}]`, err, {
    ...ctx,
    route,
  });

  try {
    reportLovableError(err, { ...ctx, route });
  } catch {
    /* ignore reporter failures */
  }

  if (sentry) {
    sentry.captureException(err, {
      tags: enrichedTags,
      extra: {
        userId: ctx.userId,
        ...(ctx.extra ?? {}),
      },
    });
  }
}
/**
 * Capture React hydration mismatches (they only surface via console.error /
 * onRecoverableError, never as thrown exceptions).
 */
let hydrationCaptureInstalled = false;
const HYDRATION_RE = /hydrat|did ?n[o']t match|server rendered HTML/i;

export function reportHydrationIssue(err: unknown, extra?: Record<string, unknown>): void {
  reportError(err instanceof Error ? err : new Error(String(err)), {
    op: "react.hydration",
    tags: { kind: "hydration" },
    extra,
  });
}

export function installHydrationErrorCapture(): void {
  if (typeof window === "undefined" || hydrationCaptureInstalled) return;
  hydrationCaptureInstalled = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const text = args
        .map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : ""))
        .join(" ");
      if (HYDRATION_RE.test(text)) {
        const err = args.find((a) => a instanceof Error) as Error | undefined;
        reportHydrationIssue(err ?? new Error(text.slice(0, 300)), {
          route: window.location?.pathname,
        });
      }
    } catch {
      /* never break console */
    }
    original(...(args as []));
  };
}

/** Report an auth-flow failure (sign in / sign up / OAuth). */
export function reportAuthError(err: unknown, step: string, extra?: Record<string, unknown>): void {
  reportError(err, { op: `auth.${step}`, tags: { area: "auth", step }, extra });
}
