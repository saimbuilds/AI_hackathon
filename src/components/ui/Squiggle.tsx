"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Underlines a phrase with a hand-drawn wave that draws itself the first time it scrolls into view. */
export function Squiggle({
  children,
  color = "var(--sun)",
  weight = 4,
  delay = 0,
}: {
  children: ReactNode;
  color?: string;
  weight?: number;
  delay?: number;
}) {
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    const path = ref.current;
    if (!path) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    path.style.strokeDasharray = "1";
    path.style.strokeDashoffset = "1";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        path.style.transition = `stroke-dashoffset 1100ms var(--ease-out) ${delay}ms`;
        path.style.strokeDashoffset = "0";
        io.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(path);
    return () => io.disconnect();
  }, [delay]);
  return (
    <span className="squiggle-word">
      {children}
      <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
        <path
          ref={ref}
          d="M2 8c8-7 16-7 24 0s16 7 24 0 16-7 24 0 16 7 24 0 16-7 24 0 16 7 24 0 16-7 24 0 16 7 24 0"
          pathLength={1}
          fill="none"
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
