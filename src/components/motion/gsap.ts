"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Register once at module load; every client component imports GSAP from here.
gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// Dev-only handle so animations can be fast-forwarded for screenshots when the tab isn't painting.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __gsap: typeof gsap; __ST: typeof ScrollTrigger }).__gsap = gsap;
  (window as unknown as { __ST: typeof ScrollTrigger }).__ST = ScrollTrigger;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText, useGSAP };
