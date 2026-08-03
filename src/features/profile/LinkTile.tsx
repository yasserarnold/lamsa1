import { useLanguage } from "@/lib/i18n";
import { labelForKind, socialIcon } from "@/lib/social";
import { trackLinkTap } from "@/lib/track-tap";

export function resolveLink(type: string, value: string) {
  const v = value.trim();
  const lower = v.toLowerCase();
  const isPhoneLike = /^[+0-9\s()-]{5,}$/.test(v);
  const t = type.toLowerCase();

  if (t === "email") return { href: `mailto:${v}` };
  if (t === "phone") return { href: `tel:${v.replace(/\s/g, "")}` };
  if (t === "whatsapp" || lower.includes("wa.me") || lower.includes("whatsapp")) {
    const digits = v.replace(/[^0-9]/g, "");
    const href = v.startsWith("http") ? v : `https://wa.me/${digits}`;
    return { href };
  }
  if (t === "telegram" || lower.includes("t.me") || lower.includes("telegram")) {
    return { href: normalize(v) };
  }
  if (t === "messenger" || lower.includes("m.me") || lower.includes("messenger")) {
    return { href: normalize(v) };
  }
  if (t === "instapay" || lower.includes("instapay")) {
    return { href: v.startsWith("http") ? v : `https://ipn.eg/S/${v}/instapay` };
  }
  if (t === "paypal" || lower.includes("paypal")) {
    return { href: normalize(v) };
  }
  if (t === "website" || lower.startsWith("http") || lower.includes(".")) {
    if (isPhoneLike) return { href: `tel:${v.replace(/\s/g, "")}` };
    return { href: normalize(v) };
  }
  if (isPhoneLike) return { href: `tel:${v.replace(/\s/g, "")}` };
  return { href: normalize(v) };
}

function normalize(v: string): string {
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

function getBadgeBackground(type: string, value: string): { background?: string; backgroundColor?: string } {
  const t = type.toLowerCase();
  const lower = value.toLowerCase();

  if (t === "facebook" || lower.includes("facebook") || lower.includes("fb.com")) {
    return { backgroundColor: "#1877F2" };
  }
  if (t === "wa_business" || t === "wabusiness" || lower.includes("wa business")) {
    return { backgroundColor: "#25D366" };
  }
  if (t === "instagram" || lower.includes("instagram")) {
    return { background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" };
  }
  if (t === "instapay" || lower.includes("instapay")) {
    return { backgroundColor: "#ffffff" };
  }
  if (t === "whatsapp" || lower.includes("wa.me") || lower.includes("whatsapp")) {
    return { backgroundColor: "#25D366" };
  }
  if (t === "paypal" || lower.includes("paypal")) {
    return { backgroundColor: "#0070BA" };
  }
  if (t === "telegram" || lower.includes("t.me") || lower.includes("telegram")) {
    return { backgroundColor: "#229ED9" };
  }
  if (t === "messenger" || lower.includes("m.me") || lower.includes("messenger")) {
    return { background: "linear-gradient(135deg, #00B2FF 0%, #006AFF 50%, #9900FF 100%)" };
  }
  if (t === "tiktok" || lower.includes("tiktok")) {
    return { backgroundColor: "#000000" };
  }
  if (t === "linkedin" || lower.includes("linkedin")) {
    return { backgroundColor: "#0A66C2" };
  }
  if (t === "x" || t === "twitter" || lower.includes("twitter") || lower.includes("x.com")) {
    return { backgroundColor: "#000000" };
  }
  if (t === "youtube" || lower.includes("youtube")) {
    return { backgroundColor: "#FF0000" };
  }
  if (t === "email") {
    return { backgroundColor: "#0F766E" };
  }
  if (t === "phone") {
    return { backgroundColor: "#16A34A" };
  }
  if (t === "website") {
    return { backgroundColor: "#2563EB" };
  }
  return { backgroundColor: "#475569" };
}

export function LinkTile({
  link,
  profileId,
}: {
  link: { id: string; type: string; label: string; value: string };
  profileId?: string;
}) {
  const { lang, t: translate } = useLanguage();
  const { href } = resolveLink(link.type, link.value);
  const label = link.label?.trim() || labelForKind(link.type, lang);

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

  const badgeStyle = getBadgeBackground(link.type, link.value);

  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      aria-label={ariaLabel}
      data-link-type={linkType}
      data-testid="link-tile"
      onClick={handleClick}
      onAuxClick={handleClick}
      className="group flex h-full min-h-[102px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[114px] sm:px-3 sm:py-4.5"
    >
      <div
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-full text-white shadow-sm transition-transform duration-200 group-hover:scale-105 sm:size-12"
        style={badgeStyle}
      >
        {socialIcon(link.type)}
      </div>
      <span className="line-clamp-1 w-full text-center text-[12px] font-medium leading-tight text-slate-800 dark:text-slate-200 sm:text-[13px]">
        {label}
      </span>
    </a>
  );
}