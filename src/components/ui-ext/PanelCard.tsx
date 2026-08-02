import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/**
 * Rounded card with a titled header and optional "view all" action.
 * Used for the dashboard's list panels (recent leads, NFC events, …).
 */
export function PanelCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  action?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="card-elevated overflow-hidden rounded-3xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-[var(--gold)]" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {title}
          </h3>
        </div>
        {action && (
          <Link
            to={action.to}
            className="text-xs text-muted-foreground transition hover:text-[var(--gold-soft)]"
          >
            {action.label} ←
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}