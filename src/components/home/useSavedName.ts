"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "ep-name";

/** The reader's first name, remembered across the landing, onboarding and the paper. */
export function useSavedName(): [string, (v: string) => void] {
  const [name, setNameState] = useState("");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) setNameState(v);
    } catch {}
  }, []);
  const setName = useCallback((v: string) => {
    setNameState(v);
    try {
      if (v.trim()) localStorage.setItem(KEY, v.trim());
      else localStorage.removeItem(KEY);
    } catch {}
  }, []);
  return [name, setName];
}
