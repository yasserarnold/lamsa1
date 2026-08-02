export const STATUS_LABEL_KEY: Record<string, "admin.status.active" | "admin.status.disabled" | "admin.status.unassigned"> = {
  active: "admin.status.active",
  disabled: "admin.status.disabled",
  unassigned: "admin.status.unassigned",
};

export function normalizeUid(uid: string) {
  return uid.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
}

export function fmtDate(d: string | null, locale = "ar-EG") {
  return d ? new Date(d).toLocaleString(locale) : "—";
}

export type CardRow = {
  id: string;
  card_uid: string;
  status: string;
  is_official: boolean;
  profile_id: string | null;
  activated_at: string | null;
  last_written_at: string | null;
  created_at: string;
  profile_username: string | null;
  profile_full_name: string | null;
};

export type AdminAction = {
  id: string;
  action: string;
  created_at: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
};

export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const body = rows.map((r) => r.map(escape).join(",")).join("\n");
  const csv = `\ufeff${header.join(",")}\n${body}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}