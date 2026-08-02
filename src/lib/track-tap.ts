import { supabase } from "@/integrations/supabase/client";

// Map a link "type" to the tap_event_type enum in the database.
// Unknown types fall back to the generic "link" bucket.
export function tapEventTypeFor(linkType: string): string {
  const t = linkType.toLowerCase();
  if (t === "phone") return "call";
  if (t === "email") return "email";
  if (t === "website") return "website";
  if (t === "whatsapp") return "whatsapp";
  return "link";
}

/**
 * Fire-and-forget insert into tap_events for a profile link click.
 * Uses sendBeacon-style non-blocking insert so the link navigation is
 * never delayed. Failures are swallowed on purpose — analytics must
 * never break user navigation.
 */
export function trackLinkTap(args: {
  profileId: string;
  linkId: string;
  linkType: string;
}): void {
  try {
    void supabase.from("tap_events").insert({
      profile_id: args.profileId,
      link_id: args.linkId,
      event_type: tapEventTypeFor(args.linkType) as
        | "call"
        | "email"
        | "website"
        | "whatsapp"
        | "link",
      meta: { link_type: args.linkType },
    });
  } catch {
    // ignore — analytics is best-effort
  }
}

type SimpleEvent = "view" | "qr" | "share" | "vcard";

function insertEvent(profileId: string, type: SimpleEvent, meta?: Record<string, string | number | boolean | null>) {
  try {
    void supabase.from("tap_events").insert({
      profile_id: profileId,
      event_type: type,
      meta: (meta ?? null) as never,
    });
  } catch {
    // analytics is best-effort
  }
}

/**
 * Count a profile page visit once per browser session per profile,
 * so refreshes / client navigations don't inflate the numbers.
 */
export function trackProfileView(profileId: string, username?: string | null): void {
  if (typeof window === "undefined") return;
  const key = `lamsa:viewed:${profileId}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // private mode — still count the view
  }
  insertEvent(profileId, "view", { username: username ?? null, referrer: document.referrer || null });
}

/** QR code shown / downloaded for this profile. */
export function trackQrShare(profileId: string, action: "open" | "download" | "copy"): void {
  insertEvent(profileId, "qr", { action });
}

/** Native share / link copy of the profile URL. */
export function trackShare(profileId: string, method: "native" | "copy"): void {
  insertEvent(profileId, "share", { method });
}

/** vCard download. */
export function trackVCard(profileId: string): void {
  insertEvent(profileId, "vcard");
}
