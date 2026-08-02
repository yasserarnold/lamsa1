import { throwSupabase } from "@/lib/server-errors";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function demoProfilePayload() {
  const now = new Date().toISOString();
  return {
    profile: {
      id: "00000000-0000-0000-0000-000000000000",
      username: "demo",
      full_name: "أحمد الديمو",
      title: "مدير تسويق — لمسة",
      bio: "هذا بروفايل تجريبي لعرض إمكانيات المنصة. جرّب الأزرار وأضف بياناتك في نموذج التواصل.",
      avatar_url: null,
      cover_url: null,
      theme: null,
      language: "ar",
      updated_at: now,
      avatar_signed_url: null,
      cover_signed_url: null,
    },
    links: [
      { id: "d1", type: "phone", label: "اتصل بي", value: "+201000000000", position: 1 },
      { id: "d2", type: "email", label: "راسلني", value: "demo@karoti.app", position: 2 },
      { id: "d3", type: "website", label: "موقعي", value: "https://karoti.app", position: 3 },
      { id: "d4", type: "whatsapp", label: "واتساب", value: "+201000000000", position: 4 },
      { id: "d5", type: "instagram", label: "انستغرام", value: "https://instagram.com/karoti", position: 5 },
      { id: "d6", type: "linkedin", label: "لينكدإن", value: "https://linkedin.com/in/karoti", position: 6 },
      { id: "d7", type: "x", label: "إكس", value: "https://x.com/karoti", position: 7 },
      { id: "d8", type: "youtube", label: "يوتيوب", value: "https://youtube.com/@karoti", position: 8 },
      { id: "d9", type: "map", label: "الموقع", value: "https://maps.google.com/?q=Cairo", position: 9 },
      { id: "d10", type: "instapay", label: "انستاباي", value: "karoti", position: 10 },
    ],
  };
}

function serverPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isNewKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Fetch published profile by username — public. */
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ username: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const supa = serverPublicClient();
    // Read from the safe view — moderation columns are not exposed there.
    const { data: profile, error } = await supa
      .from("profiles_public" as never)
      .select("id, username, full_name, title, bio, avatar_url, cover_url, theme, language, updated_at")
      .eq("username", data.username)
      .maybeSingle<{
        id: string;
        username: string | null;
        full_name: string | null;
        title: string | null;
        bio: string | null;
        avatar_url: string | null;
        cover_url: string | null;
        theme: string | null;
        language: string;
        updated_at: string;
      }>();
    if (error) throwSupabase(error, "profile");
    if (!profile) {
      if (data.username === "demo") return demoProfilePayload();
      return { profile: null, links: [] as Array<{ id: string; type: string; label: string; value: string; position: number }> };
    }

    const { data: links } = await supa
      .from("profile_links")
      .select("id, type, label, value, position")
      .eq("profile_id", profile.id)
      .eq("is_visible", true)
      .order("position", { ascending: true });

    // Sign avatar / cover via service role — public storage read is disabled.
    const signed: Record<string, string | null> = { avatar_url: null, cover_url: null };
    if (profile.avatar_url || profile.cover_url) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const [field, path] of [["avatar_url", profile.avatar_url], ["cover_url", profile.cover_url]] as const) {
        if (!path) continue;
        const bucket = field === "avatar_url" ? "avatars" : "covers";
        const { data: s } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
        signed[field] = s?.signedUrl ?? null;
      }
    }

    return {
      profile: { ...profile, avatar_signed_url: signed.avatar_url, cover_signed_url: signed.cover_url },
      links: links ?? [],
    };
  });

/** Create a lead against a published profile (public, unauthenticated). */
export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        profile_id: z.string().uuid(),
        name: z.string().trim().min(1, "الاسم مطلوب").max(120),
        mobile: z.string().trim().min(5, "الموبايل مطلوب").max(32),
        interest: z.string().trim().max(300).optional(),
        source_card_uid: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supa = serverPublicClient();
    if (data.profile_id === "00000000-0000-0000-0000-000000000000") {
      // Demo profile — accept silently without persisting.
      return { ok: true as const };
    }
    // Rate limit: 5 submissions / 10 minutes per (profile, IP).
    try {
      const req = getRequest();
      const ip =
        req?.headers.get("cf-connecting-ip") ??
        req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
        _bucket: `lead:${data.profile_id}:${ip}`,
        _max: 5,
        _window_secs: 600,
      });
      if (allowed === false) {
        throw new Error("محاولات كثيرة، جرّب بعد قليل");
      }
    } catch (e) {
      if (e instanceof Error && e.message === "محاولات كثيرة، جرّب بعد قليل") throw e;
      // If the limiter itself fails, do not block the user.
    }
    // Verify profile is published
    const { data: prof } = await supa
      .from("profiles")
      .select("id")
      .eq("id", data.profile_id)
      .eq("is_published", true)
      .maybeSingle();
    if (!prof) throw new Error("البروفايل غير متاح");

    const { error } = await supa.from("leads").insert({
      profile_id: data.profile_id,
      name: data.name,
      mobile: data.mobile,
      interest: data.interest ?? null,
      source_card_uid: data.source_card_uid ?? null,
    });
    if (error) throwSupabase(error, "profile");
    return { ok: true as const };
  });

/** Get current user's profile + owner-side extra fields. */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    let { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throwSupabase(error, "profile");

    // First sign-in (e.g. Google OAuth): bootstrap the profile + default role.
    if (!data) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const meta = (claims as { user_metadata?: Record<string, unknown> } | undefined)?.user_metadata ?? {};
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          full_name: (meta.full_name as string) ?? (meta.name as string) ?? "",
          avatar_url: null,
        },
        { onConflict: "id" },
      );
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "user" }, { onConflict: "user_id,role" });
      const retry = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (retry.error) throwSupabase(retry.error, "profile");
      data = retry.data;
    }


    let avatar_signed_url: string | null = null;
    let cover_signed_url: string | null = null;
    if (data?.avatar_url) {
      const { data: s } = await supabase.storage.from("avatars").createSignedUrl(data.avatar_url, 60 * 60 * 24 * 7);
      avatar_signed_url = s?.signedUrl ?? null;
    }
    if (data?.cover_url) {
      const { data: s } = await supabase.storage.from("covers").createSignedUrl(data.cover_url, 60 * 60 * 24 * 7);
      cover_signed_url = s?.signedUrl ?? null;
    }
    return { profile: data, avatar_signed_url, cover_signed_url };
  });

const usernameRe = /^[a-z0-9_-]{3,32}$/;

function normalizeBase64(input: string) {
  const comma = input.indexOf(",");
  return (comma >= 0 ? input.slice(comma + 1) : input).replace(/\s/g, "");
}

function isRetryableStorageError(err: unknown) {
  const message = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err ?? "");
  return /network|fetch failed|timeout|temporar|تعذّر الاتصال|مؤقت|الخادم|5\d\d|503|502|500|429/i.test(message);
}

async function retryStorageStep<T>(label: string, fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !isRetryableStorageError(err)) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(label);
}

/** Update the current user's profile. */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        username: z
          .string()
          .trim()
          .toLowerCase()
          .regex(usernameRe, "اسم المستخدم: 3-32 حرف صغير أو رقم أو _ أو -")
          .optional()
          .nullable(),
        full_name: z.string().trim().max(120).optional().nullable(),
        title: z.string().trim().max(120).optional().nullable(),
        bio: z.string().trim().max(500).optional().nullable(),
        is_published: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // If username changing, ensure uniqueness manually for a nicer message
    if (data.username) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", data.username)
        .neq("id", userId)
        .maybeSingle();
      if (existing) throw new Error("اسم المستخدم محجوز");
    }
    const { data: updated, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        ...(data.username !== undefined ? { username: data.username } : {}),
        ...(data.full_name !== undefined ? { full_name: data.full_name } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.is_published !== undefined ? { is_published: data.is_published } : {}),
      }, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    if (error) throwSupabase(error, "profile");
    if (!updated) throw new Error("تعذّر تأكيد حفظ بيانات البروفايل");
    return { ok: true as const, profile: updated };
  });

/** Upload an avatar/cover image. Returns storage path. */
export const uploadProfileImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        kind: z.enum(["avatar", "cover"]),
        filename: z.string().min(1).max(200),
        mime: z.string().regex(/^image\/(png|jpe?g|webp)$/i, "الصيغة يجب أن تكون PNG أو JPG أو WebP"),
        base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const bucket = data.kind === "avatar" ? "avatars" : "covers";
    const base64 = normalizeBase64(data.base64);
    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("الحد الأقصى 5 ميجابايت");
    if (bytes.byteLength === 0) throw new Error("ملف الصورة فارغ أو غير صالح");

    const extFromName = (data.filename.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const extFromMime = data.mime.toLowerCase().includes("png") ? "png" : data.mime.toLowerCase().includes("webp") ? "webp" : "jpg";
    const ext = extFromName || extFromMime;
    const path = `${userId}/${data.kind}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    try {
      await retryStorageStep("فشل رفع الصورة إلى التخزين", async () => {
        const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
          contentType: data.mime,
          upsert: true,
        });
        if (error) throwSupabase(error, "profile-upload");
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر الاتصال بالتخزين";
      throw new Error(`فشل رفع الصورة: ${message}`);
    }

    const col = data.kind === "avatar" ? "avatar_url" : "cover_url";
    const { data: prev, error: prevErr } = await supabase.from("profiles").select(col).eq("id", userId).maybeSingle();
    if (prevErr) {
      await supabase.storage.from(bucket).remove([path]).catch(() => {});
      throwSupabase(prevErr, "profile-upload");
    }
    const previousPath = (prev as Record<string, string | null> | null)?.[col];
    const patch = data.kind === "avatar" ? { avatar_url: path } : { cover_url: path };

    let verified: ProfileRow;
    try {
      verified = await retryStorageStep("فشل حفظ رابط الصورة في قاعدة البيانات", async () => {
        const { data: updated, error: updErr } = await supabase
          .from("profiles")
          .upsert({ id: userId, ...patch }, { onConflict: "id" })
          .select("*")
          .maybeSingle();
        if (updErr) throwSupabase(updErr, "profile-upload");
        if (!updated || (updated as unknown as Record<string, string | null>)[col] !== path) {
          throw new Error("تم رفع الصورة لكن لم يتم تأكيد حفظها في قاعدة البيانات");
        }
        return updated;
      });

    } catch (err) {
      await supabase.storage.from(bucket).remove([path]).catch(() => {});
      const message = err instanceof Error ? err.message : "تعذّر حفظ رابط الصورة";
      throw new Error(`فشل حفظ الصورة في قاعدة البيانات: ${message}`);
    }

    if (previousPath && previousPath !== path) {
      await supabase.storage.from(bucket).remove([previousPath]).catch(() => {});
    }

    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
    return { ok: true as const, path, signedUrl: signed?.signedUrl ?? null, profile: verified };
  });

/** Get leads count and cards count for dashboard overview. */
export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [leadsRes, cardsRes, linksRes, lastLead, lastEvent] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("profile_id", userId),
      supabase.from("nfc_cards").select("id", { count: "exact", head: true }).eq("profile_id", userId),
      supabase.from("profile_links").select("id", { count: "exact", head: true }).eq("profile_id", userId),
      supabase.from("leads").select("created_at").eq("profile_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("card_events").select("created_at, event_type").eq("profile_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const lastLeadAt = lastLead.data?.created_at ?? null;
    const lastEventAt = lastEvent.data?.created_at ?? null;
    let lastActivity: { at: string; kind: "lead" | "card" } | null = null;
    if (lastLeadAt && (!lastEventAt || lastLeadAt > lastEventAt)) {
      lastActivity = { at: lastLeadAt, kind: "lead" };
    } else if (lastEventAt) {
      lastActivity = { at: lastEventAt, kind: "card" };
    }
    return {
      leads: leadsRes.count ?? 0,
      cards: cardsRes.count ?? 0,
      links: linksRes.count ?? 0,
      lastActivity,
    };
  });

/** Fetch recent leads + recent card events for the dashboard overview panel. */
export const getDashboardRecent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [leadsRes, eventsRes, activeCardsRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, mobile, interest, created_at")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("card_events")
        .select("id, event_type, card_uid, created_at")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("nfc_cards")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", userId)
        .eq("status", "active"),
    ]);
    return {
      leads: leadsRes.data ?? [],
      events: eventsRes.data ?? [],
      activeCards: activeCardsRes.count ?? 0,
    };
  });

/**
 * Per-user visit / QR / share analytics for the dashboard.
 * Counts come from tap_events scoped to the signed-in profile by RLS.
 */
export const getMyTapAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("tap_events")
      .select("event_type, created_at")
      .eq("profile_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw error;

    const rows = data ?? [];
    const dayKey = (iso: string) => iso.slice(0, 10);
    const byDay = new Map<string, number>();
    let views = 0;
    let qr = 0;
    let shares = 0;
    let vcards = 0;
    let links = 0;
    for (const r of rows) {
      if (r.event_type === "view") {
        views += 1;
        byDay.set(dayKey(r.created_at), (byDay.get(dayKey(r.created_at)) ?? 0) + 1);
      } else if (r.event_type === "qr") qr += 1;
      else if (r.event_type === "share") shares += 1;
      else if (r.event_type === "vcard") vcards += 1;
      else links += 1;
    }

    const days: Array<{ day: string; views: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push({ day: d, views: byDay.get(d) ?? 0 });
    }

    return {
      views,
      qr,
      shares,
      vcards,
      links,
      lastEventAt: rows[0]?.created_at ?? null,
      days,
    };
  });
