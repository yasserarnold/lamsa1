// Canonical link kinds — the single source of truth for the form, the
// server-side zod validator, and the vCard generator.
export const LINK_KINDS = [
  "url",
  "website",
  "email",
  "phone",
  "whatsapp",
  "messenger",
  "instagram",
  "x",
  "linkedin",
  "facebook",
  "tiktok",
  "youtube",
  "github",
  "telegram",
  "snapchat",
  "instapay",
  "map",
  "social",
  "custom",
] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_PLACEHOLDERS: Record<LinkKind, string> = {
  url: "https://example.com",
  website: "https://example.com",
  email: "you@example.com",
  phone: "+201234567890",
  whatsapp: "+201234567890",
  messenger: "https://m.me/username",
  instagram: "https://instagram.com/username",
  x: "https://x.com/username",
  linkedin: "https://linkedin.com/in/username",
  facebook: "https://facebook.com/username",
  tiktok: "https://tiktok.com/@username",
  youtube: "https://youtube.com/@channel",
  github: "https://github.com/username",
  telegram: "https://t.me/username",
  snapchat: "https://snapchat.com/add/username",
  instapay: "@yourhandle",
  map: "https://maps.google.com/?q=...",
  social: "https://...",
  custom: "https://example.com/anything",
};