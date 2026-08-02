import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/lib/i18n";
import { formatError } from "@/lib/errors";
import { toast } from "sonner";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { useLanguage } from "@/lib/i18n";
import { initReporting, installHydrationErrorCapture, reportError, setReportingUser } from "@/lib/reporting";
import { auditPublicSiteUrl } from "@/lib/public-url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    reportError(error, { op: "route.errorComponent" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "لمسة — بطاقة أعمالك الرقمية بلمسة NFC" },
      { name: "description", content: "منصة لمسة تحوّل التعارف إلى تجربة رقمية: بطاقة NFC ذكية تفتح بروفايلك الاحترافي فورًا وتحوّل كل لقاء إلى عميل محتمل." },
      { property: "og:title", content: "لمسة — بطاقة أعمالك الرقمية بلمسة NFC" },
      { property: "og:description", content: "منصة لمسة تحوّل التعارف إلى تجربة رقمية: بطاقة NFC ذكية تفتح بروفايلك الاحترافي فورًا وتحوّل كل لقاء إلى عميل محتمل." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "لمسة" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "لمسة — بطاقة أعمالك الرقمية بلمسة NFC" },
      { name: "twitter:description", content: "منصة لمسة تحوّل التعارف إلى تجربة رقمية: بطاقة NFC ذكية تفتح بروفايلك الاحترافي فورًا وتحوّل كل لقاء إلى عميل محتمل." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d0416527-93a0-4c64-bbf7-42b581f0dc13/id-preview-66da5074--b3de8a81-e204-44cf-a41e-2e008c5eb540.lovable.app-1784670757255.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d0416527-93a0-4c64-bbf7-42b581f0dc13/id-preview-66da5074--b3de8a81-e204-44cf-a41e-2e008c5eb540.lovable.app-1784670757255.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@500;700&family=Tajawal:wght@500;700&family=Space+Grotesk:wght@500;700&family=DM+Sans:wght@400;600&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "لمسة",
              alternateName: "Lamsa",
              url: "https://lamsaeg.lovable.app",
              logo: "https://lamsaeg.lovable.app/favicon.png",
            },
            {
              "@type": "WebSite",
              name: "لمسة",
              url: "https://lamsaeg.lovable.app",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    initReporting();
    installHydrationErrorCapture();
    auditPublicSiteUrl(toast);
    const syncUser = () =>
      supabase.auth.getUser().then(({ data, error }: { data: { user?: { id?: string } | null }; error?: { message?: string } | null }) => {
        if (error && /user_not_found|invalid|jwt/i.test(error.message ?? "")) {
          // Stale session pointing to a deleted user — clear it once to stop the 403 loop.
          supabase.auth.signOut().catch(() => {});
          setReportingUser(null);
          return;
        }
        setReportingUser(data.user?.id ?? null);
      }).catch(() => {});
    syncUser();
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      syncUser();
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <GlobalErrorListeners />
        <AppErrorBoundary boundaryName="root">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </AppErrorBoundary>
        <Toaster position="top-center" richColors closeButton />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

/** Window-level error listeners. Lives inside LanguageProvider so it can translate toasts. */
function GlobalErrorListeners() {
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason;
      // Silence expected redirects/aborts thrown across the app.
      const msg = (reason as { message?: string } | null)?.message ?? "";
      const name = (reason as { name?: string } | null)?.name ?? "";
      if (name === "AbortError" || /redirect|not_?found/i.test(msg)) return;
      console.error("[unhandledrejection]", reason);
      reportError(reason, { op: "window.unhandledrejection" });
      toast.error(formatError(reason, t("pub.error.unexpected")));
    };
    const onError = (ev: ErrorEvent) => {
      console.error("[window.error]", ev.error ?? ev.message);
      reportError(ev.error ?? ev.message, { op: "window.error" });
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, [t]);

  return null;
}
