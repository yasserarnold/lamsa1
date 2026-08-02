import { Phone, Mail, Globe, MapPin, Link as LinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import instapayLogo from "@/assets/instapay-logo.jpeg.asset.json";
import messengerLogo from "@/assets/messenger-logo.png.asset.json";
import type { LinkKind } from "@/lib/link-types";

const SI = (slug: string, color: string) => (
  <img
    src={`https://cdn.simpleicons.org/${slug}/${color}`}
    alt=""
    className="size-5"
    loading="lazy"
  />
);

function InstaPayIcon() {
  return (
    <img
      src={instapayLogo.url}
      alt=""
      className="size-5 object-contain"
      loading="lazy"
    />
  );
}

function MessengerIcon() {
  return (
    <img
      src={messengerLogo.url}
      alt=""
      className="size-5 object-contain"
      loading="lazy"
    />
  );
}

export function socialIcon(kind: LinkKind | string): ReactNode {
  switch (kind) {
    case "phone": return <Phone className="size-5" />;
    case "email": return <Mail className="size-5" />;
    case "website": return <Globe className="size-5" />;
    case "map": return <MapPin className="size-5" />;
    case "whatsapp": return SI("whatsapp", "25D366");
    case "instagram": return SI("instagram", "E4405F");
    case "x":
    case "twitter": return SI("x", "ffffff");
    case "linkedin": return SI("linkedin", "0A66C2");
    case "facebook": return SI("facebook", "1877F2");
    case "tiktok": return SI("tiktok", "ffffff");
    case "youtube": return SI("youtube", "FF0000");
    case "github": return SI("github", "ffffff");
    case "telegram": return SI("telegram", "26A5E4");
    case "snapchat": return SI("snapchat", "FFFC00");
    case "instapay": return <InstaPayIcon />;
    case "messenger": return <MessengerIcon />;
    default: return <LinkIcon className="size-5" />;
  }
}

export function labelForKind(kind: LinkKind | string, locale: "ar" | "en" = "ar"): string {
  const ar: Record<string, string> = {
    phone: "اتصال", email: "بريد", whatsapp: "واتساب", website: "الموقع", url: "رابط",
    instagram: "انستغرام", x: "إكس", twitter: "تويتر", linkedin: "لينكدإن",
    facebook: "فيسبوك", tiktok: "تيك توك", youtube: "يوتيوب", github: "جيت هاب",
    telegram: "تيليجرام", snapchat: "سناب شات", map: "الموقع على الخريطة",
    instapay: "انستاباي", messenger: "ماسنجر", social: "تواصل اجتماعي", custom: "رابط مخصص",
  };
  const en: Record<string, string> = {
    phone: "Call", email: "Email", whatsapp: "WhatsApp", website: "Website", url: "Link",
    instagram: "Instagram", x: "X", twitter: "Twitter", linkedin: "LinkedIn",
    facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", github: "GitHub",
    telegram: "Telegram", snapchat: "Snapchat", map: "Map",
    instapay: "InstaPay", messenger: "Messenger", social: "Social", custom: "Custom link",
  };
  return (locale === "en" ? en : ar)[kind] ?? kind;
}