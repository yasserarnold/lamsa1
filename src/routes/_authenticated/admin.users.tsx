import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { amIAdmin, listAllUsers, setUserRole, banUser } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight, ExternalLink, Ban, CircleCheck, Eye, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin — Users" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const listFn = useServerFn(listAllUsers);
  const setRoleFn = useServerFn(setUserRole);
  const banFn = useServerFn(banUser);

  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;

  useEffect(() => {
    if (adminQuery.data && !adminQuery.data.isAdmin) {
      toast.error(t("admin.common.adminOnly"));
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminQuery.data, navigate]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft" | "banned">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "recently_active" | "name">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const usersQuery = useQuery({
    queryKey: qk.admin.users({ q, status, sort, page }),
    queryFn: () => listFn({ data: { q: q || undefined, status, sort, page, pageSize } }),
    enabled: isAdmin,
  });

  const [exporting, setExporting] = useState(false);
  async function exportCsv() {
    try {
      setExporting(true);
      const res = await listFn({ data: { q: q || undefined, status, sort, page: 1, pageSize: 1000 } });
      const rows = res.rows ?? [];
      const header = ["created_at", "username", "full_name", "email", "phone", "status", "roles", "links_count", "cards_count", "leads_count"];
      const body = rows.map((u: any) => [
        u.created_at,
        u.username ?? "",
        u.full_name ?? "",
        u.email ?? "",
        u.phone ?? "",
        u.is_banned ? "banned" : u.is_published ? "published" : "draft",
        (u.roles ?? []).join("|"),
        u.links_count,
        u.cards_count,
        u.leads_count,
      ].map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","));
      const csv = `\uFEFF${header.join(",")}\n${body.join("\n")}\n`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("admin.users.exportSuccess").replace("{count}", String(rows.length)));
    } catch (e) {
      toastError(e, t("admin.users.exportFail"));
    } finally {
      setExporting(false);
    }
  }

  const mutation = useMutation({
    mutationFn: (v: { user_id: string; grant: boolean }) =>
      setRoleFn({ data: { user_id: v.user_id, role: "admin", grant: v.grant } }),
    onSuccess: (_, v) => {
      toast.success(v.grant ? t("admin.users.promoteSuccess") : t("admin.users.demoteSuccess"));
      qc.invalidateQueries({ queryKey: qk.admin.users() });
    },
    onError: (e) => toastError(e),
  });

  const banMutation = useMutation({
    mutationFn: (v: { user_id: string; ban: boolean; reason?: string }) =>
      banFn({ data: { user_id: v.user_id, ban: v.ban, reason: v.reason } }),
    onSuccess: (_, v) => {
      toast.success(v.ban ? t("admin.users.banSuccess") : t("admin.users.unbanSuccess"));
      qc.invalidateQueries({ queryKey: qk.admin.users() });
    },
    onError: (e) => toastError(e),
  });

  if (adminQuery.isPending) {
    return (
      <AdminShell>
        <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin" /></div>
      </AdminShell>
    );
  }
  if (!isAdmin) return null;

  const rows = usersQuery.data?.rows ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">{t("admin.users.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.users.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">{t("admin.users.listTitle").replace("{count}", String(total))}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder={t("admin.users.searchPlaceholder")}
                    className="ps-9"
                  />
                </div>
                <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.users.filter.statusAll")}</SelectItem>
                    <SelectItem value="published">{t("admin.users.filter.published")}</SelectItem>
                    <SelectItem value="draft">{t("admin.users.filter.draft")}</SelectItem>
                    <SelectItem value="banned">{t("admin.users.filter.banned")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => { setSort(v as typeof sort); setPage(1); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t("admin.users.sort.newest")}</SelectItem>
                    <SelectItem value="oldest">{t("admin.users.sort.oldest")}</SelectItem>
                    <SelectItem value="recently_active">{t("admin.users.sort.recentlyActive")}</SelectItem>
                    <SelectItem value="name">{t("admin.users.sort.name")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportCsv} disabled={exporting} className="gap-2">
                  {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {t("admin.users.export")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="p-3 text-start">{t("admin.users.col.user")}</th>
                    <th className="p-3 text-start">{t("admin.users.col.contact")}</th>
                    <th className="p-3 text-start">{t("admin.users.col.status")}</th>
                    <th className="p-3 text-start">{t("admin.users.col.links")}</th>
                    <th className="p-3 text-start">{t("admin.users.col.cards")}</th>
                    <th className="p-3 text-start">{t("admin.users.col.leads")}</th>
                    <th className="p-3 text-start">{t("admin.users.col.role")}</th>
                    <th className="p-3 text-start"></th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.isFetching && rows.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
                  )}
                  {rows.map((u: any) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="size-8 rounded-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium">
                              {(u.full_name || u.username || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.full_name || u.username || t("admin.common.dash")}</p>
                            <p className="truncate text-xs text-muted-foreground">@{u.username ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        <div className="min-w-0 max-w-[200px]">
                          <p className="truncate" dir="ltr">{u.email || t("admin.common.dash")}</p>
                          <p className="truncate text-muted-foreground" dir="ltr">{u.phone || ""}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        {u.is_banned ? (
                          <Badge variant="destructive" className="text-[10px] gap-1"><Ban className="size-3" />{t("admin.users.banned")}</Badge>
                        ) : u.is_published ? (
                          <Badge className="text-[10px]">{t("admin.users.published")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">{t("admin.users.draft")}</Badge>
                        )}
                      </td>
                      <td className="p-3 text-xs">{u.links_count}</td>
                      <td className="p-3 text-xs">{u.cards_count}</td>
                      <td className="p-3 text-xs">{u.leads_count}</td>
                      <td className="p-3">
                        {u.is_admin ? (
                          <Badge variant="default" className="gap-1 text-[10px]"><ShieldCheck className="size-3" />{t("admin.users.roleAdmin")}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">{t("admin.users.roleUser")}</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Button asChild size="sm" variant="ghost" className="h-8" title={t("admin.users.details")}>
                            <Link to="/admin/users/$userId" params={{ userId: u.id }}><Eye className="size-3.5" /></Link>
                          </Button>
                          {u.username && (
                            <Button asChild size="sm" variant="ghost" className="h-8">
                              <a href={`/u/${u.username}`} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /></a>
                            </Button>
                          )}
                          {u.is_banned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5"
                              disabled={banMutation.isPending}
                              onClick={() => banMutation.mutate({ user_id: u.id, ban: false })}
                            >
                              <CircleCheck className="size-3.5" /> {t("admin.users.activate")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 gap-1.5"
                              disabled={banMutation.isPending}
                              onClick={() => {
                                const reason = prompt(t("admin.users.banReasonPrompt")) ?? undefined;
                                if (confirm(t("admin.users.banConfirm").replace("{name}", u.full_name || u.username || t("admin.users.banConfirmFallback")))) {
                                  banMutation.mutate({ user_id: u.id, ban: true, reason });
                                }
                              }}
                            >
                              <Ban className="size-3.5" /> {t("admin.users.ban")}
                            </Button>
                          )}
                          {u.is_admin ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5"
                              disabled={mutation.isPending}
                              onClick={() => {
                                if (confirm(t("admin.users.removeAdminConfirm").replace("{name}", u.full_name || u.username || t("admin.users.removeAdminFallback")))) {
                                  mutation.mutate({ user_id: u.id, grant: false });
                                }
                              }}
                            >
                              <ShieldOff className="size-3.5" /> {t("admin.users.removeAdmin")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5"
                              disabled={mutation.isPending}
                              onClick={() => mutation.mutate({ user_id: u.id, grant: true })}
                            >
                              <ShieldCheck className="size-3.5" /> {t("admin.users.promote")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!usersQuery.isFetching && rows.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">{t("admin.users.empty")}</td></tr>
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