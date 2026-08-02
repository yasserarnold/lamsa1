import { throwSupabase } from "@/lib/server-errors";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnySupabaseClient = any;

function normalizeUid(raw: string) {
  return raw.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
}

async function logEvent(
  supabase: {
    from: (t: string) => {
      insert: (v: unknown) => Promise<{ error: unknown }>;
    };
  },
  profileId: string,
  cardId: string | null,
  cardUid: string,
  eventType: "activated" | "written" | "deactivated" | "deleted" | "registered",
  metadata?: Record<string, unknown>,
) {
  await supabase.from("card_events").insert({
    profile_id: profileId,
    card_id: cardId,
    card_uid: cardUid,
    event_type: eventType,
    metadata: metadata ?? null,
  });
}

export const listMyCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("nfc_cards")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false });
    if (error) throwSupabase(error, "cards");
    return data ?? [];
  });

/** Claim an official card by scanning its UID. Uses claim_official_card RPC. */
export const claimCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ uid: z.string().min(4).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: AnySupabaseClient };
    const normalized = normalizeUid(data.uid);
    if (!/^[0-9A-F]{8,32}$/.test(normalized)) {
      throw new Error("صيغة UID غير صحيحة");
    }
    const { data: card, error } = await supabase.rpc("claim_official_card", {
      _uid: normalized,
    });
    if (error) throwSupabase(error, "cards");
    if (card && typeof card === "object" && "id" in card) {
      await logEvent(
        supabase as never,
        (card as { profile_id: string }).profile_id,
        (card as { id: string }).id,
        normalized,
        "activated",
        { official: true },
      );
    }
    return card;
  });

/** Register a self-owned (unofficial) card. */
export const registerCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ uid: z.string().min(4).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Restricted to admins only. Regular users see the same message as an
    // unrecognized card so we never leak that "self-registration" exists.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      throw new Error("البطاقة غير مسجلة بالنظام لدينا");
    }
    const normalized = normalizeUid(data.uid);
    if (!/^[0-9A-F]{8,32}$/.test(normalized)) {
      throw new Error("صيغة UID غير صحيحة");
    }
    // Reject if already exists
    const { data: existing } = await supabase
      .from("nfc_cards")
      .select("id, profile_id, is_official")
      .eq("card_uid", normalized)
      .maybeSingle();
    if (existing) {
      if (existing.is_official) throw new Error("هذه بطاقة رسمية — استخدم زر التفعيل");
      throw new Error("هذه البطاقة مسجّلة بالفعل");
    }
    const { data: created, error } = await supabase
      .from("nfc_cards")
      .insert({
        card_uid: normalized,
        profile_id: userId,
        is_official: false,
        status: "active",
        activated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throwSupabase(error, "cards");
    await logEvent(supabase as never, userId, created.id, normalized, "registered", { official: false });
    return created;
  });

export const markCardWritten = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        mode: z.enum(["url", "vcard"]).optional(),
        status: z.enum(["success", "failed"]).default("success"),
        message: z.string().max(500).optional(),
        bytes: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only bump last_written_at on success.
    let cardRow: { id: string; card_uid: string } | null = null;
    if (data.status === "success") {
      const { data: updated, error } = await supabase
        .from("nfc_cards")
        .update({ last_written_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("profile_id", userId)
        .select("id, card_uid")
        .single();
      if (error) throwSupabase(error, "cards");
      cardRow = updated;
    } else {
      const { data: found } = await supabase
        .from("nfc_cards")
        .select("id, card_uid")
        .eq("id", data.id)
        .eq("profile_id", userId)
        .maybeSingle();
      cardRow = found ?? null;
    }
    if (!cardRow) throw new Error("البطاقة غير موجودة");
    await logEvent(supabase as never, userId, cardRow.id, cardRow.card_uid, "written", {
      status: data.status,
      mode: data.mode ?? null,
      bytes: data.bytes ?? null,
      message: data.message ?? null,
    });
    return { ok: true as const };
  });

export const toggleCardStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const nextStatus = data.enabled ? "active" : "disabled";
    const { data: updated, error } = await supabase
      .from("nfc_cards")
      .update({ status: nextStatus })
      .eq("id", data.id)
      .eq("profile_id", userId)
      .select("id, card_uid")
      .single();
    if (error) throwSupabase(error, "cards");
    await logEvent(
      supabase as never,
      userId,
      updated.id,
      updated.card_uid,
      data.enabled ? "activated" : "deactivated",
    );
    return { ok: true as const };
  });

export const deleteMyCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only allow deleting non-official cards; official ones detach
    const { data: card } = await supabase
      .from("nfc_cards")
      .select("id, is_official, card_uid")
      .eq("id", data.id)
      .eq("profile_id", userId)
      .maybeSingle();
    if (!card) throw new Error("البطاقة غير موجودة");
    if (card.is_official) {
      const { error } = await supabase
        .from("nfc_cards")
        .update({ profile_id: null, status: "unassigned" })
        .eq("id", card.id);
      if (error) throwSupabase(error, "cards");
      await logEvent(supabase as never, userId, card.id, card.card_uid, "deactivated", { detached: true });
      return { ok: true as const, detached: true };
    }
    const { error } = await supabase.from("nfc_cards").delete().eq("id", card.id);
    if (error) throwSupabase(error, "cards");
    await logEvent(supabase as never, userId, null, card.card_uid, "deleted");
    return { ok: true as const, detached: false };
  });

export const listMyCardEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("card_events")
      .select("id, card_id, card_uid, event_type, metadata, created_at")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throwSupabase(error, "cards");
    return data ?? [];
  });

/** Full history (up to 1000) for the NFC event log page. */
export const listAllMyCardEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("card_events")
      .select("id, card_id, card_uid, event_type, metadata, created_at")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throwSupabase(error, "cards");
    return data ?? [];
  });