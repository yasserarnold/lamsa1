import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
  getMyStats,
  getDashboardRecent,
} from "@/lib/profile.functions";
import { amIAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatError, toastError } from "@/lib/errors";
import {
  ExternalLink,
  Loader2,
  Link2,
  CreditCard,
  Users,
  Activity,
  Sparkles,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  ArrowUpRight,
  Plus,
  Radio,
  UserPlus,
} from "lucide-react";
import { qk } from "@/lib/query-keys";
import { AnalyticsPanel } from "@/features/dashboard/home/AnalyticsPanel";
import { publicProfileUrl } from "@/lib/public-url";
import { EmptyState } from "@/components/ui-ext/EmptyState";
import { ListSkeleton } from "@/components/ui-ext/ListSkeleton";
import { PanelCard } from "@/components/ui-ext/PanelCard";
import { KpiCard } from "@/features/dashboard/home/KpiCard";
import { QuickAction } from "@/features/dashboard/home/QuickAction";
import { ImageUploader } from "@/features/dashboard/home/ImageUploader";
import { ProfileSkeleton } from "@/features/dashboard/home/ProfileSkeleton";
import { PublicUrlsPanel } from "@/features/dashboard/home/PublicUrlsPanel";
import { eventLabel } from "@/features/dashboard/events/labels";
import { fileToBase64 } from "@/lib/file-utils";
import { relativeTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — لمسة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-bold">{"Error"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
});

function DashboardPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const getStats = useServerFn(getMyStats);
  const getRecent = useServerFn(getDashboardRecent);
  const updateProfile = useServerFn(updateMyProfile);
  const uploadImage = useServerFn(uploadProfileImage);
  const checkAdmin = useServerFn(amIAdmin);

  const profileQuery = useQuery({ queryKey: qk.profile.me(), queryFn: () => getProfile() });
  const statsQuery = useQuery({ queryKey: qk.profile.stats(), queryFn: () => getStats(), staleTime: 30_000 });
  const recentQuery = useQuery({ queryKey: qk.profile.recent(), queryFn: () => getRecent(), staleTime: 30_000 });
  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });

  const profile = profileQuery.data?.profile;
  const avatarUrl = profileQuery.data?.avatar_signed_url;
  const stats = statsQuery.data;
  const recent = recentQuery.data;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", title: "", bio: "", is_published: false });
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username ?? "",
        full_name: profile.full_name ?? "",
        title: profile.title ?? "",
        bio: profile.bio ?? "",
        is_published: profile.is_published ?? false,
      });
      setDirty(false);
    }
  }, [profile]);

  const publicPath = form.username ? `/u/${form.username}` : null;
  const publicUrl = useMemo(() => {
    if (!form.username) return publicPath;
    return publicProfileUrl(form.username);
  }, [publicPath]);

  const qrSrc = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&color=0d1f1a&bgcolor=f5f0e0&data=${encodeURIComponent(publicUrl)}`
    : null;

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        data: {
          username: form.username ? form.username.toLowerCase() : null,
          full_name: form.full_name || null,
          title: form.title || null,
          bio: form.bio || null,
          is_published: form.is_published,
        },
      }),
    onSuccess: async (result) => {
      qc.setQueryData(qk.profile.me(), (old: typeof profileQuery.data | undefined) => ({
        profile: result.profile,
        avatar_signed_url: old?.avatar_signed_url ?? null,
        cover_signed_url: old?.cover_signed_url ?? null,
      }));
      await qc.invalidateQueries({ queryKey: qk.profile.me() });
      toast.success(t("dash.home.toastProfileSaved"));
      setDirty(false);
      setEditing(false);
    },
    onError: (e) => toastError(e, t("dash.home.toastSaveFailed")),
  });

  const publishMutation = useMutation({
    mutationFn: (v: boolean) => updateProfile({ data: { is_published: v } }),
    onSuccess: () => {
      toast.success(t("dash.home.toastUpdated"));
      qc.invalidateQueries({ queryKey: qk.profile.me() });
    },
    onError: (e) => toastError(e, t("dash.home.toastUpdateFailed")),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ kind, file }: { kind: "avatar" | "cover"; file: File }) => {
      if (file.size > 5 * 1024 * 1024) throw new Error(t("dash.home.errMaxSize"));
      if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
        throw new Error(t("dash.home.errFormat"));
      }
      setUploadProgress(5);
      const base64 = await fileToBase64(file);
      setUploadProgress(25);
      // Simulate progress while the server does upload + DB confirm.
      const timer = window.setInterval(() => {
        setUploadProgress((p) => (p < 90 ? p + Math.max(1, Math.round((92 - p) / 8)) : p));
      }, 250);
      try {
        const res = await uploadImage({ data: { kind, filename: file.name, mime: file.type, base64 } });
        setUploadProgress(100);
        return res;
      } finally {
        window.clearInterval(timer);
      }
    },
    retry: (failureCount, error) => failureCount < 1 && /network|timeout|تعذّر الاتصال|مؤقت/i.test(formatError(error, "")),
    onSuccess: async (result, variables) => {
      qc.setQueryData(qk.profile.me(), (old: typeof profileQuery.data | undefined) => ({
        profile: result.profile,
        avatar_signed_url: variables.kind === "avatar" ? result.signedUrl : (old?.avatar_signed_url ?? null),
        cover_signed_url: variables.kind === "cover" ? result.signedUrl : (old?.cover_signed_url ?? null),
      }));
      await qc.invalidateQueries({ queryKey: qk.profile.me() });
      toast.success(t("dash.home.toastImageSaved"), { description: t("dash.home.toastImageSavedDesc") });
    },
    onError: (e) => {
      toast.error(t("dash.home.toastImageFailed"), {
        description: formatError(e, t("dash.home.errImageFailedDesc")),
      });
    },
    onSettled: () => {
      window.setTimeout(() => setUploadProgress(0), 400);
    },
  });


  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  async function copyPublic() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success(t("dash.home.toastCopyLink"), { description: publicUrl });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t("dash.home.errCopyFailed"));
    }
  }

  const needsOnboarding = profile && !profile.username;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <h1 className="sr-only">{t("dash.home.title")}</h1>
        {needsOnboarding && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-[var(--gold)]" />
              <div>
                <p className="font-semibold">{t("dash.home.onboardTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("dash.home.onboardDesc")}</p>
              </div>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/onboarding">
                {t("dash.home.onboardCta")} <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        )}

        {adminQuery.data?.isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-[var(--gold)]" />
              <p className="text-sm">
                <span className="font-semibold">{t("dash.home.adminPanel")}</span>
                <span className="ms-2 text-muted-foreground">{t("dash.home.adminDesc")}</span>
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/cards">{t("dash.home.adminEnter")}</Link>
            </Button>
          </div>
        )}

        <AnalyticsPanel />

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={Link2} label={t("dash.home.kpiLinks")} value={stats?.links} to="/dashboard/links" />
          <KpiCard icon={CreditCard} label={t("dash.home.kpiActiveCards")} value={recent?.activeCards} to="/dashboard/cards" accent />
          <KpiCard icon={Users} label={t("dash.home.kpiLeads")} value={stats?.leads} to="/dashboard/leads" />
          <div className="card-elevated flex items-center gap-3 rounded-2xl p-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]">
              <Activity className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("dash.home.kpiLastActivity")}</p>
              <p className="mt-0.5 truncate font-display text-base font-bold">
                {stats?.lastActivity
                  ? stats.lastActivity.kind === "lead" ? t("dash.home.activityLead") : t("dash.home.activityCard")
                  : t("dash.home.noActivity")}
              </p>
              {stats?.lastActivity && (
                <p className="text-xs text-muted-foreground">
                  {relativeTime(stats.lastActivity.at)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Hero: profile card + QR */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="card-elevated relative overflow-hidden rounded-3xl p-5 lg:col-span-2 lg:p-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[var(--gold)]/60 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--gold-soft)]">{t("dash.home.myProfile")}</p>
                <div className="mt-3 flex items-center gap-4">
                  <Avatar className="size-16 ring-2 ring-[var(--gold)]/40">
                    <AvatarImage src={avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="bg-[var(--emerald-deep)] text-[var(--gold)]">
                      {(profile?.full_name || "؟").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-xl font-bold">
                      {profile?.full_name || t("dash.home.addName")}
                    </h2>
                    <p className="truncate text-sm text-muted-foreground">
                      {profile?.title || t("dash.home.addTitle")}
                    </p>
                  </div>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  profile?.is_published
                    ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {profile?.is_published ? t("dash.home.published") : t("dash.home.draft")}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/40 p-2">
              <span className="rounded-lg bg-[var(--gold)]/10 px-2 py-1 font-mono text-xs text-[var(--gold-soft)]">
                /u/
              </span>
              <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-sm">
                {form.username || "username"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={copyPublic}
                disabled={!publicUrl}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {t("action.copy")}
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={!publicUrl}
              >
                <a href={publicUrl ?? "#"} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                  {t("dash.home.preview")}
                </a>
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Switch
                  aria-label={t("dash.home.publishAria")}
                  checked={form.is_published}
                  onCheckedChange={(v) => {
                    update("is_published", v);
                    publishMutation.mutate(v);
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{t("dash.home.publishProfile")}</p>
                  <p className="text-xs text-muted-foreground">{t("dash.home.publishHint")}</p>
                </div>
              </div>
              <Button
                variant="default"
                size="lg"
                className="h-12 rounded-2xl px-6 text-base font-semibold shadow-md"
                onClick={() => {
                  setEditing((e) => {
                    const next = !e;
                    if (next) {
                      requestAnimationFrame(() => {
                        document
                          .getElementById("profile-editor")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }
                    return next;
                  });
                }}
              >
                {editing ? t("dash.home.closeEdit") : t("dash.home.editProfile")}
              </Button>
            </div>
          </div>

          {/* QR card */}
          <div className="card-elevated relative flex flex-col items-center overflow-hidden rounded-3xl p-5 text-center">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[var(--gold)]/60 to-transparent" />
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
              <QrCode className="size-3.5" />
              {t("dash.home.qrCode")}
            </div>
            <div className="grid size-48 place-items-center rounded-2xl bg-[oklch(0.95_0.02_90)] p-2 shadow-inner">
              {qrSrc ? (
                <img src={qrSrc} alt={t("dash.home.qrAlt")} className="h-full w-full rounded-lg" loading="lazy" decoding="async" width={192} height={192} />
              ) : (
                <div className="grid h-full w-full place-items-center rounded-lg bg-[oklch(0.88_0.02_90)] text-xs text-[oklch(0.4_0.03_165)]">
                  {t("dash.home.chooseUsernameFirst")}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("dash.home.scanHint")}</p>
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickAction to="/dashboard/links" icon={Plus} label={t("dash.home.qaNewLink")} hint={t("dash.home.qaNewLinkHint")} />
          <QuickAction to="/dashboard/cards" icon={Radio} label={t("dash.home.qaLinkCard")} hint={t("dash.home.qaLinkCardHint")} />
          <QuickAction to="/dashboard/leads" icon={UserPlus} label={t("dash.home.qaLeads")} hint={t("dash.home.qaLeadsHint")} />
          <QuickAction to="/dashboard/events" icon={Activity} label={t("dash.home.qaEvents")} hint={t("dash.home.qaEventsHint")} />
        </section>

        <PublicUrlsPanel username={form.username || null} />

        {/* Recent Leads + NFC events */}
        <section className="grid gap-4 lg:grid-cols-2">
          <PanelCard title={t("dash.home.recentLeads")} icon={Users} action={{ to: "/dashboard/leads", label: t("dash.home.viewAll") }}>
            {recentQuery.isLoading ? (
              <ListSkeleton />
            ) : recent && recent.leads.length > 0 ? (
              <ul className="divide-y divide-border/50">
                {recent.leads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{lead.name}</p>
                      <p dir="ltr" className="truncate text-xs text-muted-foreground">{lead.mobile}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relativeTime(lead.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Users} text={t("dash.home.noLeadsYet")} />
            )}
          </PanelCard>

          <PanelCard title={t("dash.home.recentNfc")} icon={Radio} action={{ to: "/dashboard/events", label: t("dash.home.fullLog") }}>
            {recentQuery.isLoading ? (
              <ListSkeleton />
            ) : recent && recent.events.length > 0 ? (
              <ul className="divide-y divide-border/50">
                {recent.events.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-block size-2 rounded-full ${
                          ev.event_type === "written" ? "bg-[var(--gold)]" : "bg-primary"
                        }`}
                      />
                      <span className="text-sm font-semibold">{eventLabel(t, ev.event_type)}</span>
                      {ev.card_uid && (
                        <span dir="ltr" className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {ev.card_uid}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relativeTime(ev.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Radio} text={t("dash.home.noNfcYet")} />
            )}
          </PanelCard>
        </section>

        {/* Inline editor */}
        {editing && (
          <section id="profile-editor" className="card-elevated overflow-hidden rounded-3xl p-6 scroll-mt-24">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">{t("dash.home.editProfile")}</h2>
                <p className="text-sm text-muted-foreground">{t("dash.home.editHint")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>{t("action.close")}</Button>
            </div>

            {profileQuery.isLoading ? (
              <ProfileSkeleton />
            ) : (
              <div className="space-y-6">
                <div className="flex items-end gap-4">
                  <div>
                    <Label className="mb-2 block">{t("dash.home.avatarLabel")}</Label>
                    <ImageUploader
                      kind="avatar"
                      currentUrl={avatarUrl}
                      busy={uploadMutation.isPending}
                      progress={uploadProgress}
                      onFile={(file) => {
                        if (uploadMutation.isPending) return;
                        uploadMutation.mutate({ kind: "avatar", file });
                      }}
                    />

                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="username">{t("dash.home.usernameLabel")}</Label>
                    <Input
                      id="username"
                      dir="ltr"
                      placeholder="mohamed"
                      value={form.username}
                      onChange={(e) => update("username", e.target.value.toLowerCase())}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{t("dash.home.usernameHint")}</p>
                  </div>
                  <div>
                    <Label htmlFor="full_name">{t("dash.home.fullNameLabel")}</Label>
                    <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="title">{t("dash.home.titleLabel")}</Label>
                    <Input id="title" placeholder={t("dash.home.titlePlaceholder")} value={form.title} onChange={(e) => update("title", e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="bio">{t("dash.home.bioLabel")}</Label>
                    <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => update("bio", e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={!dirty || saveMutation.isPending}
                    className="gap-2"
                  >
                    {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                    {t("dash.home.saveChanges")}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
