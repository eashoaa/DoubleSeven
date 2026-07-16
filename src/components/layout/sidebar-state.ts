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

// Mobile off-canvas drawer: purely transient (never persisted — a menu
// that "remembers" being open across page loads would be a bug, not a
// feature), so this is just an in-memory module singleton shared across
// the hamburger button and the drawer via the same subscribe/notify shape
// as the desktop collapse state above.
let mobileMenuOpen = false;
const mobileMenuListeners = new Set<() => void>();

function subscribeMobileMenu(onChange: () => void) {
  mobileMenuListeners.add(onChange);
  return () => mobileMenuListeners.delete(onChange);
}

function getMobileMenuSnapshot() {
  return mobileMenuOpen;
}

function getMobileMenuServerSnapshot() {
  return false;
}

export function useMobileMenuOpen(): boolean {
  return useSyncExternalStore(subscribeMobileMenu, getMobileMenuSnapshot, getMobileMenuServerSnapshot);
}

export function setMobileMenuOpen(value: boolean) {
  mobileMenuOpen = value;
  mobileMenuListeners.forEach((cb) => cb());
}
