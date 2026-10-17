"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { StorySlot } from "@/types/edition";
import { gsap, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";

type Props = { paperName: string; city: string; lead: StorySlot; secondary: StorySlot[] };

const Lines = ({ n, className = "" }: { n: number; className?: string }) => (
  <div className={`space-y-[5px] ${className}`} aria-hidden>
    {Array.from({ length: n }).map((_, i) => (
      <span key={i} className="block h-[3px] bg-black/[0.14]" style={{ width: i === n - 1 ? "62%" : "100%" }} />
    ))}
  </div>
);

/** The PDF as an object: a real typeset front page that tilts into place, with a QR code that really scans. */
export function PrintScene({ paperName, city, lead, secondary }: Props) {
  const root = useRef<HTMLElement>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const url = lead.sources[0]?.url;
    if (!url) return;
    QRCode.toDataURL(url, { margin: 0, width: 160, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [lead]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        "[data-sheet]",
        { rotateX: 28, rotateZ: -7, y: 120, scale: 0.9 },
        {
          rotateX: 0,
          rotateZ: -1.5,
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "center center", scrub: 0.6 },
        },
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="print-title" className="relative overflow-hidden border-t border-rule bg-paper-sunk">
      <div className="page grid grid-cols-12 items-center gap-x-[var(--col-gap)] gap-y-14 py-[clamp(4.5rem,10vw,9rem)]">
        <div className="col-span-12 lg:col-span-5">
          <p className="t-kicker text-accent" data-reveal>
            The print edition
          </p>
          <h2 id="print-title" className="t-headline-xl mt-5 max-w-[13ch]" data-reveal>
            A real paper. Fold it, keep it, hand it on.
          </h2>
          <p className="t-body mt-6 max-w-[40ch] text-ink-2" data-reveal>
            Every edition is also typeset as a printable PDF: columns, a proper masthead, and a QR code beside every story
            that opens the original article. Point your phone at the one on the right.
          </p>
          <ul className="t-meta mt-8 space-y-2" data-reveal>
            <li>A4 and Letter · four pages · ready by 7:00</li>
            <li>Large-print and right-to-left editions</li>
            <li>Every past paper in your archive</li>
          </ul>
        </div>

        <div className="col-span-12 lg:col-span-7" style={{ perspective: "1600px" }}>
          <div
            data-sheet
            className="mx-auto aspect-[210/297] w-full max-w-[520px] origin-bottom bg-white p-[5.5%] text-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.35),0_12px_24px_-12px_rgba(0,0,0,0.2)]"
            aria-label={`A printed front page of ${paperName}`}
            role="img"
          >
            <div className="flex justify-between font-sans text-[7px] uppercase tracking-[0.14em] text-black/60">
              <span>Saturday edition</span>
              <span>No. 12</span>
            </div>
            <p className="mt-2 text-center font-[family-name:var(--font-unifraktur)] text-[clamp(1.7rem,5.4vw,2.9rem)] leading-none">
              {paperName}
            </p>
            <div className="mt-2 h-[2px] bg-black" />
            <div className="mt-[2px] h-px bg-black" />
            <div className="flex justify-between py-1 font-sans text-[6.5px] uppercase tracking-[0.12em]">
              <span>{city} edition</span>
              <span>Price: six minutes</span>
            </div>
            <div className="h-px bg-black" />

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="col-span-2 border-r border-black/20 pr-3">
                <p className="font-sans text-[6px] font-semibold uppercase tracking-[0.14em] text-[#c8102e]">{lead.kicker}</p>
                <p className="mt-1 font-serif text-[clamp(0.85rem,2.2vw,1.25rem)] font-[500] leading-[1.05] tracking-[-0.015em]">
                  {lead.headline}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Lines n={9} />
                  <div>
                    <Lines n={5} />
                    <div className="mt-2 flex items-center gap-2">
                      {qr ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qr} alt={`QR code to the original: ${lead.sources[0]?.name}`} className="size-[clamp(34px,6vw,52px)]" />
                      ) : (
                        <span className="block size-[clamp(34px,6vw,52px)] bg-black/10" />
                      )}
                      <span className="font-sans text-[6px] leading-tight text-black/60">
                        Scan for the
                        <br />
                        original
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {secondary.slice(0, 3).map((s) => (
                  <div key={s.storyId} className="border-b border-black/15 pb-2">
                    <p className="font-serif text-[clamp(0.55rem,1.2vw,0.72rem)] font-[500] leading-[1.12]">{s.headline}</p>
                    <Lines n={3} className="mt-1.5" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 h-px bg-black" />
            <div className="mt-2 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Lines key={i} n={6} />
              ))}
            </div>
            <p className="mt-3 text-center font-serif text-[8px] tracking-[0.3em] text-[#c8102e]">— 30 —</p>
          </div>
        </div>
      </div>
    </section>
  );
}
