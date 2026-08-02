import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DashboardShell } from "@/components/DashboardShell";
import { listMyLeads } from "@/lib/leads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Search, Phone, User2, Eye, EyeOff, Link2, ChevronRight, ChevronLeft, ArrowUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import { useLanguage } from "@/lib/i18n";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  from: fallback(z.string(), "").default(""),
  to: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "all").default("all"), // all | seen | unseen
  sort: fallback(z.string(), "created_desc").default("created_desc"),
  page: fallback(z.number().int(), 1).default(1),
  pageSize: fallback(z.number().int(), 20).default(20),
});
type LeadSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_authenticated/dashboard/leads")({
  head: () => ({ meta: [{ title: "العملاء — لمسة" }, { name: "robots", content: "noindex" }] }),
  validateSearch: zodValidator(searchSchema),
  component: LeadsPage,
});

function escCsv(v: string | null | undefined) {
  const s = (v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

type ColKey = "name" | "mobile" | "interest" | "uid" | "date" | "status";
const COL_KEYS: { key: ColKey; labelKey: string }[] = [
  { key: "name", labelKey: "dash.leads.colName" },
  { key: "mobile", labelKey: "dash.leads.colMobile" },
  { key: "interest", labelKey: "dash.leads.colInterest" },
  { key: "uid", labelKey: "dash.leads.colUid" },
  { key: "date", labelKey: "dash.leads.colDate" },
  { key: "status", labelKey: "dash.leads.colStatus" },
];

const SEEN_KEY = "leads:seen";
function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveSeen(s: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
}

function LeadsPage() {
  const { t } = useLanguage();
  const listFn = useServerFn(listMyLeads);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(search.q);
  const [from, setFrom] = useState(search.from);
  const [to, setTo] = useState(search.to);
  const [status, setStatus] = useState(search.status);
  const [sort, setSort] = useState(search.sort);
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen());
  const [cols, setCols] = useState<Set<ColKey>>(new Set(COL_KEYS.map((c) => c.key)));
  const ALL_COLS = COL_KEYS.map((c) => ({ key: c.key, label: t(c.labelKey as never) }));

  useEffect(() => {
    setQ(search.q); setFrom(search.from); setTo(search.to); setStatus(search.status); setSort(search.sort);
  }, [search.q, search.from, search.to, search.status, search.sort]);

  const leadsQ = useQuery({
    queryKey: qk.leads.mine({ q: search.q, from: search.from, to: search.to, sort: search.sort, page: search.page, pageSize: search.pageSize }),
    queryFn: () =>
      listFn({
        data: {
          q: search.q || undefined,
          from: search.from ? new Date(search.from).toISOString() : undefined,
          to: search.to ? new Date(search.to + "T23:59:59").toISOString() : undefined,
          sort: search.sort as "created_desc" | "created_asc" | "name_asc" | "name_desc",
          page: search.page,
          pageSize: search.pageSize,
        },
      }),
  });
  const allLeads = leadsQ.data?.rows ?? [];
  const total = leadsQ.data?.total ?? 0;
  const pageSize = search.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const leads = useMemo(() => {
    if (search.status === "seen") return allLeads.filter((l) => seen.has(l.id));
    if (search.status === "unseen") return allLeads.filter((l) => !seen.has(l.id));
    return allLeads;
  }, [allLeads, search.status, seen]);

  function apply() {
    navigate({ search: (prev: LeadSearch) => ({ ...prev, q, from, to, status, sort, page: 1 }) });
  }
  function reset() {
    setQ(""); setFrom(""); setTo(""); setStatus("all"); setSort("created_desc");
    navigate({ search: { q: "", from: "", to: "", status: "all", sort: "created_desc", page: 1, pageSize: 20 } });
  }
  function goToPage(p: number) {
    navigate({ search: (prev: LeadSearch) => ({ ...prev, page: Math.max(1, Math.min(totalPages, p)) }) });
  }
  function changeSort(v: string) {
    setSort(v);
    navigate({ search: (prev: LeadSearch) => ({ ...prev, sort: v, page: 1 }) });
  }
  function changePageSize(v: string) {
    navigate({ search: (prev: LeadSearch) => ({ ...prev, pageSize: Number(v), page: 1 }) });
  }
  function toggleSeen(id: string) {
    setSeen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveSeen(next);
      return next;
    });
  }
  function shareUrl() {
    const u = new URL(window.location.href);
    navigator.clipboard.writeText(u.toString());
    toast.success(t("dash.leads.toastLinkCopied"));
  }

  const csv = useMemo(() => {
    const active = ALL_COLS.filter((c) => cols.has(c.key));
    const header = active.map((c) => c.label);
    const rows = leads.map((l) =>
      active.map((c) => {
        switch (c.key) {
          case "name": return escCsv(l.name);
          case "mobile": return escCsv(l.mobile);
          case "interest": return escCsv(l.interest);
          case "uid": return escCsv(l.source_card_uid);
          case "date": return escCsv(new Date(l.created_at).toLocaleString("ar-EG"));
          case "status": return escCsv(seen.has(l.id) ? t("dash.leads.seen") : t("dash.leads.new"));
        }
      }).join(","),
    );
    return "\uFEFF" + [header.join(","), ...rows].join("\n");
  }, [leads, cols, seen]);

  function downloadCsv() {
    if (cols.size === 0) { toast.error(t("dash.leads.toastPickColumn")); return; }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("dash.leads.title")}</h1>
            <p className="text-muted-foreground">{t("dash.leads.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={shareUrl} className="gap-2">
              <Link2 className="size-4" />
              {t("dash.leads.copyLink")}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">{t("dash.leads.columns")} ({cols.size})</Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56">
                <p className="mb-2 text-sm font-semibold">{t("dash.leads.chooseCsvColumns")}</p>
                <div className="space-y-2">
                  {ALL_COLS.map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={cols.has(c.key)}
                        onCheckedChange={(v) => {
                          setCols((prev) => {
                            const n = new Set(prev);
                            if (v) n.add(c.key); else n.delete(c.key);
                            return n;
                          });
                        }}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={downloadCsv} disabled={leads.length === 0} className="gap-2">
              <Download className="size-4" />
              {t("dash.leads.exportCsv")} ({leads.length})
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("dash.leads.filtersTitle")}</CardTitle>
            <CardDescription>{t("dash.leads.filtersSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px_auto_auto]">
              <div>
                <Label>{t("dash.leads.search")}</Label>
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="ps-9"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("dash.leads.searchPlaceholder")}
                    onKeyDown={(e) => e.key === "Enter" && apply()}
                  />
                </div>
              </div>
              <div>
                <Label>{t("dash.leads.from")}</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label>{t("dash.leads.to")}</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <Label>{t("dash.leads.previewStatus")}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("dash.leads.all")}</SelectItem>
                    <SelectItem value="unseen">{t("dash.leads.new")}</SelectItem>
                    <SelectItem value="seen">{t("dash.leads.seen")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={apply} className="w-full">{t("dash.leads.apply")}</Button>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={reset} className="w-full">{t("dash.leads.reset")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>
                {t("dash.leads.results")} ({leads.length}{leads.length !== total ? ` ${t("dash.leads.of")} ${total}` : ""})
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="size-4 text-muted-foreground" />
                  <Select value={sort} onValueChange={changeSort}>
                    <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_desc">{t("dash.leads.sortNewest")}</SelectItem>
                      <SelectItem value="created_asc">{t("dash.leads.sortOldest")}</SelectItem>
                      <SelectItem value="name_asc">{t("dash.leads.sortNameAsc")}</SelectItem>
                      <SelectItem value="name_desc">{t("dash.leads.sortNameDesc")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={String(pageSize)} onValueChange={changePageSize}>
                  <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 {t("dash.leads.perPage")}</SelectItem>
                    <SelectItem value="20">20 {t("dash.leads.perPage")}</SelectItem>
                    <SelectItem value="50">50 {t("dash.leads.perPage")}</SelectItem>
                    <SelectItem value="100">100 {t("dash.leads.perPage")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {leadsQ.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : leads.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t("dash.leads.empty")}</p>
            ) : (
              <ul className="space-y-2">
                {leads.map((l) => {
                  const isSeen = seen.has(l.id);
                  return (
                  <li
                    key={l.id}
                    className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 transition-colors ${
                      isSeen ? "border-border bg-card" : "border-primary/30 bg-primary/5"
                    }`}
                  >
                    <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                      <User2 className="size-5" />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-semibold flex items-center gap-2">
                        {l.name}
                        {!isSeen && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{t("dash.leads.new")}</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {l.interest || "—"}
                      </p>
                    </div>
                    <a
                      href={`tel:${l.mobile}`}
                      dir="ltr"
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                      <Phone className="size-4" />
                      {l.mobile}
                    </a>
                    <div className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("ar-EG")}
                    </div>
                    {l.source_card_uid && (
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs" dir="ltr">
                        {l.source_card_uid}
                      </code>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSeen(l.id)}
                      className="gap-1"
                      aria-label={isSeen ? t("dash.leads.markUnseen") : t("dash.leads.markSeen")}
                    >
                      {isSeen ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </li>
                  );
                })}
              </ul>
            )}
            {total > 0 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  {t("dash.leads.page")} {search.page} {t("dash.leads.pageOf")} {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(search.page - 1)}
                    disabled={search.page <= 1}
                    className="gap-1"
                  >
                    <ChevronRight className="size-4" />
                    {t("dash.leads.prev")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(search.page + 1)}
                    disabled={search.page >= totalPages}
                    className="gap-1"
                  >
                    {t("dash.leads.next")}
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}