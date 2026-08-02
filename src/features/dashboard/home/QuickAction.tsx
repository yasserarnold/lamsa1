import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

/**
 * Colored shortcut tile on the dashboard grid ("new link", "link NFC card", …).
 */
export function QuickAction({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-4 transition hover:border-[var(--gold)]/50 hover:bg-card/70"
    >
      <div className="grid size-10 place-items-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] transition group-hover:bg-[var(--gold)]/20">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <ArrowUpRight className="absolute end-3 top-3 size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}