"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

export interface WashSettings {
  bottomColor: string;
  topColor: string;
  /** 0-100: how much of the page (from the top) carries color before it's flat white. */
  depth: number;
}

export const WASH_DEFAULTS: WashSettings = { bottomColor: "#ffffff", topColor: "#c9dfec", depth: 100 };

const STORAGE_KEY = "d7-wash-settings";
const CHANGE_EVENT = "d7-wash-settings-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing has changed, so the parsed result is cached
// against the raw string it came from instead of re-parsing (and
// allocating a new object) on every call, which otherwise triggers an
// infinite render loop.
let cachedRaw: string | null = null;
let cachedSnapshot: WashSettings = WASH_DEFAULTS;

function getSnapshot(): WashSettings {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;

  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = WASH_DEFAULTS;
    return cachedSnapshot;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WashSettings>;
    cachedSnapshot = { ...WASH_DEFAULTS, ...parsed };
  } catch {
    cachedSnapshot = WASH_DEFAULTS;
  }
  return cachedSnapshot;
}

function getServerSnapshot(): WashSettings {
  return WASH_DEFAULTS;
}

function persist(next: WashSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface WashSettingsContextValue {
  settings: WashSettings;
  setSettings: (next: Partial<WashSettings>) => void;
  reset: () => void;
}

const WashSettingsContext = createContext<WashSettingsContextValue | null>(null);

export function WashSettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--wash-start", settings.bottomColor);
    root.style.setProperty("--wash-end", settings.topColor);
    root.style.setProperty("--wash-split", `${Math.max(0, 100 - settings.depth)}%`);
  }, [settings]);

  function setSettings(next: Partial<WashSettings>) {
    persist({ ...settings, ...next });
  }

  function reset() {
    persist(WASH_DEFAULTS);
  }

  return (
    <WashSettingsContext.Provider value={{ settings, setSettings, reset }}>
      {children}
    </WashSettingsContext.Provider>
  );
}

export function useWashSettings(): WashSettingsContextValue {
  const ctx = useContext(WashSettingsContext);
  if (!ctx) throw new Error("useWashSettings must be used within a WashSettingsProvider");
  return ctx;
}
