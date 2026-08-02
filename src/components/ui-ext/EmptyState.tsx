import type { ComponentType } from "react";

/**
 * Small centered "nothing here yet" block used inside cards and lists.
 */
export function EmptyState({
  icon: Icon,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="grid place-items-center gap-2 py-8 text-center">
      <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}