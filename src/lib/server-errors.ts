/**
 * Translate raw Supabase / PostgREST / Postgres errors into Arabic messages
 * safe to surface to end-users. Server functions should call `throwSupabase`
 * instead of `throw new Error(error.message)` so RLS/JWT/unique-violation
 * failures show a helpful line rather than raw SQL text.
 */
export type PgLike = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
} | null | undefined;

const PG_MAP: Record<string, string> = {
  "23505": "هذه القيمة مستخدمة مسبقًا",
  "23503": "لا يمكن تنفيذ العملية: مرجع مرتبط بعناصر أخرى",
  "23502": "حقل مطلوب مفقود",
  "22001": "القيمة أطول من الحد المسموح",
  "22P02": "صيغة القيمة غير صالحة",
  "42501": "لا تملك صلاحية لتنفيذ هذه العملية",
  "42P01": "المصدر غير موجود",
  "PGRST116": "لم يتم العثور على النتيجة",
  "PGRST301": "انتهت صلاحية الجلسة، أعد تسجيل الدخول",
};

export function translateSupabaseError(err: PgLike, fallback = "تعذّر تنفيذ العملية"): string {
  if (!err) return fallback;
  const code = String(err.code ?? "");
  if (code && PG_MAP[code]) return PG_MAP[code];
  const msg = err.message ?? "";
  if (/row-level security|violates row-level/i.test(msg)) return "لا تملك صلاحية للوصول لهذا العنصر";
  if (/JWT|jwt expired|invalid token/i.test(msg)) return "انتهت صلاحية الجلسة، أعد تسجيل الدخول";
  if (/duplicate key|unique constraint/i.test(msg)) return "هذه القيمة مستخدمة مسبقًا";
  if (/foreign key/i.test(msg)) return "لا يمكن تنفيذ العملية: مرجع مرتبط بعناصر أخرى";
  if (/permission denied/i.test(msg)) return "لا تملك صلاحية لتنفيذ هذه العملية";
  if (/network|fetch failed|ENOTFOUND|ECONNRESET/i.test(msg)) return "تعذّر الاتصال بالخادم، تحقق من الإنترنت";
  return msg?.trim() || fallback;
}

/**
 * Throw a friendly Arabic Error if `err` is truthy. Typed as an assertion
 * so callers get proper narrowing (`throwSupabase(error)` narrows `error`
 * to null/undefined afterwards, same as `if (error) throw ...`).
 */
export function throwSupabase(err: PgLike, scope = "operation"): asserts err is null | undefined {
  if (!err) return;
  const translated = translateSupabaseError(err, "تعذّر تنفيذ العملية");
  const e = new Error(translated) as Error & { cause?: unknown; scope?: string };
  e.scope = scope;
  e.cause = err;
  throw e;
}

/**
 * Wrap a server-function handler body so any thrown error is normalised to
 * an Arabic-friendly message before crossing the RPC boundary.
 */
export async function wrapServerHandler<T>(scope: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Pass Errors we already threw through unchanged.
    if (err instanceof Error && !(err as { code?: string }).code) throw err;
    const translated = translateSupabaseError(err as PgLike, "تعذّر تنفيذ العملية");
    const wrapped = new Error(translated) as Error & { cause?: unknown; scope?: string };
    wrapped.scope = scope;
    wrapped.cause = err;
    throw wrapped;
  }
}