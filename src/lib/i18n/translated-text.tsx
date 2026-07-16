"use client";

import { useLanguage } from "./language-context";
import type { LangKey } from "./dictionary";

/** Minimal client leaf for translating a single string inline inside an
 * otherwise server-rendered component, so the parent doesn't need to become
 * a client component itself (which would break passing non-serializable
 * props, like component references, across the server/client boundary). */
export function T({ k }: { k: LangKey }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
