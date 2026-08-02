import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { listAllMyCardEvents, listMyCards } from "@/lib/cards.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, History } from "lucide-react";
import { useLanguage, type TKey } from "@/lib/i18n";
import { qk } from "@/lib/query-keys";

export const Route = createFileRoute("/_authenticated/dashboard/events")({
  head: () => ({
    meta: [
      { title: "سجل NFC — لمسة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EventsPage,
});

type EventType = "activated" | "deactivated" | "written" | "registered" | "deleted";

const HEX_RE = /^[0-9A-F]{8,32}$/;

function EventsPage() {
  const { t, locale } = useLanguage();
  const eventsFn = useServerFn(listAllMyCardEvents);
  const cardsFn = useServerFn(listMyCards);

  const eventsQ = useQuery({ queryKey: qk.cards.eventsAll(), queryFn: () => eventsFn() });
  const cardsQ = useQuery({ queryKey: qk.cards.mine(), queryFn: () => cardsFn() });

  const [type, setType] = useState<"all" | EventType>("all");
  const [search, setSearch] = useState("");

  const cardByUid = useMemo(() => {
    const m = new Map<string, { is_official: boolean }>();
    for (const c of cardsQ.data ?? []) m.set(c.card_uid, { is_official: c.is_official });
    return m;
  }, [cardsQ.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return (eventsQ.data ?? []).filter((ev) => {
      if (type !== "all" && ev.event_type !== type) return false;
      if (q && !ev.card_uid.toUpperCase().includes(q)) return false;
      return true;
    });
  }, [eventsQ.data, type, search]);

  const typeLabels: Record<EventType, TKey> = {
    activated: "events.type.activated",
    deactivated: "events.type.deactivated",
    written: "events.type.written",
    registered: "events.type.registered",
    deleted: "events.type.deleted",
  };
  const tone: Record<EventType, string> = {
    activated: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    deactivated: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    written: "bg-primary/15 text-primary",
    registered: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    deleted: "bg-destructive/15 text-destructive",
  };

  function exportCsv() {
    const rows = [
      ["created_at", "event_type", "card_uid", "uid_valid", "card_id", "metadata"],
      ...filtered.map((ev) => [
        new Date(ev.created_at).toISOString(),
        ev.event_type,
        ev.card_uid,
        HEX_RE.test(ev.card_uid) ? "1" : "0",
        ev.card_id ?? "",
        ev.metadata ? JSON.stringify(ev.metadata) : "",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfc-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <History className="size-6 text-primary" />
              {t("events.title")}
            </h1>
            <p className="text-muted-foreground">{t("events.subtitle")}</p>
          </div>
          <Button onClick={exportCsv} disabled={filtered.length === 0} className="gap-2">
            <Download className="size-4" />
            {t("events.export")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} / {eventsQ.data?.length ?? 0}
            </CardTitle>
            <CardDescription>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="UID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  dir="ltr"
                />
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("events.filter.all")}</SelectItem>
                    <SelectItem value="activated">{t("events.type.activated")}</SelectItem>
                    <SelectItem value="deactivated">{t("events.type.deactivated")}</SelectItem>
                    <SelectItem value="written">{t("events.type.written")}</SelectItem>
                    <SelectItem value="registered">{t("events.type.registered")}</SelectItem>
                    <SelectItem value="deleted">{t("events.type.deleted")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventsQ.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t("events.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                      <th className="py-2 text-start font-medium">{t("events.col.time")}</th>
                      <th className="py-2 text-start font-medium">{t("events.col.type")}</th>
                      <th className="py-2 text-start font-medium">{t("events.col.uid")}</th>
                      <th className="py-2 text-start font-medium">{t("events.col.card")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((ev) => {
                      const valid = HEX_RE.test(ev.card_uid);
                      const meta = cardByUid.get(ev.card_uid);
                      return (
                        <tr key={ev.id}>
                          <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(ev.created_at).toLocaleString(locale)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                tone[ev.event_type as EventType] ?? "bg-muted"
                              }`}
                            >
                              {t(typeLabels[ev.event_type as EventType] ?? "events.type.activated")}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-xs" dir="ltr">
                                {ev.card_uid}
                              </code>
                              <span
                                className={`inline-block size-1.5 rounded-full ${
                                  valid ? "bg-emerald-500" : "bg-destructive"
                                }`}
                                title={valid ? "valid hex" : "invalid"}
                              />
                            </div>
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {meta
                              ? meta.is_official
                                ? t("cards.official")
                                : "—"
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}