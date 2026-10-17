"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  const xFor = (side: "l" | "r") => (side === "r" ? (mobile ? 0.12 : 0.43) : mobile ? 0.88 : 0.57) * w;
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

export function Journey({ steps }: { steps: Step[] }) {
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

  useEffect(() => {
    const els = [...(root.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [])];
    const show = (el: Element) => el.classList.add("is-in");
    els.filter((el) => el.getBoundingClientRect().top < innerHeight).forEach(show);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting || e.boundingClientRect.top < 0) && (show(e.target), io.unobserve(e.target))),
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      if (!geo || !len) return;
      const reduce = prefersReducedMotion();
      const draw = root.current!.querySelectorAll<SVGPathElement>(".ribbon-draw");
      if (reduce) {
        draw.forEach((p) => (p.style.strokeDashoffset = "0"));
        return;
      }
      // The ribbon unrolls just ahead of the reader's eye.
      gsap.fromTo(
        draw,
        { strokeDashoffset: len },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top 95%", end: "bottom 85%", scrub: 0.8 },
        },
      );
      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [geo?.d, len] },
  );


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
            <path d={geo.d} fill="none" stroke="var(--sun-deep)" strokeWidth={geo.ribbon} strokeOpacity={0.35} strokeDasharray={`1 ${Math.round(geo.ribbon * 0.24)}`} strokeLinecap="round" />
            <path d={geo.d} fill="none" stroke="var(--sun)" strokeWidth={geo.ribbon - 16} />
            <path d={geo.d} fill="none" stroke="var(--ink)" strokeOpacity={0.22} strokeWidth={1.5} strokeDasharray="10 9" />
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
                data-reveal
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
                <div data-reveal>{s.sticker}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
