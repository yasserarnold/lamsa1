import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { isTransient } from "./lib/errors";
import { makeRouteError, makeRouteNotFound } from "./components/route-boundaries";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Auto-retry transient network/5xx failures up to 3 times with
        // exponential backoff; give up immediately on RLS/auth/client errors.
        retry: (failureCount, error) => failureCount < 3 && isTransient(error),
        retryDelay: (attempt) => Math.min(4000, 400 * 2 ** attempt),
        staleTime: 30_000,
      },
      mutations: {
        retry: (failureCount, error) => failureCount < 2 && isTransient(error),
        retryDelay: (attempt) => Math.min(3000, 500 * 2 ** attempt),
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: makeRouteError("default"),
    defaultNotFoundComponent: makeRouteNotFound(),
  });

  return router;
};
