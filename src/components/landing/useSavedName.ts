"use client";

import { useSyncExternalStore } from "react";

// The reader's name lives in localStorage so onboarding and return visits can pick it up.
const KEY = "ep-name";
const listeners = new Set<() => void>();

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

export function setSavedName(value: string) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function useSavedName() {
  return useSyncExternalStore(subscribe, read, () => "");
}
