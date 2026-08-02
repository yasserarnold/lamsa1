import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useLanguage } from "@/lib/i18n";
import { amIAdmin, listAllLeads } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Download, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({
    meta: [
      { title: "لوحة المسؤول — Leads" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLeadsPage,
});

type Row = {
  id: string;
  name: string;
  mobile: string;
  interest: string | null;
  source_card_uid: string | null;
  created_at: string;
  profile_id: string;
  profile_username: string | null;
  profile_full_name: string | null;
};

function AdminLeadsPage() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const listFn = useServerFn(listAllLeads);

  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;

  useEffect(() => {
    if (adminQuery.data && !adminQuery.data.isAdmin) {
      toast.error(t("admin.common.adminOnly"));
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminQuery.data, navigate]);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const query = useQuery({
    queryKey: qk.admin.leads({ q, sort, page }),
    queryFn: () => listFn({ data: { q: q || undefined, sort, page, pageSize } }),
    enabled: isAdmin,
  });

  async function exportCsv() {
    // Export the full filtered result set (up to 1000).
    let rows: Row[] = [];
    try {
      const res = await listFn({ data: { q: q || undefined, sort, page: 1, pageSize: 1000 } });
      rows = (res.rows ?? []) as Row[];
    } catch {
      rows = (query.data?.rows ?? []) as Row[];
    }
    const header = ["created_at", "name", "mobile", "interest", "profile_username", "profile_full_name", "source_card_uid"];
    const csv = [header.join(",")]
      .concat(rows.map((r) => header.map((k) => `"${String((r as any)[k] ?? "").replaceAll('"', '""')}"`).join(",")))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (adminQuery.isPending) {
    return (
      <AdminShell>
        <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin" /></div>
      </AdminShell>
    );
  }
  if (!isAdmin) return null;

  const rows = (query.data?.rows ?? []) as Row[];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">{t("admin.leads.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.leads.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">{t("admin.leads.results").replace("{count}", String(total))}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder={t("admin.leads.searchPlaceholder")}
                    className="ps-9 w-64"
                  />
                </div>
                <Select value={sort} onValueChange={(v) => { setSort(v as typeof sort); setPage(1); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t("admin.leads.sort.newest")}</SelectItem>
                    <SelectItem value="oldest">{t("admin.leads.sort.oldest")}</SelectItem>
                    <SelectItem value="name">{t("admin.leads.sort.name")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2" disabled={rows.length === 0}>
                  <Download className="size-4" /> {t("admin.leads.export")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="p-3 text-start">{t("admin.leads.col.name")}</th>
                    <th className="p-3 text-start">{t("admin.leads.col.mobile")}</th>
                    <th className="p-3 text-start">{t("admin.leads.col.interest")}</th>
                    <th className="p-3 text-start">{t("admin.leads.col.profile")}</th>
                    <th className="p-3 text-start">{t("admin.leads.col.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isFetching && rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 font-mono text-xs" dir="ltr">
                        <a href={`tel:${r.mobile}`} className="inline-flex items-center gap-1 hover:underline">
                          <Phone className="size-3" />{r.mobile}
                        </a>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{r.interest || "—"}</td>
                      <td className="p-3 text-xs">
                        {r.profile_username ? (
                          <a href={`/u/${r.profile_username}`} target="_blank" rel="noreferrer" className="hover:underline">
                            @{r.profile_username}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{r.profile_full_name || "—"}</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString(locale)}</td>
                    </tr>
                  ))}
                  {!query.isFetching && rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">{t("admin.leads.empty")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">{t("admin.common.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}