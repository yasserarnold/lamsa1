/**
 * Arabic locale-aware date formatters shared across dashboard and admin views.
 * Extracted from inline helpers to keep formatting consistent.
 */

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`;
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

export function formatArDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG");
}