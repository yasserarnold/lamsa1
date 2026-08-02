import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type Crumb = { label: string; to?: string; params?: Record<string, string> };

type Props = {
  username: string;
  displayName?: string | null;
  /** Optional trailing crumb (e.g. "الإعدادات"). */
  trail?: Crumb;
};

/**
 * Shared breadcrumb for every public profile page (/u/$username and any
 * future sub-route). Keep design + position identical across pages by
 * rendering this at the top of the profile <article>.
 */
export function ProfileBreadcrumb({ username, displayName, trail }: Props) {
  const { t } = useLanguage();
  const userLabel = displayName?.trim() || (username ? `@${username}` : t("pub.breadcrumb.user"));

  return (
    <nav aria-label={t("pub.breadcrumb.nav")} className="mb-4">
      <ol className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link
            to="/"
            className="rounded-md px-2 py-1 transition hover:bg-card hover:text-foreground"
          >
            {t("pub.breadcrumb.home")}
          </Link>
        </li>
        <li aria-hidden className="text-muted-foreground/60">
          <ChevronLeft className="size-4" />
        </li>
        <li aria-current={trail ? undefined : "page"}>
          <Link
            to="/u/$username"
            params={{ username }}
            className={
              trail
                ? "rounded-md px-2 py-1 transition hover:bg-card hover:text-foreground"
                : "rounded-md px-2 py-1 font-medium text-foreground"
            }
          >
            {userLabel}
          </Link>
        </li>
        {trail ? (
          <>
            <li aria-hidden className="text-muted-foreground/60">
              <ChevronLeft className="size-4" />
            </li>
            <li aria-current="page">
              <span className="rounded-md px-2 py-1 font-medium text-foreground">
                {trail.label}
              </span>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
