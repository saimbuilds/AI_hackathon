import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

export function Chevron({ size = 14, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden {...p}>
      <path d="M5 2.5 9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDown({ size = 12, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden {...p}>
      <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ size = 14, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden {...p}>
      <path d="m2.5 7.4 3 3 6-6.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Close({ size = 14, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden {...p}>
      <path d="m3 3 8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** A folded sheet: the page with its corner turned. */
export function SheetGlyph({ size = 18, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden {...p}>
      <path d="M3.5 2.5h7.2l3.8 3.8v9.2h-11z" fill="currentColor" />
      <path d="M10.7 2.5v3.8h3.8" fill="var(--sheet)" />
      <path d="M5.8 9h6.4M5.8 11.4h6.4M5.8 13.6h3.8" stroke="var(--sheet)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Globe({ size = 22, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden {...p}>
      <circle cx="11" cy="11" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M2.8 11h16.4M11 2.8c2.3 2.4 3.4 5.1 3.4 8.2s-1.1 5.8-3.4 8.2c-2.3-2.4-3.4-5.1-3.4-8.2s1.1-5.8 3.4-8.2Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function Clock({ size = 22, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden {...p}>
      <circle cx="11" cy="11" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11 6.5V11l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Coin({ size = 22, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden {...p}>
      <circle cx="11" cy="11" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.6 8.2c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2.1c1.7.4 2.7 1 2.7 2.2s-1.2 2.1-2.7 2.1c-1.2 0-2.3-.6-2.8-1.6M11 5.4v1.4m0 8.4v1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Mic({ size = 18, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden {...p}>
      <rect x="6.2" y="2.2" width="5.6" height="9" rx="2.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.8 8.6a5.2 5.2 0 0 0 10.4 0M9 13.8v2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Plus({ size = 14, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden {...p}>
      <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
