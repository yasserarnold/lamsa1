import { memo } from "react";
import { useLanguage, type TKey } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Contact2, Link2 } from "lucide-react";
import type { CardEventRow, WrittenEventMeta } from "./types";

export type { CardEventRow as CardEvent };

const LABELS: Partial<Record<CardEventRow["event_type"], TKey>> = {
  activated: "events.type.activated",
  deactivated: "events.type.deactivated",
  written: "events.type.written",
  registered: "events.type.registered",
  deleted: "events.type.deleted",
};

const TONE: Partial<Record<CardEventRow["event_type"], string>> = {
  activated: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  deactivated: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  written: "bg-primary/15 text-primary",
  registered: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  deleted: "bg-destructive/15 text-destructive",
};

function CardEventListImpl({
  events,
  isLoading,
}: {
  events: CardEventRow[];
  isLoading: boolean;
}) {
  const { t, locale } = useLanguage();
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }
  if (events.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{t("events.empty")}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {events.map((ev) => {
        const meta = (ev.metadata ?? {}) as WrittenEventMeta;
        const failed = ev.event_type === "written" && meta.status === "failed";
        return (
          <li key={ev.id} className="flex flex-wrap items-center gap-3 py-3">
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                failed
                  ? "bg-destructive/15 text-destructive"
                  : TONE[ev.event_type] ?? "bg-muted"
              }`}
            >
              {LABELS[ev.event_type] ? t(LABELS[ev.event_type]!) : ev.event_type}
              {failed ? t("dash.eventList.failedSuffix") : ""}
            </span>
            {ev.event_type === "written" && meta.mode && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                {meta.mode === "vcard" ? (
                  <Contact2 className="size-3" />
                ) : (
                  <Link2 className="size-3" />
                )}
                {meta.mode === "vcard" ? "vCard" : "URL"}
              </Badge>
            )}
            <code className="font-mono text-xs" dir="ltr">
              {ev.card_uid}
            </code>
            {failed && meta.message && (
              <span
                className="text-xs text-destructive/80 truncate max-w-[240px]"
                title={meta.message}
              >
                {meta.message}
              </span>
            )}
            <span className="ms-auto text-xs text-muted-foreground">
              {new Date(ev.created_at).toLocaleString(locale)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export const CardEventList = memo(CardEventListImpl);