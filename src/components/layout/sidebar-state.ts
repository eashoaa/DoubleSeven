"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "d7-sidebar-collapsed";
const COLLAPSE_EVENT = "d7-sidebar-collapsed-change";

// Reads the persisted collapse preference outside React so the server
// render (always expanded) and the client's first paint never disagree.
// React reconciles the real value right after hydration.
function subscribe(onChange: () => void) {
  window.addEventListener(COLLAPSE_EVENT, onChange);
  return () => window.removeEventListener(COLLAPSE_EVENT, onChange);
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setSidebarCollapsed(value: boolean) {
  window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}
