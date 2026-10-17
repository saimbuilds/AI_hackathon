"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/components/motion/gsap";

const DEMO_NAMES = ["Saim", "Ayesha", "Abbu", "María", "Kenji", "Amara"];
const MAX = 16;

const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

type Props = {
  onNameChange?: (name: string) => void;
  onSubmit?: (name: string) => void;
};

/**
 * "The ____ Times": the reader's own masthead. Until they touch it, it typesets demo names;
 * once focused it's theirs. Each glyph drops in like set metal type (CSS keyframes, transform only).
 */
export function Masthead({ onNameChange, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [demo, setDemo] = useState("");
  const [owned, setOwned] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore a name typed on a previous visit.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ep-name");
      if (saved) {
        setName(saved);
        setOwned(true);
        onNameChange?.(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo typesetter: type, hold, erase, next name. Stops for good once the reader takes over.
  useEffect(() => {
    if (owned) return;
    if (prefersReducedMotion()) {
      setDemo(DEMO_NAMES[0]);
      return;
    }
    let i = 0;
    let n = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const target = DEMO_NAMES[n % DEMO_NAMES.length];
      if (!erasing) {
        i++;
        setDemo(target.slice(0, i));
        if (i === target.length) {
          erasing = true;
          timer = setTimeout(step, 1900);
          return;
        }
        timer = setTimeout(step, 120 + Math.random() * 60);
      } else {
        i--;
        setDemo(target.slice(0, i));
        if (i === 0) {
          erasing = false;
          n++;
          timer = setTimeout(step, 380);
          return;
        }
        timer = setTimeout(step, 55);
      }
    };
    timer = setTimeout(step, 1500);
    return () => clearTimeout(timer);
  }, [owned]);

  const takeOver = () => {
    if (owned) return;
    setOwned(true);
    setDemo("");
  };

  const update = (raw: string) => {
    const next = cap(raw.replace(/\s{2,}/g, " ").slice(0, MAX));
    setName(next);
    onNameChange?.(next.trim());
    try {
      localStorage.setItem("ep-name", next.trim());
    } catch {}
  };

  const shown = owned ? name : demo;
  const paper = `The ${shown || "Your Name"} Times`;
  const empty = owned && !name;

  return (
    <div className="relative flex justify-center pb-[clamp(10px,1.4vw,20px)] pt-[clamp(16px,2.4vw,34px)]">
      <h2
        className="t-masthead select-none text-center"
        style={{ ["--len" as string]: String(paper.length) }}
        aria-label={owned && name ? `The ${name} Times` : "Your name, set in the masthead"}
      >
        <span data-masthead-word className="inline-block">The</span>{" "}
        <label
          className="relative inline-block cursor-text align-baseline"
          onPointerDown={takeOver}
        >
          <span aria-hidden className="relative inline-block whitespace-pre">
            {empty ? (
              <span className="text-ink-3/40">Your Name</span>
            ) : (
              Array.from(shown || " ").map((ch, i) => (
                <span
                  key={`${i}-${ch}`}
                  className="inline-block"
                  style={{
                    animation: "glyph-drop 420ms var(--ease-out) both",
                    transformOrigin: "50% 100%",
                  }}
                >
                  {ch === " " ? " " : ch}
                </span>
              ))
            )}
            {/* Caret: shows while the demo types or the reader is focused */}
            {(focused || !owned) && (
              <span
                className="absolute bottom-[0.14em] top-[0.18em] w-[0.06em] bg-accent"
                style={{
                  left: empty ? 0 : "100%",
                  marginLeft: empty ? 0 : "0.04em",
                  animation: "caret-blink 1.05s steps(1) infinite",
                }}
              />
            )}
          </span>
          <input
            ref={inputRef}
            value={name}
            onFocus={() => {
              takeOver();
              setFocused(true);
            }}
            onBlur={() => setFocused(false)}
            onChange={(e) => update(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onSubmit?.(name.trim());
            }}
            maxLength={MAX}
            autoComplete="given-name"
            spellCheck={false}
            enterKeyHint="go"
            aria-label="Your name, shown in the masthead"
            translate="no"
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
            style={{ font: "inherit", letterSpacing: "inherit" }}
          />
        </label>{" "}
        <span data-masthead-word className="inline-block">Times</span>
      </h2>
    </div>
  );
}
