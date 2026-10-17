"use client";

import { useEffect, useState } from "react";

// Time zones whose IANA city isn't what a reader would call home.
const ZONE_LABEL: Record<string, string> = {
  "Asia/Karachi": "Pakistan",
  "Asia/Kolkata": "India",
  "Asia/Calcutta": "India",
  "Asia/Dhaka": "Bangladesh",
  "Asia/Riyadh": "Riyadh",
  "Asia/Dubai": "Dubai",
  "Europe/London": "London",
  "America/New_York": "New York",
  "America/Los_Angeles": "California",
};

export type Today = {
  dateline: string; // "Saturday, 17 October 2026"
  short: string; // "Sat 17 Oct"
  time: string; // "12:40"
  week: number;
  dayOfYear: number;
  place: string; // "Pakistan"
};

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function compute(): Today {
  const now = new Date();
  const locale = navigator.language || "en-GB";
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const start = new Date(now.getFullYear(), 0, 0);
  return {
    dateline: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now),
    short: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(now),
    time: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now),
    week: isoWeek(now),
    dayOfYear: Math.floor((now.getTime() - start.getTime()) / 86400000),
    place: ZONE_LABEL[zone] ?? (zone.split("/").pop() ?? "").replace(/_/g, " "),
  };
}

// Dates are computed on the client: with Cache Components, reading the clock during prerender is not allowed.
export function useToday(): Today | null {
  const [today, setToday] = useState<Today | null>(null);
  useEffect(() => {
    setToday(compute());
    const id = setInterval(() => setToday(compute()), 30_000);
    return () => clearInterval(id);
  }, []);
  return today;
}
