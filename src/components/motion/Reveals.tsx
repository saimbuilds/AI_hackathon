"use client";

import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "./gsap";

// One batched trigger for every [data-reveal] on the page: fade + rise as it enters, once.
export function Reveals() {
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const els = gsap.utils.toArray<HTMLElement>("[data-reveal]");
    gsap.set(els, { autoAlpha: 0, y: 24 });
    ScrollTrigger.batch(els, {
      start: "top 88%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, overwrite: true }),
    });
  });
  return null;
}
