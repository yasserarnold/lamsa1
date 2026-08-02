import type { Database } from "@/integrations/supabase/types";

/** Canonical row types (source of truth = generated Supabase schema). */
export type CardStatus = Database["public"]["Enums"]["card_status"];
export type CardEventType = Database["public"]["Enums"]["card_event_type"];

export type CardRow = Database["public"]["Tables"]["nfc_cards"]["Row"];

/** Server returns a projection — keep in sync with `listMyCardEvents`. */
export type CardEventRow = Pick<
  Database["public"]["Tables"]["card_events"]["Row"],
  "id" | "card_id" | "card_uid" | "event_type" | "metadata" | "created_at"
>;

export type WriteMode = "url" | "vcard";

/** Metadata shape written by `markCardWritten` — narrow at the read site. */
export type WrittenEventMeta = {
  status?: "success" | "failed";
  mode?: WriteMode;
  bytes?: number | null;
  message?: string | null;
};

export type MarkWriteInput = {
  id: string;
  mode?: WriteMode;
  status: "success" | "failed";
  bytes?: number;
  message?: string;
};