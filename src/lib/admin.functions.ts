import { throwSupabase } from "@/lib/server-errors";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/server-guards";

function normalizeUid(raw: string) {
  return raw.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
}

/** Check if current user is admin. */
export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) throwSupabase(error, "admin");
    return { isAdmin: Boolean(data) };
  });

/** Bulk import UIDs (admin). Returns per-row status. */
export const bulkImportUids = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        uids: z.array(z.string().min(1).max(64)).min(1).max(5000),
        is_official: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(context);

    type Row = { uid: string; normalized: string; status: "accepted" | "duplicate_input" | "invalid" | "exists" | "error"; reason?: string };
    const results: Row[] = [];
    const seen = new Set<string>();
    const toInsert: string[] = [];

    for (const raw of data.uids) {
      const normalized = normalizeUid(raw);
      if (!/^[0-9A-F]{8,32}$/.test(normalized)) {
        results.push({ uid: raw, normalized, status: "invalid", reason: "HEX 8-32" });
        continue;
      }
      if (seen.has(normalized)) {
        results.push({ uid: raw, normalized, status: "duplicate_input" });
        continue;
      }
      seen.add(normalized);
      toInsert.push(normalized);
      results.push({ uid: raw, normalized, status: "accepted" });
    }

    if (toInsert.length > 0) {
      // Detect existing UIDs
      const { data: existing } = await supabase
        .from("nfc_cards")
        .select("card_uid")
        .in("card_uid", toInsert);
      const existingSet = new Set((existing ?? []).map((r) => r.card_uid));
      for (const row of results) {
        if (row.status === "accepted" && existingSet.has(row.normalized)) {
          row.status = "exists";
          row.reason = "موجودة مسبقًا";
        }
      }
      const fresh = toInsert.filter((u) => !existingSet.has(u));
      if (fresh.length > 0) {
        const rows = fresh.map((u) => ({
          card_uid: u,
          is_official: data.is_official,
          status: "unassigned" as const,
        }));
        const { error } = await supabase.from("nfc_cards").insert(rows);
        if (error) {
          for (const row of results) {
            if (row.status === "accepted") {
              row.status = "error";
              row.reason = error.message;
            }
          }
        }
      }
    }

    const summary = {
      total: results.length,
      accepted: results.filter((r) => r.status === "accepted").length,
      invalid: results.filter((r) => r.status === "invalid").length,
      duplicate_input: results.filter((r) => r.status === "duplicate_input").length,
      exists: results.filter((r) => r.status === "exists").length,
      errors: results.filter((r) => r.status === "error").length,
    };
    // Audit log entry for the scan/import action
    await supabase.from("admin_actions").insert({
      actor_id: userId,
      action: "card_scan_import",
      target_type: "nfc_cards",
      target_id: null,
      metadata: { ...summary, is_official: data.is_official } as never,
    });
    return { results, summary };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const [totalRes, activeRes, unassignedRes] = await Promise.all([
      supabase.from("nfc_cards").select("id", { count: "exact", head: true }),
      supabase.from("nfc_cards").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("nfc_cards").select("id", { count: "exact", head: true }).eq("status", "unassigned"),
    ]);
    return {
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      unassigned: unassignedRes.count ?? 0,
    };
  });

/** Full admin overview: counts + recent activity. */
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [
      profilesRes,
      publishedRes,
      cardsRes,
      activeCardsRes,
      unassignedCardsRes,
      leadsRes,
      linksRes,
      recentLeads,
      recentCards,
      recentProfiles,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabaseAdmin.from("nfc_cards").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("nfc_cards").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("nfc_cards").select("id", { count: "exact", head: true }).eq("status", "unassigned"),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profile_links").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("leads")
        .select("id, name, mobile, interest, created_at, profile_id")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("nfc_cards")
        .select("id, card_uid, status, created_at, profile_id")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("profiles")
        .select("id, username, full_name, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    return {
      counts: {
        profiles: profilesRes.count ?? 0,
        published: publishedRes.count ?? 0,
        cards: cardsRes.count ?? 0,
        activeCards: activeCardsRes.count ?? 0,
        unassignedCards: unassignedCardsRes.count ?? 0,
        leads: leadsRes.count ?? 0,
        links: linksRes.count ?? 0,
      },
      recentLeads: recentLeads.data ?? [],
      recentCards: recentCards.data ?? [],
      recentProfiles: recentProfiles.data ?? [],
    };
  });

/** List all users with roles + counts. */
export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        page: z.number().int().min(1).max(1000).optional(),
        pageSize: z.number().int().min(5).max(1000).optional(),
        status: z.enum(["all", "published", "draft", "banned"]).optional(),
        sort: z.enum(["newest", "oldest", "recently_active", "name"]).optional(),
      })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data?.page ?? 1;
    const pageSize = data?.pageSize ?? 20;
    const sort = data?.sort ?? "newest";

    let query = supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, title, is_published, is_banned, banned_at, ban_reason, created_at, avatar_url", { count: "exact" })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (sort === "recently_active") query = query.order("updated_at", { ascending: false });
    else if (sort === "name") query = query.order("full_name", { ascending: true });
    else query = query.order("created_at", { ascending: false });
    if (data?.status === "published") query = query.eq("is_published", true).eq("is_banned", false);
    else if (data?.status === "draft") query = query.eq("is_published", false);
    else if (data?.status === "banned") query = query.eq("is_banned", true);
    if (data?.q) {
      const q = data.q.replace(/[%,]/g, "");
      query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%,title.ilike.%${q}%`);
    }
    const { data: profiles, error, count } = await query;
    if (error) throwSupabase(error, "admin");
    let matched = profiles ?? [];
    // If searching, also try matching email/phone via auth admin, and merge results
    if (data?.q) {
      try {
        const list = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, page: 1 });
        const needle = data.q.toLowerCase();
        const authMatched = (list.data?.users ?? []).filter(
          (u) => (u.email ?? "").toLowerCase().includes(needle) || (u.phone ?? "").includes(needle),
        );
        const missing = authMatched.filter((u) => !matched.some((m) => m.id === u.id)).map((u) => u.id);
        if (missing.length > 0) {
          const { data: extra } = await supabaseAdmin
            .from("profiles")
            .select("id, username, full_name, title, is_published, is_banned, banned_at, ban_reason, created_at, avatar_url")
            .in("id", missing);
          matched = [...matched, ...(extra ?? [])];
        }
      } catch {
        /* ignore auth listUsers failure */
      }
    }
    const ids = matched.map((p) => p.id);
    if (ids.length === 0) return { rows: [], total: 0, page, pageSize };

    const [rolesRes, linksRes, cardsRes, leadsRes] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("profile_links").select("profile_id").in("profile_id", ids),
      supabaseAdmin.from("nfc_cards").select("profile_id").in("profile_id", ids),
      supabaseAdmin.from("leads").select("profile_id").in("profile_id", ids),
    ]);
    // Enrich with email/phone from auth for these ids
    const emailMap = new Map<string, { email: string | null; phone: string | null }>();
    try {
      const list = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, page: 1 });
      for (const u of list.data?.users ?? []) {
        emailMap.set(u.id, { email: u.email ?? null, phone: u.phone ?? null });
      }
    } catch {
      /* ignore */
    }

    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }
    const countBy = (rows: Array<{ profile_id: string | null }>) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        if (!r.profile_id) continue;
        m.set(r.profile_id, (m.get(r.profile_id) ?? 0) + 1);
      }
      return m;
    };
    const linksCount = countBy(linksRes.data ?? []);
    const cardsCount = countBy(cardsRes.data ?? []);
    const leadsCount = countBy(leadsRes.data ?? []);

    const rows = matched.map((p) => ({
      ...p,
      email: emailMap.get(p.id)?.email ?? null,
      phone: emailMap.get(p.id)?.phone ?? null,
      roles: rolesByUser.get(p.id) ?? ["user"],
      is_admin: (rolesByUser.get(p.id) ?? []).includes("admin"),
      links_count: linksCount.get(p.id) ?? 0,
      cards_count: cardsCount.get(p.id) ?? 0,
      leads_count: leadsCount.get(p.id) ?? 0,
    }));
    if (sort === "recently_active") {
      // Secondary in-memory sort by total activity (cards+leads+links) to break ties
      rows.sort((a, b) => (b.cards_count + b.leads_count + b.links_count) - (a.cards_count + a.leads_count + a.links_count));
    }
    return { rows, total: count ?? matched.length, page, pageSize };
  });

/** Grant/revoke a role for a user (admin only). */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["admin", "user"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_user_role", {
      _user_id: data.user_id,
      _role: data.role,
      _grant: data.grant,
    });
    if (error) throwSupabase(error, "admin");
    return { ok: true };
  });

/** List all leads across all profiles (admin only). */
export const listAllLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        page: z.number().int().min(1).max(1000).optional(),
        pageSize: z.number().int().min(5).max(1000).optional(),
        sort: z.enum(["newest", "oldest", "name"]).optional(),
      })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data?.page ?? 1;
    const pageSize = data?.pageSize ?? 20;
    const sort = data?.sort ?? "newest";

    let query = supabaseAdmin
      .from("leads")
      .select("id, name, mobile, interest, source_card_uid, created_at, profile_id", { count: "exact" })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (sort === "name") query = query.order("name", { ascending: true });
    else query = query.order("created_at", { ascending: false });
    if (data?.q) {
      const q = data.q.replace(/[%,]/g, "");
      query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,interest.ilike.%${q}%`);
    }
    const { data: rows, error, count } = await query;
    if (error) throwSupabase(error, "admin");

    const ids = Array.from(new Set((rows ?? []).map((r) => r.profile_id)));
    const profilesRes = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, full_name").in("id", ids)
      : { data: [] as Array<{ id: string; username: string | null; full_name: string | null }> };
    const pMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const enriched = (rows ?? []).map((r) => ({
      ...r,
      profile_username: pMap.get(r.profile_id)?.username ?? null,
      profile_full_name: pMap.get(r.profile_id)?.full_name ?? null,
    }));
    return { rows: enriched, total: count ?? 0, page, pageSize };
  });
/** Ban or unban a user (admin only). */
export const banUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        ban: z.boolean(),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_ban_user", {
      _user_id: data.user_id,
      _ban: data.ban,
      _reason: data.reason ?? undefined,
    });
    if (error) throwSupabase(error, "admin");
    return { ok: true as const };
  });

/** Detailed user info for admin detail page. */
export const getUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      user_id: z.string().uuid(),
      action_types: z.array(z.string()).optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.user_id;
    const from = data.from;
    const to = data.to;
    const types = data.action_types && data.action_types.length > 0 ? data.action_types : null;

    const [profileRes, rolesRes, cardsRes, leadsRes, cardEventsRes, actionsRes, authRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, full_name, title, bio, avatar_url, cover_url, is_published, is_banned, banned_at, ban_reason, created_at, updated_at, language")
        .eq("id", uid)
        .maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", uid),
      supabaseAdmin
        .from("nfc_cards")
        .select("id, card_uid, status, is_official, activated_at, last_written_at, created_at")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("leads")
        .select("id, name, mobile, interest, created_at")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      (() => {
        let q = supabaseAdmin
          .from("card_events")
          .select("id, event_type, card_uid, metadata, created_at")
          .eq("profile_id", uid)
          .order("created_at", { ascending: false })
          .limit(100);
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", to);
        if (types) q = q.in("event_type", types as never);
        return q;
      })(),
      (() => {
        let q = supabaseAdmin
          .from("admin_actions")
          .select("id, actor_id, action, metadata, created_at")
          .eq("target_type", "user")
          .eq("target_id", uid)
          .order("created_at", { ascending: false })
          .limit(100);
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", to);
        if (types) q = q.in("action", types);
        return q;
      })(),
      supabaseAdmin.auth.admin.getUserById(uid).catch(() => null),
    ]);

    if (!profileRes.data) throw new Error("المستخدم غير موجود");
    const authUser = authRes?.data?.user ?? null;
    return {
      profile: profileRes.data,
      roles: (rolesRes.data ?? []).map((r) => r.role),
      auth: authUser
        ? {
            email: authUser.email ?? null,
            phone: authUser.phone ?? null,
            last_sign_in_at: authUser.last_sign_in_at ?? null,
            email_confirmed_at: authUser.email_confirmed_at ?? null,
            created_at: authUser.created_at ?? null,
          }
        : null,
      cards: cardsRes.data ?? [],
      leads: leadsRes.data ?? [],
      card_events: cardEventsRes.data ?? [],
      admin_actions: actionsRes.data ?? [],
    };
  });

/** Recent admin audit log entries. */
export const listAdminActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(200).optional() }).optional().parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("admin_actions")
      .select("id, actor_id, action, target_type, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 50);
    return rows ?? [];
  });

/** Paginated admin actions with metadata (dedicated endpoint for the audit page). */
export const listAdminActionsPaged = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      page: z.number().int().min(1).max(1000).optional(),
      pageSize: z.number().int().min(5).max(1000).optional(),
      q: z.string().trim().max(120).optional(),
      action: z.string().max(60).optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).optional().parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data?.page ?? 1;
    const pageSize = data?.pageSize ?? 25;
    let q = supabaseAdmin
      .from("admin_actions")
      .select("id, actor_id, action, target_type, target_id, metadata, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (data?.action && data.action !== "all") q = q.eq("action", data.action);
    if (data?.from) q = q.gte("created_at", data.from);
    if (data?.to) q = q.lte("created_at", data.to);
    if (data?.q) {
      const needle = data.q.replace(/[%,]/g, "");
      q = q.or(`target_id.ilike.%${needle}%,action.ilike.%${needle}%`);
    }
    const { data: rows, count } = await q;
    // Enrich with actor username/full_name
    const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter((x): x is string => Boolean(x))));
    const actorMap = new Map<string, { username: string | null; full_name: string | null }>();
    if (actorIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, username, full_name")
        .in("id", actorIds);
      for (const p of profs ?? []) actorMap.set(p.id, { username: p.username, full_name: p.full_name });
    }
    const enriched = (rows ?? []).map((r) => ({
      ...r,
      actor_username: r.actor_id ? actorMap.get(r.actor_id)?.username ?? null : null,
      actor_full_name: r.actor_id ? actorMap.get(r.actor_id)?.full_name ?? null : null,
    }));
    return { rows: enriched, total: count ?? 0, page, pageSize };
  });

/** Paginated list of all NFC cards for admin review. */
export const listAllCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        status: z.enum(["all", "active", "disabled", "unassigned"]).optional(),
        type: z.enum(["all", "official", "unofficial"]).optional(),
        page: z.number().int().min(1).max(2000).optional(),
        pageSize: z.number().int().min(5).max(200).optional(),
      })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data?.page ?? 1;
    const pageSize = data?.pageSize ?? 25;
    let query = supabaseAdmin
      .from("nfc_cards")
      .select("id, card_uid, status, is_official, profile_id, activated_at, last_written_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (data?.status && data.status !== "all") query = query.eq("status", data.status);
    if (data?.type === "official") query = query.eq("is_official", true);
    else if (data?.type === "unofficial") query = query.eq("is_official", false);
    if (data?.q) {
      const q = normalizeUid(data.q);
      if (q) query = query.ilike("card_uid", `%${q}%`);
    }
    const { data: rows, error, count } = await query;
    if (error) throwSupabase(error, "admin");
    const ids = Array.from(new Set((rows ?? []).map((r) => r.profile_id).filter((x): x is string => Boolean(x))));
    const pMap = new Map<string, { username: string | null; full_name: string | null }>();
    if (ids.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, username, full_name")
        .in("id", ids);
      for (const p of profs ?? []) pMap.set(p.id, { username: p.username, full_name: p.full_name });
    }
    const enriched = (rows ?? []).map((r) => ({
      ...r,
      profile_username: r.profile_id ? pMap.get(r.profile_id)?.username ?? null : null,
      profile_full_name: r.profile_id ? pMap.get(r.profile_id)?.full_name ?? null : null,
    }));
    return { rows: enriched, total: count ?? 0, page, pageSize };
  });

/** Look up a single card by UID (admin) — used by the scanner to validate. */
export const lookupCardByUid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ uid: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const normalized = normalizeUid(data.uid);
    if (!/^[0-9A-F]{8,32}$/.test(normalized)) {
      await context.supabase.from("admin_actions").insert({
        actor_id: context.userId,
        action: "card_scan_lookup",
        target_type: "nfc_cards",
        target_id: null,
        metadata: { uid: data.uid, normalized, result: "invalid" } as never,
      });
      return { ok: false as const, reason: "invalid" as const, normalized, message: "صيغة UID غير صحيحة (HEX 8-32)" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: card } = await supabaseAdmin
      .from("nfc_cards")
      .select("id, card_uid, status, is_official, profile_id, activated_at, last_written_at, created_at")
      .eq("card_uid", normalized)
      .maybeSingle();
    let profile: { username: string | null; full_name: string | null } | null = null;
    if (card?.profile_id) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("username, full_name")
        .eq("id", card.profile_id)
        .maybeSingle();
      profile = p ?? null;
    }
    await context.supabase.from("admin_actions").insert({
      actor_id: context.userId,
      action: "card_scan_lookup",
      target_type: "nfc_cards",
      target_id: card?.id ?? null,
      metadata: {
        uid: data.uid,
        normalized,
        result: card ? "found" : "not_found",
        status: card?.status ?? null,
        is_official: card?.is_official ?? null,
      } as never,
    });
    if (!card) {
      return { ok: false as const, reason: "not_found" as const, normalized, message: "البطاقة غير مسجّلة في النظام" };
    }
    return { ok: true as const, normalized, card, profile };
  });

/** Register (or reassign) a scanned UID to a user, from the admin scanner. */
export const adminAssignCardToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        uid: z.string().min(1).max(64),
        user_id: z.string().uuid(),
        is_official: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const normalized = normalizeUid(data.uid);
    if (!/^[0-9A-F]{8,32}$/.test(normalized)) {
      throw new Error("صيغة UID غير صحيحة (HEX 8-32)");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure the target user exists
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target) throw new Error("المستخدم غير موجود");

    const { data: existing } = await supabaseAdmin
      .from("nfc_cards")
      .select("id, profile_id, is_official")
      .eq("card_uid", normalized)
      .maybeSingle();

    let cardId: string;
    let previousOwner: string | null = null;
    if (existing) {
      previousOwner = existing.profile_id;
      const { data: upd, error } = await supabaseAdmin
        .from("nfc_cards")
        .update({
          profile_id: data.user_id,
          status: "active",
          activated_at: new Date().toISOString(),
          is_official: data.is_official ?? existing.is_official,
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) throwSupabase(error, "admin");
      cardId = upd.id;
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("nfc_cards")
        .insert({
          card_uid: normalized,
          profile_id: data.user_id,
          is_official: data.is_official ?? true,
          status: "active",
          activated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throwSupabase(error, "admin");
      cardId = ins.id;
    }
    await context.supabase.from("admin_actions").insert({
      actor_id: context.userId,
      action: "card_registered",
      target_type: "nfc_cards",
      target_id: cardId,
      metadata: {
        uid: normalized,
        user_id: data.user_id,
        previous_owner: previousOwner,
        is_official: data.is_official ?? true,
      } as never,
    });
    return { ok: true as const, card_id: cardId, user: target };
  });

/** Update a card's status (active/disabled/unassigned) — admin. */
export const adminUpdateCardStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["active", "disabled", "unassigned"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: card } = await supabaseAdmin
      .from("nfc_cards")
      .select("id, card_uid, profile_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!card) throw new Error("البطاقة غير موجودة");
    const patch: {
      status: "active" | "disabled" | "unassigned";
      profile_id?: string | null;
      activated_at?: string;
    } = { status: data.status };
    if (data.status === "unassigned") patch.profile_id = null;
    if (data.status === "active" && card.profile_id) patch.activated_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("nfc_cards").update(patch).eq("id", data.id);
    if (error) throwSupabase(error, "admin");
    await context.supabase.from("admin_actions").insert({
      actor_id: context.userId,
      action: "card_status_updated",
      target_type: "nfc_cards",
      target_id: card.id,
      metadata: {
        uid: card.card_uid,
        from: card.status,
        to: data.status,
        previous_owner: card.profile_id,
      } as never,
    });
    return { ok: true as const };
  });

/** Detach a card from its current owner (keeps the UID, sets status=unassigned). */
export const adminUnassignCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: card } = await supabaseAdmin
      .from("nfc_cards")
      .select("id, card_uid, profile_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!card) throw new Error("البطاقة غير موجودة");
    const { error } = await supabaseAdmin
      .from("nfc_cards")
      .update({ profile_id: null, status: "unassigned" })
      .eq("id", data.id);
    if (error) throwSupabase(error, "admin");
    await context.supabase.from("admin_actions").insert({
      actor_id: context.userId,
      action: "card_unassigned",
      target_type: "nfc_cards",
      target_id: card.id,
      metadata: { uid: card.card_uid, previous_owner: card.profile_id } as never,
    });
    return { ok: true as const };
  });

/** Permanently delete a card (admin). */
export const adminDeleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: card } = await supabaseAdmin
      .from("nfc_cards")
      .select("id, card_uid, profile_id, is_official, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!card) throw new Error("البطاقة غير موجودة");
    const { error } = await supabaseAdmin.from("nfc_cards").delete().eq("id", data.id);
    if (error) throwSupabase(error, "admin");
    await context.supabase.from("admin_actions").insert({
      actor_id: context.userId,
      action: "card_deleted",
      target_type: "nfc_cards",
      target_id: card.id,
      metadata: {
        uid: card.card_uid,
        previous_owner: card.profile_id,
        is_official: card.is_official,
        previous_status: card.status,
      } as never,
    });
    return { ok: true as const };
  });
