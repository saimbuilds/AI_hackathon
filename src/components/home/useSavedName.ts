"use client";

import { useCallback } from "react";
import { useStored } from "@/components/ui/useStored";

/** The reader's first name, remembered across the landing, onboarding and the paper. */
export function useSavedName(): [string, (v: string) => void] {
  const [raw, setRaw] = useStored("ep-name");
  // Keep exactly what was typed (spaces included) while editing; empty clears it.
  const setName = useCallback((v: string) => setRaw(v ? v : null), [setRaw]);
  return [raw ?? "", setName];
}
