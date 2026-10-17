import { BRAND } from "@/lib/brand";

/** The mark: a page with its corner turned, the last page of the book. */
export function Mark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden className={className}>
      <path d="M4 3h12.5L22 8.5V23H4z" fill="var(--ink)" />
      <path d="M16.5 3v5.5H22z" fill="var(--sun)" />
      <path d="M8 13h10M8 16.5h10M8 20h6" stroke="var(--sheet)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`} translate="no">
      <Mark />
      <span className="text-[1.3rem] leading-none font-[580] tracking-[-0.05em]">{BRAND.name}</span>
    </span>
  );
}
