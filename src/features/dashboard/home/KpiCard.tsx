import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";

/**
 * Compact stat tile linking to a detail route (links, cards, leads, …).
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  to,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  to: string;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className="card-elevated group flex items-center gap-3 rounded-2xl p-4 transition hover:translate-y-[-1px] hover:border-[var(--gold)]/40"
    >
      <div
        className={`grid size-11 shrink-0 place-items-center rounded-xl transition group-hover:scale-105 ${
          accent
            ? "bg-[var(--gold)]/15 text-[var(--gold)]"
            : "bg-primary/15 text-primary-foreground"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-bold leading-none">{value ?? "—"}</p>
      </div>
    </Link>
  );
}