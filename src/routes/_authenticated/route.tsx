import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { makeRouteError, makeRouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const getUserWithTimeout = Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null }, error: new Error("Auth timeout") }), 3500)
      ),
    ]);
    const { data, error } = await getUserWithTimeout.catch((err) => ({
      data: { user: null },
      error: err instanceof Error ? err : new Error("Auth error"),
    }));

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