"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PillButton } from "@/components/ui/PillButton";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";

type Step = {
  title: string;
  body: string;
  cta: { label: string; href: string; tone: "press" | "cyan" | "sun" | "leaf" };
  sticker: ReactNode;
};

type Geo = { w: number; h: number; d: string; ribbon: number };

/** Builds a ribbon that snakes past each card on the side opposite to it, with vertical tangents at every turn. */
function buildPath(w: number, h: number, ys: number[], sides: ("l" | "r")[], ribbon: number): string {
  const mobile = w < 768;
  const xFor = (side: "l" | "r") => (side === "r" ? (mobile ? 0.12 : 0.27) : mobile ? 0.88 : 0.73) * w;
  const pts: [number, number][] = [[w * 0.5, -ribbon]];
  ys.forEach((y, i) => pts.push([xFor(sides[i]), y]));
  pts.push([w * 0.5, h + ribbon]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const k = (y1 - y0) * 0.55;
    d += ` C${x0},${y0 + k} ${x1},${y1 - k} ${x1},${y1}`;
  }
  return d;
}

export function Journey({ headlines, steps }: { headlines: string[]; steps: Step[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [len, setLen] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);

  // Measure card rows and rebuild the path whenever the layout changes.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const rows = [...el.querySelectorAll<HTMLElement>("[data-step]")];
      const ys = rows.map((r) => {
        const b = r.getBoundingClientRect();
        return b.top - box.top + b.height / 2;
      });
      const sides = rows.map((r) => (r.dataset.side as "l" | "r") ?? "r");
      const w = box.width;
      const ribbon = Math.round(Math.max(64, Math.min(116, w * 0.08)));
      setGeo({ w, h: box.height, ribbon, d: buildPath(w, box.height, ys, sides, ribbon) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, [geo]);

  useGSAP(
    () => {
      if (!geo || !len) return;
      const reduce = prefersReducedMotion();
      const draw = root.current!.querySelectorAll<SVGPathElement>(".ribbon-draw");
      if (reduce) {
        draw.forEach((p) => (p.style.strokeDashoffset = "0"));
        return;
      }
      // The ribbon unrolls just ahead of the reader's eye; headlines stream along it.
      gsap.fromTo(
        draw,
        { strokeDashoffset: len },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top 95%", end: "bottom 85%", scrub: 0.8 },
        },
      );
      gsap.fromTo(
        ".ribbon-text",
        { attr: { startOffset: 0 } },
        {
          attr: { startOffset: -len * 0.55 },
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.4 },
        },
      );
      gsap.utils.toArray<HTMLElement>(".step-card").forEach((card) => {
        gsap.from(card, {
          y: 60,
          rotate: card.dataset.side === "l" ? -2.5 : 2.5,
          opacity: 0,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: { trigger: card, start: "top 85%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>(".sticker > *").forEach((s) => {
        gsap.from(s, {
          scale: 0.6,
          rotate: -12,
          opacity: 0,
          duration: 0.9,
          ease: "back.out(2.2)",
          scrollTrigger: { trigger: s, start: "top 80%", once: true },
        });
      });
      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [geo?.d, len] },
  );

  // Enough copy to cover the path twice so the scroll offset never runs dry.
  const sep = "   ●   ";
  const reel = Array.from({ length: 4 }, () => headlines.join(sep)).join(sep);

  return (
    <div ref={root} id="how" className="relative scroll-mt-24">
      {geo && (
        <svg
          className="pointer-events-none absolute inset-0 z-0 overflow-visible"
          width={geo.w}
          height={geo.h}
          viewBox={`0 0 ${geo.w} ${geo.h}`}
          aria-hidden
        >
          <defs>
            <mask id="ribbon-mask" maskUnits="userSpaceOnUse" x={-200} y={-400} width={geo.w + 400} height={geo.h + 800}>
              <path
                className="ribbon-draw"
                d={geo.d}
                fill="none"
                stroke="#fff"
                strokeWidth={geo.ribbon + 4}
                strokeDasharray={len || 1}
                strokeDashoffset={len || 1}
              />
            </mask>
          </defs>
          <path
            ref={pathRef}
            id="ribbon-path"
            className="ribbon-draw"
            d={geo.d}
            fill="none"
            stroke="var(--sun)"
            strokeWidth={geo.ribbon}
            strokeLinecap="butt"
            strokeDasharray={len || 1}
            strokeDashoffset={len || 1}
          />
          <g mask="url(#ribbon-mask)">
            <text
              fill="var(--ink)"
              style={{ fontSize: geo.ribbon * 0.3, fontWeight: 550, letterSpacing: "-0.02em" }}
              dominantBaseline="central"
            >
              <textPath href="#ribbon-path" className="ribbon-text" startOffset={0}>
                {reel}
              </textPath>
            </text>
          </g>
        </svg>
      )}

      <ol className="container-page relative z-10 flex flex-col gap-[18vh] pt-[14vh] pb-[22vh] md:gap-[24vh]">
        {steps.map((s, i) => {
          const side = i % 2 === 0 ? "r" : "l";
          return (
            <li
              key={s.title}
              data-step
              data-side={side}
              className={`relative flex ${side === "r" ? "md:justify-end" : "md:justify-start"}`}
            >
              <div
                className="step-card card relative w-full md:w-[min(460px,40vw)]"
                data-side={side}
              >
                <span className="t-sm text-ink-3">Step {i + 1} of {steps.length}</span>
                <h3 className="t-lg mt-3">{s.title}</h3>
                <p className="t-body mt-4 text-ink-2">{s.body}</p>
                <div className="mt-7">
                  <PillButton href={s.cta.href} tone={s.cta.tone} look="solid">
                    {s.cta.label}
                  </PillButton>
                </div>
              </div>
              <div
                className={`sticker pointer-events-none absolute top-1/2 hidden -translate-y-1/2 md:block ${
                  side === "r" ? "left-[8%]" : "right-[8%]"
                }`}
              >
                {s.sticker}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
