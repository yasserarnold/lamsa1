import type { TKey } from "@/lib/i18n";

/**
 * Localized labels for NFC card lifecycle events.
 * Kept as a lookup so admin and dashboard views stay in sync.
 */
const EVENT_KEYS: Record<string, TKey> = {
  written: "events.type.written",
  registered: "events.type.registered",
  activated: "events.type.activated",
  deactivated: "events.type.deactivated",
  deleted: "events.type.deleted",
};

export function eventLabel(t: (k: TKey) => string, type: string): string {
  const key = EVENT_KEYS[type];
  return key ? t(key) : type;
}
