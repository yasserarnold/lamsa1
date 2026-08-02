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
import { Download, Send, Loader2, UserPlus, PhoneCall, QrCode, Share2 } from "lucide-react";

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
    // Build contact fields from links, deduped by type to mirror the UI
    // (one entry per channel — phone/email/website never appear twice).
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
      <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-muted/20 py-6">
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

  // Count a page visit once per session for this profile.
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
      // user cancelled share — not an error
    }
  }

  // Warn when the same quick-link channel appears more than once so future
  // duplicates are easy to trace in the browser console.
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
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-muted/20 py-6">
      <article className="mx-auto max-w-md px-5">
        <ProfileBreadcrumb username={p.username || ""} displayName={p.full_name} />
        {/* Avatar */}
        <div className="flex justify-center pt-6">
          <div className="size-36 overflow-hidden rounded-full border-4 border-card bg-muted shadow-xl ring-1 ring-black/5">
            {p.avatar_signed_url ? (
              <img
                src={`${p.avatar_signed_url}${p.avatar_signed_url.includes("?") ? "&" : "?"}v=${p.updated_at}`}
                alt={p.full_name || ""}
                className="h-full w-full object-cover"
                width={144}
                height={144}
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-4xl font-bold text-muted-foreground">
                {(p.full_name || p.username || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Identity */}
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{p.full_name || p.username}</h1>
          {p.title && <p className="mt-1 text-[15px] text-muted-foreground">{p.title}</p>}
          {p.bio && <p className="mt-3 text-sm leading-relaxed text-foreground/70">{p.bio}</p>}
        </div>

        {/* Save contact */}
        <Button
          onClick={() => setVcardOpen(true)}
          className="mt-6 h-14 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-base font-semibold gap-2 shadow-md"
        >
          <UserPlus className="size-5" />
          {t("pub.profile.saveContact")}
        </Button>

        {/* Stay in touch — opens lead form */}
        <Button
          onClick={() => { setLeadDone(false); setLeadOpen(true); }}
          variant="outline"
          className="mt-3 h-14 w-full rounded-2xl text-base font-semibold gap-2 border-2"
        >
          <PhoneCall className="size-5" />
          {t("pub.profile.stayInTouch")}
        </Button>

        {/* Share + QR */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button onClick={handleShare} variant="secondary" className="h-12 rounded-2xl gap-2 font-semibold">
            <Share2 className="size-5" />
            {t("pub.profile.share")}
          </Button>
          <Button onClick={openQr} variant="secondary" className="h-12 rounded-2xl gap-2 font-semibold">
            <QrCode className="size-5" />
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

        {/* Single links section — all links live here. Deduped: one tile per
            type so the same channel never appears twice. */}
        {(() => {
          const QUICK = ["phone", "email", "website"] as const;
          const seen = new Set<string>();
          const tiles = links.filter((l) => {
            if (!l.value || !l.value.trim()) return false;
            if (seen.has(l.type)) return false;
            seen.add(l.type);
            return true;
          });
          const hasAnyQuick = QUICK.some((t) => seen.has(t));

          if (tiles.length === 0) {
            return (
              <div
                className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center"
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
                className="mt-8 grid grid-cols-3 gap-3 sm:gap-4"
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

        <div className="py-6 text-center text-xs text-muted-foreground">
          {t("pub.profile.poweredBy")} <Link to="/" className="font-brand text-lg text-primary">{t("pub.brand.name")}</Link>
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