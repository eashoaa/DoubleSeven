"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { DICTIONARY, type LangKey } from "./dictionary";

export type Language = "en" | "bisaya" | "hybrid";

const STORAGE_KEY = "d7-language";
const CHANGE_EVENT = "d7-language-change";

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "bisaya" || value === "hybrid";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function getSnapshot(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLanguage(stored) ? stored : "en";
}

function getServerSnapshot(): Language {
  return "en";
}

function setPersistedLanguage(value: Language) {
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: LangKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function t(key: LangKey): string {
    const entry = DICTIONARY[key] as { en: string; bisaya: string; simple?: boolean } | undefined;
    if (!entry) return key;
    if (lang === "en") return entry.en;
    if (lang === "bisaya") return entry.bisaya;
    if (entry.simple) return entry.en;
    return `${entry.en} (${entry.bisaya})`;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang: setPersistedLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
