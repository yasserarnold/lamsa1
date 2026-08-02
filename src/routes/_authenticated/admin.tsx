import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { amIAdmin } from "@/lib/admin.functions";
import { makeRouteError, makeRouteNotFound } from "@/components/route-boundaries";

/**
 * بوابة موحّدة لكل مسارات /admin/*:
 * تمنع أي دور غير admin من فتح الصفحات (الحماية الفعلية للبيانات
 * موجودة أصلًا في الدوال الخادمة عبر assertAdmin).
 */
export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    let isAdmin = false;
    try {
      const res = await amIAdmin();
      isAdmin = Boolean(res?.isAdmin);
    } catch {
      isAdmin = false;
    }
    if (!isAdmin) throw redirect({ to: "/dashboard", replace: true });
    return { isAdmin: true };
  },
  component: () => <Outlet />,
  errorComponent: makeRouteError("admin"),
  notFoundComponent: makeRouteNotFound(),
});
