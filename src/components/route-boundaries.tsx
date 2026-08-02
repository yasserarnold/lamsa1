import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatError } from "@/lib/errors";
import { reportError } from "@/lib/reporting";
import { useLanguage } from "@/lib/i18n";

type ErrorProps = { error: Error; reset: () => void };

export function RouteErrorPanel({ error, reset, scope }: ErrorProps & { scope: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  useEffect(() => {
    reportError(error, { op: `route.error.${scope}` });
  }, [error, scope]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{t("pub.error.pageLoadFail")}</h2>
      <p className="text-sm text-muted-foreground">{formatError(error, t("pub.error.unexpected"))}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          {t("pub.error.retry")}
        </Button>
        <Button asChild variant="outline" className="gap-1">
          <Link to="/">
            <Home className="h-4 w-4" />
            {t("pub.error.home")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function RouteNotFoundPanel({
  title,
  hint,
}: {
  title?: string;
  hint?: string;
}) {
  const { t } = useLanguage();
  const resolvedTitle = title ?? t("pub.error.notFoundTitle");
  const resolvedHint = hint ?? t("pub.error.notFoundHint");
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <SearchX className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{resolvedTitle}</h2>
      <p className="text-sm text-muted-foreground">{resolvedHint}</p>
      <Button asChild variant="outline" className="gap-1">
        <Link to="/">
          <Home className="h-4 w-4" />
          {t("pub.error.home")}
        </Link>
      </Button>
    </div>
  );
}

export const makeRouteError = (scope: string) => (p: ErrorProps) => (
  <RouteErrorPanel {...p} scope={scope} />
);
export const makeRouteNotFound = (opts?: { title?: string; hint?: string }) => () => (
  <RouteNotFoundPanel {...(opts ?? {})} />
);
