import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { makeRouteError, makeRouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // Clear any stale/invalid session (e.g. deleted user JWT still in localStorage)
      // to avoid an infinite loop of 403 user_not_found requests.
      if (error && /user_not_found|invalid|jwt/i.test(error.message ?? "")) {
        try { await supabase.auth.signOut(); } catch { /* noop */ }
      }
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
  errorComponent: makeRouteError("authenticated"),
  notFoundComponent: makeRouteNotFound(),
});