import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { amIAdmin, getUserDetail, banUser, setUserRole } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, ArrowRight, Ban, CircleCheck, ShieldCheck, ShieldOff, ExternalLink,
  Mail, Phone, Calendar, CreditCard, Inbox, Activity, ScrollText, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({
  head: () => ({
    meta: [
      { title: "Admin — User details" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UserDetailPage,
});

function fmt(d: string | null, locale: string) {
  return d ? new Date(d).toLocaleString(locale) : "—";
}

function actionLabel(a: string, t: (k: any) => string) {
  const map: Record<string, string> = {
    user_banned: t("admin.userDetail.action.banned"),
    user_unbanned: t("admin.userDetail.action.unbanned"),
    role_granted: t("admin.userDetail.action.roleGranted"),
    role_revoked: t("admin.userDetail.action.roleRevoked"),
    card_scan_import: t("admin.userDetail.action.cardScanImport"),
  };
  return map[a] ?? a;
}

function UserDetailPage() {
  const { t, locale } = useLanguage();
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const detailFn = useServerFn(getUserDetail);
  const banFn = useServerFn(banUser);
  const roleFn = useServerFn(setUserRole);

  const [period, setPeriod] = useState<"all" | "24h" | "7d" | "30d" | "90d">("all");
  const [actionType, setActionType] = useState<string>("all");

  const { from, to } = useMemo(() => {
    if (period === "all") return { from: undefined as string | undefined, to: undefined as string | undefined };
    const now = new Date();
    const dMs = period === "24h" ? 864e5 : period === "7d" ? 7 * 864e5 : period === "30d" ? 30 * 864e5 : 90 * 864e5;
    return { from: new Date(now.getTime() - dMs).toISOString(), to: now.toISOString() };
  }, [period]);

  const actionTypes = actionType === "all" ? undefined : [actionType];

  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;
  useEffect(() => {
    if (adminQuery.data && !adminQuery.data.isAdmin) {
      toast.error(t("admin.common.adminOnly"));
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminQuery.data, navigate]);

  const detail = useQuery({
    queryKey: qk.admin.userDetail(userId, { period, actionType }),
    queryFn: () => detailFn({ data: { user_id: userId, from, to, action_types: actionTypes } }),
    enabled: isAdmin,
  });

  const banMut = useMutation({
    mutationFn: (v: { ban: boolean; reason?: string }) =>
      banFn({ data: { user_id: userId, ban: v.ban, reason: v.reason } }),
    onSuccess: (_, v) => {
      toast.success(v.ban ? t("admin.users.banSuccess") : t("admin.users.unbanSuccess"));
      qc.invalidateQueries({ queryKey: qk.admin.userDetail(userId) });
    },
    onError: (e) => toastError(e),
  });

  const roleMut = useMutation({
    mutationFn: (v: { grant: boolean }) =>
      roleFn({ data: { user_id: userId, role: "admin", grant: v.grant } }),
    onSuccess: (_, v) => {
      toast.success(v.grant ? t("admin.userDetail.promoteSuccess") : t("admin.userDetail.demoteSuccess"));
      qc.invalidateQueries({ queryKey: qk.admin.userDetail(userId) });
    },
    onError: (e) => toastError(e),
  });

  if (adminQuery.isPending || (isAdmin && detail.isPending)) {
    return (
      <AdminShell>
        <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin" /></div>
      </AdminShell>
    );
  }
  if (!isAdmin) return null;
  if (!detail.data) return (
    <AdminShell>
      <p className="text-sm text-muted-foreground">{t("admin.userDetail.notFound")}</p>
    </AdminShell>
  );

  const p = detail.data.profile;
  const auth = detail.data.auth;
  const isAdminRole = detail.data.roles.includes("admin");

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="sm"><Link to="/admin/users"><ArrowRight className="size-4" /></Link></Button>
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="size-12 rounded-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="grid size-12 place-items-center rounded-full bg-muted text-sm font-medium">
                {(p.full_name || p.username || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold truncate">{p.full_name || p.username || t("admin.common.dash")}</h2>
              <p className="text-sm text-muted-foreground truncate">@{p.username ?? t("admin.common.dash")}{p.title ? ` — ${p.title}` : ""}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {p.username && (
              <Button asChild size="sm" variant="outline" className="gap-2">
                <a href={`/u/${p.username}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />{t("admin.userDetail.visitProfile")}</a>
              </Button>
            )}
            {isAdminRole ? (
              <Button size="sm" variant="outline" className="gap-2" disabled={roleMut.isPending}
                onClick={() => { if (confirm(t("admin.userDetail.removeAdminConfirm"))) roleMut.mutate({ grant: false }); }}>
                <ShieldOff className="size-4" /> {t("admin.userDetail.removeAdmin")}
              </Button>
            ) : (
              <Button size="sm" className="gap-2" disabled={roleMut.isPending}
                onClick={() => roleMut.mutate({ grant: true })}>
                <ShieldCheck className="size-4" /> {t("admin.userDetail.promote")}
              </Button>
            )}
            {p.is_banned ? (
              <Button size="sm" variant="outline" className="gap-2" disabled={banMut.isPending}
                onClick={() => banMut.mutate({ ban: false })}>
                <CircleCheck className="size-4" /> {t("admin.userDetail.activate")}
              </Button>
            ) : (
              <Button size="sm" variant="destructive" className="gap-2" disabled={banMut.isPending}
                onClick={() => {
                  const reason = prompt(t("admin.userDetail.banReasonPrompt")) ?? undefined;
                  if (confirm(t("admin.userDetail.banConfirm"))) {
                    banMut.mutate({ ban: true, reason });
                  }
                }}>
                <Ban className="size-4" /> {t("admin.userDetail.ban")}
              </Button>
            )}
          </div>
        </div>

        {p.is_banned && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Ban className="size-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">{t("admin.userDetail.bannedTitle")}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {t("admin.userDetail.bannedSince").replace("{date}", fmt(p.banned_at, locale))}{p.ban_reason ? ` — ${p.ban_reason}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("admin.userDetail.accountInfoTitle")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row icon={Mail} label={t("admin.userDetail.email")} value={auth?.email} dir="ltr" />
              <Row icon={Phone} label={t("admin.userDetail.phone")} value={auth?.phone} dir="ltr" />
              <Row icon={Calendar} label={t("admin.userDetail.createdAt")} value={fmt(auth?.created_at ?? p.created_at, locale)} />
              <Row icon={Activity} label={t("admin.userDetail.lastSignIn")} value={fmt(auth?.last_sign_in_at ?? null, locale)} />
              <Row icon={CircleCheck} label={t("admin.userDetail.emailConfirmed")} value={fmt(auth?.email_confirmed_at ?? null, locale)} />
              <div className="pt-2 flex flex-wrap gap-1.5">
                {detail.data.roles.map((r: string) => (
                  <Badge key={r} variant={r === "admin" ? "default" : "outline"} className="text-[10px]">{r}</Badge>
                ))}
                {p.is_published ? <Badge className="text-[10px]">{t("admin.userDetail.published")}</Badge> : <Badge variant="secondary" className="text-[10px]">{t("admin.userDetail.draft")}</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="size-4 text-[var(--gold)]" />{t("admin.userDetail.actionsTitle")}</CardTitle>
                  <CardDescription>{t("admin.userDetail.actionsDesc")}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="size-3.5 text-muted-foreground" />
                  <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.userDetail.filter.periodAll")}</SelectItem>
                      <SelectItem value="24h">{t("admin.userDetail.filter.24h")}</SelectItem>
                      <SelectItem value="7d">{t("admin.userDetail.filter.7d")}</SelectItem>
                      <SelectItem value="30d">{t("admin.userDetail.filter.30d")}</SelectItem>
                      <SelectItem value="90d">{t("admin.userDetail.filter.90d")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.userDetail.filter.actionAll")}</SelectItem>
                      <SelectItem value="user_banned">{t("admin.userDetail.action.banned")}</SelectItem>
                      <SelectItem value="user_unbanned">{t("admin.userDetail.action.unbanned")}</SelectItem>
                      <SelectItem value="role_granted">{t("admin.userDetail.action.roleGranted")}</SelectItem>
                      <SelectItem value="role_revoked">{t("admin.userDetail.action.roleRevoked")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {detail.data.admin_actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("admin.userDetail.actionsEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {detail.data.admin_actions.map((a: { id?: string; action?: string | null; metadata?: Record<string, unknown> | null; created_at?: string | null }) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3 text-sm">
                      <div>
                        <p className="font-medium">{actionLabel(a.action ?? "", t)}</p>
                        {a.metadata && Object.keys(a.metadata as object).length > 0 && (
                          <p className="text-xs text-muted-foreground" dir="ltr">{JSON.stringify(a.metadata)}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">{fmt(a.created_at ?? null, locale)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-[var(--gold)]" />{t("admin.userDetail.nfcTitle")}</CardTitle>
              <CardDescription>{t("admin.userDetail.nfcDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.data.card_events.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("admin.userDetail.nfcEmpty")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.data.card_events.map((e: { id?: string; event_type?: string | null; card_uid?: string | null; created_at?: string | null }) => (
                    <li key={e.id} className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                        <span className="font-mono" dir="ltr">{e.card_uid}</span>
                      </span>
                      <span className="text-muted-foreground">{fmt(e.created_at ?? null, locale)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Inbox className="size-4 text-[var(--gold)]" />{t("admin.userDetail.leadsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.data.leads.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("admin.userDetail.leadsEmpty")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.data.leads.map((l: { id?: string; name?: string | null; mobile?: string | null; interest?: string | null; created_at?: string | null }) => (
                    <li key={l.id} className="flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">{l.name}</p>
                        <p className="truncate text-muted-foreground" dir="ltr">{l.mobile}{l.interest ? ` — ${l.interest}` : ""}</p>
                      </div>
                      <span className="text-muted-foreground shrink-0">{fmt(l.created_at ?? null, locale)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="size-4 text-[var(--gold)]" />{t("admin.userDetail.cardsTitle").replace("{count}", String(detail.data.cards.length))}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.data.cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.userDetail.cardsEmpty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="p-2 text-start">{t("admin.userDetail.col.uid")}</th>
                      <th className="p-2 text-start">{t("admin.userDetail.col.status")}</th>
                      <th className="p-2 text-start">{t("admin.userDetail.col.official")}</th>
                      <th className="p-2 text-start">{t("admin.userDetail.col.lastWritten")}</th>
                      <th className="p-2 text-start">{t("admin.userDetail.col.activated")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.cards.map((c: { id?: string; card_uid?: string | null; status?: string | null; is_official?: boolean | null; last_written_at?: string | null; activated_at?: string | null }) => (
                      <tr key={c.id} className="border-b border-border/40">
                        <td className="p-2 font-mono text-xs" dir="ltr">{c.card_uid}</td>
                        <td className="p-2"><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge></td>
                        <td className="p-2 text-xs">{c.is_official ? t("admin.common.yes") : t("admin.common.dash")}</td>
                        <td className="p-2 text-xs text-muted-foreground">{fmt(c.last_written_at ?? null, locale)}</td>
                        <td className="p-2 text-xs text-muted-foreground">{fmt(c.activated_at ?? null, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function Row({ icon: Icon, label, value, dir }: { icon: any; label: string; value?: string | null; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-muted-foreground text-xs"><Icon className="size-3.5" />{label}</span>
      <span className="truncate text-sm" dir={dir}>{value || "—"}</span>
    </div>
  );
}