import { Phone, Mail, Globe, MapPin, Link as LinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { LinkKind } from "@/lib/link-types";

function FacebookIcon() {
  return (
    <svg className="size-6 text-white fill-current" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function WABusinessIcon() {
  return (
    <svg className="size-6 text-white fill-current" viewBox="0 0 24 24">
      <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.124.553 4.195 1.604 6.013L.042 23.958l6.096-1.599a12.01 12.01 0 005.893 1.545c6.646 0 12.031-5.385 12.031-12.031C24.062 5.385 18.677 0 12.031 0zm0 21.862a9.83 9.83 0 01-5.013-1.373l-.36-.214-3.722.976.993-3.629-.235-.374a9.837 9.837 0 01-1.507-5.217c0-5.434 4.422-9.856 9.856-9.856s9.856 4.422 9.856 9.856-4.422 9.856-9.856 9.856zm3.364-7.553h-3.478v2.414h3.478c.84 0 1.52-.68 1.52-1.52 0-.84-.68-1.52-1.52-1.52zm-3.478-4.22h3.25c.76 0 1.38-.62 1.38-1.38 0-.76-.62-1.38-1.38-1.38h-3.25v2.76zm-2.02 9.187H7.741V8.697h4.156c1.88 0 3.32.48 4.09 1.25.65.65.98 1.48.98 2.4 0 .97-.4 1.83-1.12 2.45 1.15.58 1.77 1.63 1.77 2.95 0 1.22-.47 2.19-1.34 2.87-1.02.79-2.5 1.18-4.38 1.18z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="size-6 text-white stroke-current fill-none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg className="size-6 text-white fill-current" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

function PaypalIcon() {
  return (
    <svg className="size-6 text-white fill-current" viewBox="0 0 24 24">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.762.762 0 0 1 .752-.644h6.852c3.084 0 5.438.742 6.368 2.215.823 1.305.733 3.036-.282 5.163-.984 2.063-2.483 3.39-4.464 3.942-1.012.28-2.186.417-3.491.417H8.81l-1.101 6.012a.64.64 0 0 1-.633.512zm9.145-12.825c-.568-.902-1.993-1.435-4.24-1.435H7.722L5.807 17.575h2.593l1.101-6.012a.762.762 0 0 1 .752-.644h1.868c1.077 0 2.046-.11 2.883-.341 1.545-.431 2.707-1.463 3.468-3.073.743-1.572.809-2.823.21-3.774z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className="size-6 text-white fill-current" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg className="size-6 text-white fill-current" viewBox="0 0 24 24">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.302 2.25.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.259 5.889-3.259-6.56 6.964z"/>
    </svg>
  );
}

function InstaPayIcon() {
  return (
    <span className="font-extrabold text-[12px] tracking-tight text-white italic">iXP</span>
  );
}

export function socialIcon(kind: LinkKind | string): ReactNode {
  const k = kind.toLowerCase();
  switch (k) {
    case "phone": return <Phone className="size-5" />;
    case "email": return <Mail className="size-5" />;
    case "website": return <Globe className="size-5" />;
    case "map":
    case "location": return <MapPin className="size-5" />;
    case "wa_business":
    case "wabusiness": return <WABusinessIcon />;
    case "whatsapp": return <WhatsappIcon />;
    case "instagram": return <InstagramIcon />;
    case "facebook": return <FacebookIcon />;
    case "paypal": return <PaypalIcon />;
    case "telegram": return <TelegramIcon />;
    case "messenger": return <MessengerIcon />;
    case "instapay": return <InstaPayIcon />;
    default: return <LinkIcon className="size-5" />;
  }
}

export function labelForKind(kind: LinkKind | string, locale: "ar" | "en" = "ar"): string {
  const ar: Record<string, string> = {
    phone: "اتصال", email: "بريد", whatsapp: "Whatsapp", wa_business: "WA Business", wabusiness: "WA Business", website: "الموقع", url: "رابط",
    instagram: "Instagram", x: "إكس", twitter: "تويتر", linkedin: "LinkedIn",
    facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", github: "GitHub",
    telegram: "Telegram", snapchat: "Snapchat", map: "الموقع على الخريطة",
    instapay: "Instapay", paypal: "Paypal", messenger: "FB Messenger", social: "تواصل اجتماعي", custom: "رابط مخصص",
  };
  const en: Record<string, string> = {
    phone: "Call", email: "Email", whatsapp: "Whatsapp", wa_business: "WA Business", wabusiness: "WA Business", website: "Website", url: "Link",
    instagram: "Instagram", x: "X", twitter: "Twitter", linkedin: "LinkedIn",
    facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", github: "GitHub",
    telegram: "Telegram", snapchat: "Snapchat", map: "Map",
    instapay: "Instapay", paypal: "Paypal", messenger: "FB Messenger", social: "Social", custom: "Custom link",
  };
  return (locale === "en" ? en : ar)[kind] ?? kind;
}