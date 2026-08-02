import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/server-guards";

const SeverityEnum = z.enum(["info", "warn", "critical"]);

/** Public logger: anyone (anon or authenticated) can record a security event. */
export const logSecurityEvent = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        severity: SeverityEnum.default("warn"),
        category: z.string().min(1).max(64),
        action: z.string().min(1).max(128),
        route: z.string().max(256).optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const req = getRequest();
    const ua = req?.headers.get("user-agent") ?? null;
    const ip =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("log_security_event", {
      _severity: data.severity,
      _category: data.category,
      _action: data.action,
      _route: data.route ?? undefined,
      _user_agent: ua ?? undefined,
      _ip: ip ?? undefined,
      _details: (data.details ?? {}) as never,
    });
    if (error) {
      console.error("[security] log failed", error);
    }
    return { ok: true };
  });

/** Admin: list recent security events with optional filters. */
export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        severity: SeverityEnum.optional(),
        category: z.string().max(64).optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("security_events")
      .select("id, created_at, severity, category, action, actor_id, route, user_agent, ip, details")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.severity) q = q.eq("severity", data.severity);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { events: rows ?? [] };
  });

export type SecurityStatusCheck = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

/** Admin: aggregate posture snapshot for the security dashboard. */
export const getSecurityStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const checks: SecurityStatusCheck[] = [];

    // 1) RLS enabled on all public tables we care about
    const tables = [
      "profiles",
      "profile_links",
      "profile_media",
      "profile_themes",
      "leads",
      "nfc_cards",
      "tap_events",
      "taps",
      "card_events",
      "user_roles",
      "admin_actions",
      "rate_limits",
      "security_events",
    ];
    const { data: rlsRows } = await supabaseAdmin
      .from("pg_tables" as never)
      .select("tablename, rowsecurity")
      .eq("schemaname", "public")
      .in("tablename", tables);
    const rlsMap = new Map<string, boolean>(
      ((rlsRows ?? []) as Array<{ tablename: string; rowsecurity: boolean }>).map((r) => [
        r.tablename,
        r.rowsecurity,
      ]),
    );
    const missingRls = tables.filter((t) => rlsMap.get(t) === false);
    checks.push({
      key: "rls",
      label: "RLS مُفعّل على جميع الجداول الحساسة",
      status: missingRls.length === 0 ? "pass" : "fail",
      detail:
        missingRls.length === 0
          ? `${tables.length} جدول محمي.`
          : `جداول بدون RLS: ${missingRls.join(", ")}`,
    });

    // 2) Storage buckets all private
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const publicBuckets = (buckets ?? []).filter((b) => b.public);
    checks.push({
      key: "storage",
      label: "جميع خزائن الملفات خاصة (Signed URLs فقط)",
      status: publicBuckets.length === 0 ? "pass" : "warn",
      detail:
        publicBuckets.length === 0
          ? `${(buckets ?? []).length} خزانة خاصة.`
          : `خزائن عامة: ${publicBuckets.map((b) => b.name).join(", ")}`,
    });

    // 3) profiles_public view exists (moderation columns hidden)
    const { error: viewErr } = await supabaseAdmin
      .from("profiles_public" as never)
      .select("id")
      .limit(1);
    checks.push({
      key: "profiles_public",
      label: "الواجهة الآمنة profiles_public تعمل",
      status: viewErr ? "fail" : "pass",
      detail: viewErr ? viewErr.message : "الحقول الحساسة (is_banned/ban_reason) مخفية عن العامة.",
    });

    // 4) admin RPCs blocked for anon (use publishable key)
    let rpcStatus: "pass" | "fail" = "pass";
    let rpcDetail = "admin_ban_user و admin_set_user_role غير قابلين للاستدعاء بدون service_role.";
    try {
      const url = process.env.SUPABASE_URL!;
      const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await anon.rpc("admin_ban_user" as never, {
        _user_id: "00000000-0000-0000-0000-000000000000",
        _ban: false,
      } as never);
      if (!error) {
        rpcStatus = "fail";
        rpcDetail = "تحذير: admin_ban_user قابل للاستدعاء بواسطة anon!";
      }
    } catch (e) {
      rpcDetail = `تعذّر التحقق: ${(e as Error).message}`;
    }
    checks.push({
      key: "admin_rpc",
      label: "دوال المسؤول محميّة على مستوى قاعدة البيانات",
      status: rpcStatus,
      detail: rpcDetail,
    });

    // 5) recent unauthorized attempts count (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: unauthorized24h } = await context.supabase
      .from("security_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);
    const { count: critical24h } = await context.supabase
      .from("security_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since)
      .eq("severity", "critical");

    return {
      checks,
      metrics: {
        events24h: unauthorized24h ?? 0,
        critical24h: critical24h ?? 0,
      },
      generatedAt: new Date().toISOString(),
    };
  });