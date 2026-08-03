export type ProfileThemeId =
  | "default"
  | "luxury"
  | "emerald"
  | "sunset"
  | "cyber"
  | "rose"
  | "ocean";

export interface ProfileThemeConfig {
  id: ProfileThemeId;
  nameAr: string;
  nameEn: string;
  previewBg: string;
  accentColor: string;
  bannerGradient: string;
  cardBg: string;
  cardBorder: string;
  textTitle: string;
  textSub: string;
  ctaButton: string;
  secondaryButton: string;
  actionPills: string;
  linkTileBorder: string;
}

export const PROFILE_THEMES: Record<ProfileThemeId, ProfileThemeConfig> = {
  default: {
    id: "default",
    nameAr: "كلاسيكي داكن",
    nameEn: "Classic Slate",
    previewBg: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)",
    accentColor: "#0F172A",
    bannerGradient: "bg-slate-900",
    cardBg: "bg-white dark:bg-slate-900",
    cardBorder: "border-slate-200/60 dark:border-slate-800",
    textTitle: "text-slate-900 dark:text-slate-100",
    textSub: "text-slate-500 dark:text-slate-400",
    ctaButton: "bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 text-white",
    secondaryButton: "border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200",
    actionPills: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800",
    linkTileBorder: "border-slate-200/80 dark:border-slate-800",
  },
  luxury: {
    id: "luxury",
    nameAr: "فخامة ذهبية",
    nameEn: "Luxury Gold",
    previewBg: "linear-gradient(135deg, #0F0F12 0%, #1F1912 50%, #D4AF37 100%)",
    accentColor: "#D4AF37",
    bannerGradient: "bg-gradient-to-br from-black via-zinc-950 to-amber-950",
    cardBg: "bg-zinc-950 text-amber-50",
    cardBorder: "border-amber-500/30",
    textTitle: "text-amber-100",
    textSub: "text-amber-300/80",
    ctaButton: "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold shadow-amber-500/20",
    secondaryButton: "border-amber-500/40 text-amber-200 bg-amber-950/20 hover:bg-amber-950/40",
    actionPills: "border-amber-500/30 bg-amber-950/30 text-amber-200 hover:bg-amber-950/60 shadow-amber-500/10",
    linkTileBorder: "border-amber-500/30 bg-zinc-900/80",
  },
  emerald: {
    id: "emerald",
    nameAr: "زمردي ناعم",
    nameEn: "Emerald Elegance",
    previewBg: "linear-gradient(135deg, #064E3B 0%, #047857 50%, #10B981 100%)",
    accentColor: "#059669",
    bannerGradient: "bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950",
    cardBg: "bg-emerald-950/90 text-emerald-50",
    cardBorder: "border-emerald-500/30",
    textTitle: "text-emerald-100",
    textSub: "text-emerald-300/80",
    ctaButton: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-black font-bold shadow-emerald-500/20",
    secondaryButton: "border-emerald-500/30 text-emerald-200 bg-emerald-950/30 hover:bg-emerald-900/40",
    actionPills: "border-emerald-500/30 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/60 shadow-emerald-500/10",
    linkTileBorder: "border-emerald-500/30 bg-emerald-950/60",
  },
  sunset: {
    id: "sunset",
    nameAr: "غروب بنفسجي",
    nameEn: "Sunset Violet",
    previewBg: "linear-gradient(135deg, #4C1D95 0%, #7C3AED 50%, #DB2777 100%)",
    accentColor: "#7C3AED",
    bannerGradient: "bg-gradient-to-br from-purple-950 via-indigo-950 to-pink-950",
    cardBg: "bg-slate-950 text-purple-50",
    cardBorder: "border-purple-500/30",
    textTitle: "text-purple-100",
    textSub: "text-purple-300/80",
    ctaButton: "bg-gradient-to-r from-purple-600 via-violet-500 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold shadow-purple-500/25",
    secondaryButton: "border-purple-500/30 text-purple-200 bg-purple-950/30 hover:bg-purple-900/40",
    actionPills: "border-purple-500/30 bg-purple-950/40 text-purple-100 hover:bg-purple-900/60 shadow-purple-500/10",
    linkTileBorder: "border-purple-500/30 bg-slate-900/80",
  },
  cyber: {
    id: "cyber",
    nameAr: "سايبر نيون",
    nameEn: "Cyberpunk Neon",
    previewBg: "linear-gradient(135deg, #09090B 0%, #0284C7 50%, #EC4899 100%)",
    accentColor: "#06B6D4",
    bannerGradient: "bg-gradient-to-br from-zinc-950 via-cyan-950 to-fuchsia-950",
    cardBg: "bg-zinc-950 text-cyan-50",
    cardBorder: "border-cyan-500/40",
    textTitle: "text-cyan-200",
    textSub: "text-fuchsia-300/80",
    ctaButton: "bg-gradient-to-r from-cyan-500 via-teal-400 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-black font-bold shadow-cyan-500/30",
    secondaryButton: "border-cyan-500/40 text-cyan-200 bg-cyan-950/30 hover:bg-cyan-900/50",
    actionPills: "border-cyan-500/30 bg-zinc-900/80 text-cyan-200 hover:bg-cyan-950/60 shadow-cyan-500/15",
    linkTileBorder: "border-cyan-500/30 bg-zinc-900/90",
  },
  rose: {
    id: "rose",
    nameAr: "وردي زجاجي",
    nameEn: "Rose Glass",
    previewBg: "linear-gradient(135deg, #881337 0%, #E11D48 50%, #FB7185 100%)",
    accentColor: "#E11D48",
    bannerGradient: "bg-gradient-to-br from-rose-950 via-pink-950 to-rose-900",
    cardBg: "bg-rose-950/90 text-rose-50",
    cardBorder: "border-rose-500/30",
    textTitle: "text-rose-100",
    textSub: "text-rose-300/80",
    ctaButton: "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold shadow-rose-500/25",
    secondaryButton: "border-rose-500/30 text-rose-200 bg-rose-950/30 hover:bg-rose-900/40",
    actionPills: "border-rose-500/30 bg-rose-950/40 text-rose-100 hover:bg-rose-900/60 shadow-rose-500/10",
    linkTileBorder: "border-rose-500/30 bg-rose-950/60",
  },
  ocean: {
    id: "ocean",
    nameAr: "أعماق المحيط",
    nameEn: "Ocean Depths",
    previewBg: "linear-gradient(135deg, #0F172A 0%, #0284C7 50%, #38BDF8 100%)",
    accentColor: "#0284C7",
    bannerGradient: "bg-gradient-to-br from-slate-950 via-sky-950 to-blue-950",
    cardBg: "bg-slate-950 text-sky-50",
    cardBorder: "border-sky-500/30",
    textTitle: "text-sky-100",
    textSub: "text-sky-300/80",
    ctaButton: "bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-bold shadow-sky-500/25",
    secondaryButton: "border-sky-500/30 text-sky-200 bg-sky-950/30 hover:bg-sky-900/40",
    actionPills: "border-sky-500/30 bg-slate-900/80 text-sky-100 hover:bg-sky-950/60 shadow-sky-500/10",
    linkTileBorder: "border-sky-500/30 bg-slate-900/90",
  },
};

export function getProfileTheme(themeId?: string | null): ProfileThemeConfig {
  if (!themeId) return PROFILE_THEMES.default;
  const key = themeId.toLowerCase() as ProfileThemeId;
  return PROFILE_THEMES[key] ?? PROFILE_THEMES.default;
}
