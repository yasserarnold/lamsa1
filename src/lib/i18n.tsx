import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "ar" | "en";

import { commonDict } from "./i18n-dicts/common";
import { dashboardDict } from "./i18n-dicts/dashboard";
import { adminDict } from "./i18n-dicts/admin";
import { admin2Dict } from "./i18n-dicts/admin2";
import { publicDict } from "./i18n-dicts/public";

const STORAGE_KEY = "kroty.lang";

const dict = {
  ar: {
    ...commonDict.ar,
    ...dashboardDict.ar,
    ...adminDict.ar,
    ...admin2Dict.ar,
    ...publicDict.ar,
  },
  en: {
    ...commonDict.en,
    ...dashboardDict.en,
    ...adminDict.en,
    ...admin2Dict.en,
    ...publicDict.en,
  },
};

export type TKey = keyof (typeof dict)["ar"];


type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (k: TKey) => string;
  dir: "rtl" | "ltr";
  locale: string;
};

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  // Hydrate from localStorage on mount (client-only) to avoid SSR mismatch.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "ar" ? "en" : "ar");
  }, [lang, setLang]);

  const t = useCallback((k: TKey) => dict[lang][k] ?? dict.ar[k] ?? k, [lang]);

  const value: Ctx = {
    lang,
    setLang,
    toggle,
    t,
    dir: lang === "ar" ? "rtl" : "ltr",
    locale: lang === "ar" ? "ar-EG" : "en-US",
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}