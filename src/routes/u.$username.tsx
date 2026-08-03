import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicProfile, submitLead } from "@/lib/profile.functions";
import { buildVCard } from "@/lib/vcard";
import { publicProfileUrl } from "@/lib/public-url";
import { LinkTile } from "@/features/profile/LinkTile";
import { ProfileBreadcrumb } from "@/features/profile/ProfileBreadcrumb";
import { useLanguage } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { Download, Send, Loader2, QrCode, Share2, Phone, Mail, Globe, ArrowRightLeft } from "lucide-react";

import { trackProfileView, trackQrShare, trackShare, trackVCard } from "@/lib/track-tap";

type LinkRow = { id: string; type: string; label: string; value: string; position: number };

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => {
    const data = await getPublicProfile({ data: { username: params.username } });
    if (!data.profile) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData?.profile) {
      return { meta: [{ title: "غير موجود" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.profile;
    const title = `${p.full_name || p.username} — لمسة`;
    const desc = p.bio || p.title || `بروفايل ${p.full_name || p.username} على لمسة`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: `/u/${params.username}` },
    ];
    if (p.avatar_signed_url) {
      meta.push({ property: "og:image", content: p.avatar_signed_url });
      meta.push({ name: "twitter:image", content: p.avatar_signed_url });
    }
    const seenType = new Set<string>();
    const first = (t: string) => {
      const l = (loaderData.links ?? []).find(
        (x) => x.type === t && x.value && x.value.trim().length > 0,
      );
      if (!l) return null;
      if (seenType.has(l.type)) return null;
      seenType.add(l.type);
      return l.value.trim();
    };
    const telephone = first("phone");
    const email = first("email");
    const website = first("website");

    const SOCIAL_TYPES = [
      "instagram", "linkedin", "twitter", "youtube", "facebook",
      "tiktok", "github", "telegram", "whatsapp", "messenger",
    ];
    const seenSame = new Set<string>();
    const sameAs: string[] = [];
    for (const l of loaderData.links ?? []) {
      if (!SOCIAL_TYPES.includes(l.type)) continue;
      const v = (l.value ?? "").trim();
      if (!v) continue;
      if (seenSame.has(l.type)) continue;
      seenSame.add(l.type);
      const url =
        l.type === "whatsapp"
          ? (v.startsWith("http") ? v : `https://wa.me/${v.replace(/[^0-9]/g, "")}`)
          : v.startsWith("http") ? v : `https://${v}`;
      sameAs.push(url);
    }

    const person: Record<string, unknown> = {
      "@type": "Person",
      name: p.full_name || p.username,
      ...(p.title ? { jobTitle: p.title } : {}),
      ...(p.bio ? { description: p.bio } : {}),
      ...(p.avatar_signed_url ? { image: p.avatar_signed_url } : {}),
      ...(telephone ? { telephone } : {}),
      ...(email ? { email } : {}),
      ...(website ? { url: website.startsWith("http") ? website : `https://${website}` } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
    };

    return {
      meta,
      links: [{ rel: "canonical", href: `/u/${params.username}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: person,
          }),
        },
      ],
    };
  },
  errorComponent: ({ error }) => {
    const { t } = useLanguage();
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">{t("pub.profile.notFound.title")}</h1>
          <p className="mt-2 text-muted-foreground">{error.message}</p>
          <Button asChild className="mt-6"><Link to="/">{t("pub.profile.notFound.back")}</Link></Button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => {
    const { username } = Route.useParams();
    const { t } = useLanguage();
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6">
        <article className="mx-auto max-w-md px-5">
          <ProfileBreadcrumb username={username} displayName={`@${username}`} />
          <div className="mt-10 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-5xl font-bold text-primary">404</h1>
            <p className="mt-4 text-lg font-semibold">{t("pub.profile.404.title")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("pub.profile.404.desc1")} <span className="font-mono" dir="ltr">@{username}</span>{t("pub.profile.404.desc2")}
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/">{t("pub.profile.404.backHome")}</Link>
            </Button>
          </div>
        </article>
      </div>
    );
  },
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const data = Route.useLoaderData() as {
    profile: {
      id: string;
      username: string | null;
      full_name: string | null;
      title: string | null;
      bio: string | null;
      avatar_signed_url: string | null;
      cover_signed_url: string | null;
      updated_at: string;
    };
    links: LinkRow[];
  };
  const p = data.profile;
  const links: LinkRow[] = data.links;
  const { t } = useLanguage();

  const submit = useServerFn(submitLead);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [interest, setInterest] = useState("");
  const [leadDone, setLeadDone] = useState(false);
  const [vcardOpen, setVcardOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const shareUrl = p.username ? publicProfileUrl(p.username) : "";

  const heroImageUrl = p.cover_signed_url || p.avatar_signed_url;

  const phoneLink = links.find((l) => {
    if (!l.value || !l.value.trim()) return false;
    const t = l.type?.toLowerCase();
    const v = l.value.trim();
    return t === "phone" || t === "whatsapp" || t === "wabusiness" || /^[+0-9\s()-]{6,}$/.test(v);
  });

  const emailLink = links.find((l) => {
    if (!l.value || !l.value.trim()) return false;
    const t = l.type?.toLowerCase();
    const v = l.value.trim();
    return t === "email" || (v.includes("@") && v.includes("."));
  });

  const websiteLink = links.find((l) => {
    if (!l.value || !l.value.trim()) return false;
    const t = l.type?.toLowerCase();
    const v = l.value.trim();
    return t === "website" || t === "url" || t === "custom" || v.startsWith("http") || (v.includes(".") && !v.includes("@"));
  });

  const cleanPhone = phoneLink
    ? phoneLink.value.trim().replace(/^tel:/i, "").replace(/\s/g, "")
    : null;

  const cleanEmail = emailLink
    ? emailLink.value.trim().replace(/^mailto:/i, "")
    : null;

  const cleanWebsite = websiteLink
    ? websiteLink.value.trim().startsWith("http")
      ? websiteLink.value.trim()
      : `https://${websiteLink.value.trim()}`
    : null;

  useEffect(() => {
    trackProfileView(p.id, p.username);
  }, [p.id, p.username]);

  async function openQr() {
    setQrOpen(true);
    trackQrShare(p.id, "open");
    if (!qrDataUrl && shareUrl) {
      try {
        const { default: QRCode } = await import("qrcode");
        setQrDataUrl(await QRCode.toDataURL(shareUrl, { width: 512, margin: 1 }));
      } catch {
        toast.error(t("pub.profile.toast.qrFail"));
      }
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${p.username}.png`;
    a.click();
    trackQrShare(p.id, "download");
  }

  async function handleShare() {
    if (!shareUrl) return;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: p.full_name || p.username || t("pub.brand.name"), url: shareUrl });
        trackShare(p.id, "native");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      trackShare(p.id, "copy");
      toast.success(t("pub.profile.toast.linkCopied"));
    } catch {
      // user cancelled share
    }
  }

  useEffect(() => {
    const QUICK = ["phone", "email", "website"] as const;
    const counts: Record<string, number> = {};
    for (const l of links) {
      if (!l.value || !l.value.trim()) continue;
      if ((QUICK as readonly string[]).includes(l.type)) {
        counts[l.type] = (counts[l.type] ?? 0) + 1;
      }
    }
    const dupes = Object.entries(counts).filter(([, n]) => n > 1);
    if (dupes.length > 0) {
      console.warn(
        "[lamsa] duplicate quick links detected for profile",
        p.username,
        dupes.map(([type, count]) => ({ type, count })),
      );
    }
  }, [links, p.username]);

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          profile_id: p.id,
          name: name.trim(),
          mobile: mobile.trim(),
          interest: interest.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(t("pub.profile.lead.toast.success"));
      setLeadDone(true);
      setTimeout(() => setLeadOpen(false), 1200);
    },
    onError: (e) => toastError(e, t("pub.profile.lead.toast.fail")),
  });

  function handleDownloadVCard() {
    const vcard = buildVCard({
      fullName: p.full_name || p.username || "",
      title: p.title,
      bio: p.bio,
      url: p.username ? publicProfileUrl(p.username) : null,
      links: links.map((l) => ({ type: l.type as never, label: l.label, value: l.value })),
    });
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profile-${p.username}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    trackVCard(p.id);
    setVcardOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-0 sm:py-6">
      <article className="mx-auto max-w-md bg-white dark:bg-slate-900 min-h-screen sm:min-h-0 sm:rounded-3xl shadow-sm overflow-hidden flex flex-col border-x border-slate-200/60 dark:border-slate-800">
        {/* Top Header / Profile Photo Banner */}
        <div className="relative w-full h-[280px] sm:h-[320px] bg-slate-900 shrink-0">
          {heroImageUrl ? (
            <img
              src={`${heroImageUrl}${heroImageUrl.includes("?") ? "&" : "?"}v=${p.updated_at}`}
              alt={p.full_name || ""}
              className="h-full w-full object-cover object-top"
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-800 to-slate-950 text-6xl font-bold text-white/20">
              {(p.full_name || p.username || "?").charAt(0).toUpperCase()}
            </div>
          )}
          {/* Subtle Overlays for Top Header */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-transparent pointer-events-none" />
        </div>

        {/* Main Body */}
        <div className="relative px-5 pt-1 pb-8 flex-1 flex flex-col -mt-4">
          <ProfileBreadcrumb username={p.username || ""} displayName={p.full_name} />

          {/* User Info */}
          <div className="mt-2 text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {p.full_name || p.username}
            </h1>
            {p.title && (
              <p className="mt-0.5 text-sm sm:text-base font-normal text-slate-500 dark:text-slate-400">
                {p.title}
              </p>
            )}
            {p.bio && (
              <p className="mt-1 text-xs sm:text-sm font-normal text-slate-400 dark:text-slate-500">
                {p.bio}
              </p>
            )}
          </div>

          {/* 3 Action Icon Pills */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <a
              href={cleanPhone ? `tel:${cleanPhone}` : "#"}
              onClick={(e) => { if (!cleanPhone) { e.preventDefault(); setVcardOpen(true); } }}
              aria-label="Phone"
              className="flex h-11 w-20 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Phone className="size-5" />
            </a>
            <a
              href={cleanEmail ? `mailto:${cleanEmail}` : "#"}
              onClick={(e) => { if (!cleanEmail) { e.preventDefault(); setVcardOpen(true); } }}
              aria-label="Email"
              className="flex h-11 w-20 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Mail className="size-5" />
            </a>
            <a
              href={cleanWebsite ?? "#"}
              target={cleanWebsite ? "_blank" : undefined}
              rel={cleanWebsite ? "noreferrer noopener" : undefined}
              onClick={(e) => { if (!cleanWebsite) { e.preventDefault(); handleShare(); } }}
              aria-label="Website"
              className="flex h-11 w-20 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe className="size-5" />
            </a>
          </div>

          {/* Primary CTA Row */}
          <div className="mt-5 flex items-center gap-3">
            <Button
              onClick={() => setVcardOpen(true)}
              className="h-14 flex-1 rounded-full bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 text-white font-medium text-base sm:text-lg shadow-md transition-all active:scale-[0.99]"
            >
              {t("pub.profile.connectWithMe")}
            </Button>
            <Button
              onClick={() => { setLeadDone(false); setLeadOpen(true); }}
              aria-label={t("pub.profile.stayInTouch")}
              className="size-14 shrink-0 rounded-full bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 text-white flex items-center justify-center shadow-md transition-all active:scale-[0.99]"
            >
              <ArrowRightLeft className="size-6" />
            </Button>
          </div>

          {/* Secondary Actions: Share + QR */}
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <Button onClick={handleShare} variant="outline" className="h-10 rounded-full gap-2 text-xs font-semibold border-slate-200 dark:border-slate-800">
              <Share2 className="size-4" />
              {t("pub.profile.share")}
            </Button>
            <Button onClick={openQr} variant="outline" className="h-10 rounded-full gap-2 text-xs font-semibold border-slate-200 dark:border-slate-800">
              <QrCode className="size-4" />
              {t("pub.profile.qr")}
            </Button>
          </div>

          <Dialog open={qrOpen} onOpenChange={setQrOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("pub.profile.qr.title")}</DialogTitle>
                <DialogDescription>{t("pub.profile.qr.desc")}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-2">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`${t("pub.profile.qr.alt")} ${p.full_name || p.username}`} className="size-56 rounded-xl bg-white p-2" />
                ) : (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                )}
              </div>
              <DialogFooter>
                <Button onClick={downloadQr} disabled={!qrDataUrl} className="gap-2">
                  <Download className="size-4" />
                  {t("pub.profile.qr.download")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Links Grid */}
          {(() => {
            const QUICK = ["phone", "email", "website"] as const;
            const seen = new Set<string>();
            const tiles = links.filter((l) => {
              if (!l.value || !l.value.trim()) return false;
              if (seen.has(l.type)) return false;
              seen.add(l.type);
              return true;
            });
            const hasAnyQuick = Boolean(cleanPhone || cleanEmail || cleanWebsite);

            if (tiles.length === 0) {
              return (
                <div
                  className="mt-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 text-center"
                  data-testid="link-grid-empty"
                >
                  <p className="text-sm font-medium text-foreground/80">
                    {t("pub.profile.links.emptyTitle")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("pub.profile.links.emptyDesc")}
                  </p>
                </div>
              );
            }

            return (
              <>
                <div
                  className="mt-6 grid grid-cols-3 gap-3.5 sm:gap-4"
                  data-testid="link-grid"
                >
                  {tiles.map((l) => (
                    <LinkTile key={l.id} link={l} profileId={p.id} />
                  ))}
                </div>
                {!hasAnyQuick && (
                  <p
                    className="mt-3 text-center text-xs text-muted-foreground"
                    data-testid="quick-links-missing"
                  >
                    {t("pub.profile.links.missingQuick")}
                  </p>
                )}
              </>
            );
          })()}

          <div className="pt-8 pb-2 text-center text-xs text-muted-foreground">
            {t("pub.profile.poweredBy")} <Link to="/" className="font-brand text-lg text-primary">{t("pub.brand.name")}</Link>
          </div>
        </div>
      </article>

      {/* Lead form dialog */}
      <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">{t("pub.profile.lead.title")}</DialogTitle>
            <DialogDescription className="text-center">
              {t("pub.profile.lead.desc")}
            </DialogDescription>
          </DialogHeader>
          {leadDone ? (
            <div className="py-6 text-center">
              <p className="text-lg font-semibold">{t("pub.profile.lead.doneTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("pub.profile.lead.doneDesc")}</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="lead-name">{t("pub.profile.lead.name")}</Label>
                <Input id="lead-name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              </div>
              <div>
                <Label htmlFor="lead-mobile">{t("pub.profile.lead.mobile")}</Label>
                <Input id="lead-mobile" required value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={32} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="lead-interest">{t("pub.profile.lead.interest")}</Label>
                <Textarea id="lead-interest" rows={2} value={interest} onChange={(e) => setInterest(e.target.value)} maxLength={300} />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {t("pub.profile.lead.submit")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={vcardOpen} onOpenChange={setVcardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pub.profile.vcard.title")}</DialogTitle>
            <DialogDescription>
              {t("pub.profile.vcard.descPrefix")} {p.full_name || p.username} {t("pub.profile.vcard.descSuffix")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/40 p-4 text-sm">
            <p className="font-semibold">{p.full_name}</p>
            {p.title && <p className="text-muted-foreground">{p.title}</p>}
            {links.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {links.slice(0, 4).map((l) => (
                  <li key={l.id}>• {l.label}</li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVcardOpen(false)}>{t("pub.profile.vcard.cancel")}</Button>
            <Button onClick={handleDownloadVCard} className="gap-2">
              <Download className="size-4" />
              {t("pub.profile.vcard.download")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}