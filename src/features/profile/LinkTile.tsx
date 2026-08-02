import { useLanguage } from "@/lib/i18n";
import { labelForKind } from "@/lib/social";
import {
  Mail,
  Phone,
  MessageCircle,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Facebook,
  Send,
  Music2,
  Github,
  MapPin,
  CreditCard,
  MessagesSquare,
  Link as LinkIcon,
} from "lucide-react";

export function resolveLink(type: string, value: string) {
  const v = value.trim();
  const lower = v.toLowerCase();
  const isPhoneLike = /^[+0-9\s()-]{5,}$/.test(v);
  const t = type.toLowerCase();

  if (t === "email") return { href: `mailto:${v}`, Icon: Mail, tint: "#0d7a5f" };
  if (t === "phone") return { href: `tel:${v.replace(/\s/g, "")}`, Icon: Phone, tint: "#0d7a5f" };
  if (t === "whatsapp" || lower.includes("wa.me") || lower.includes("whatsapp")) {
    const digits = v.replace(/[^0-9]/g, "");
    const href = v.startsWith("http") ? v : `https://wa.me/${digits}`;
    return { href, Icon: MessageCircle, tint: "#25D366" };
  }
  if (t === "telegram" || lower.includes("t.me") || lower.includes("telegram")) {
    return { href: normalize(v), Icon: Send, tint: "#229ED9" };
  }
  if (t === "messenger" || lower.includes("m.me") || lower.includes("messenger")) {
    return { href: normalize(v), Icon: MessagesSquare, tint: "#0084FF" };
  }
  if (t === "instapay" || lower.includes("instapay")) {
    return { href: v.startsWith("http") ? v : `https://ipn.eg/S/${v}/instapay`, Icon: CreditCard, tint: "#7c3aed" };
  }
  if (t === "paypal" || lower.includes("paypal")) {
    return { href: normalize(v), Icon: CreditCard, tint: "#003087" };
  }
  if (lower.includes("instagram")) return { href: normalize(v), Icon: Instagram, tint: "#E4405F" };
  if (lower.includes("linkedin")) return { href: normalize(v), Icon: Linkedin, tint: "#0A66C2" };
  if (lower.includes("twitter") || lower.includes("x.com")) return { href: normalize(v), Icon: Twitter, tint: "#000000" };
  if (lower.includes("youtube")) return { href: normalize(v), Icon: Youtube, tint: "#FF0000" };
  if (lower.includes("facebook") || lower.includes("fb.com")) return { href: normalize(v), Icon: Facebook, tint: "#1877F2" };
  if (lower.includes("tiktok")) return { href: normalize(v), Icon: Music2, tint: "#000000" };
  if (lower.includes("github")) return { href: normalize(v), Icon: Github, tint: "#181717" };
  if (lower.includes("maps.") || lower.includes("goo.gl/maps") || t === "location") {
    return { href: normalize(v), Icon: MapPin, tint: "#EA4335" };
  }
  if (t === "website" || lower.startsWith("http") || lower.includes(".")) {
    if (isPhoneLike) return { href: `tel:${v.replace(/\s/g, "")}`, Icon: Phone, tint: "#0d7a5f" };
    return { href: normalize(v), Icon: Globe, tint: "#0d7a5f" };
  }
  if (isPhoneLike) return { href: `tel:${v.replace(/\s/g, "")}`, Icon: Phone, tint: "#0d7a5f" };
  return { href: normalize(v), Icon: LinkIcon, tint: "#64748b" };
}

function normalize(v: string): string {
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

import { trackLinkTap } from "@/lib/track-tap";

export function LinkTile({
  link,
  profileId,
}: {
  link: { id: string; type: string; label: string; value: string };
  profileId?: string;
}) {
  const { lang, t: translate } = useLanguage();
  const { href, Icon, tint } = resolveLink(link.type, link.value);
  const label = link.label?.trim() || labelForKind(link.type, lang);

  // Build a descriptive accessible name per channel so screen readers hear
  // the action, not just the raw label.
  const linkType = link.type.toLowerCase();
  const ariaLabel =
    linkType === "phone"
      ? `${translate("pub.linkTile.call")} ${label}`
      : linkType === "email"
      ? `${translate("pub.linkTile.email")} ${label}`
      : linkType === "whatsapp"
      ? `${translate("pub.linkTile.whatsapp")} ${label}`
      : linkType === "website"
      ? `${translate("pub.linkTile.website")} ${label}`
      : `${translate("pub.linkTile.openPrefix")} ${label} ${translate("pub.linkTile.openSuffix")}`;

  const isExternal = !href.startsWith("mailto:") && !href.startsWith("tel:");

  const handleClick = () => {
    if (!profileId) return;
    trackLinkTap({ profileId, linkId: link.id, linkType: link.type });
  };

  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      aria-label={ariaLabel}
      data-link-type={linkType}
      data-testid="link-tile"
      onClick={handleClick}
      onAuxClick={handleClick}
      className="group flex h-full min-h-[96px] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-card px-2 py-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[116px] sm:gap-2.5 sm:px-3 sm:py-5"
    >

      <div
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-xl text-white shadow-sm sm:size-11"
        style={{ backgroundColor: tint }}
      >
        <Icon className="size-[18px] sm:size-5" />
      </div>
      <span className="line-clamp-1 w-full text-center text-[12px] font-medium leading-tight text-foreground/80 sm:text-sm">{label}</span>
    </a>
  );
}