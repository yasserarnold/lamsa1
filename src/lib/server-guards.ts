/**
 * حراس مشتركون للدوال الخادمة. استخرجناهم من `admin.functions.ts`
 * لتفادي تكرار "التحقق من has_role admin" في كل handler.
 *
 * الاستخدام داخل .handler():
 *   await assertAdmin(context);
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
};

/** رميّة موحّدة عندما لا يملك المستخدم صلاحيات المطلوبة. */
export function forbidden(msg = "صلاحيات غير كافية"): never {
  const e = new Error(msg) as Error & { status?: number };
  e.status = 403;
  throw e;
}

/** يتحقق أن المستخدم الحالي admin وإلا يرمي 403 برسالة عربية. */
export async function assertAdmin(ctx: AuthContext): Promise<void> {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("تعذّر التحقق من الصلاحيات");
  if (!data) {
    // Best-effort audit log — never block the deny path if logging fails.
    try {
      const req = getRequest();
      const ua = req?.headers.get("user-agent") ?? undefined;
      const ip =
        req?.headers.get("cf-connecting-ip") ??
        req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        undefined;
      const route = req?.headers.get("referer") ?? undefined;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("log_security_event", {
        _severity: "critical",
        _category: "admin_rpc",
        _action: "assertAdmin_denied",
        _route: route,
        _user_agent: ua,
        _ip: ip,
        _details: { userId: ctx.userId } as never,
      });
    } catch {
      /* ignore */
    }
    forbidden();
  }
}
