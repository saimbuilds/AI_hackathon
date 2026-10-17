import type { StorySlot } from "@/types/edition";

// "Confirmed by 3 outlets · 2 min": the trust signal never relies on color alone.
export function TrustLine({ slot, className = "" }: { slot: StorySlot; className?: string }) {
  const { label, outlets } = slot.trust;
  const text =
    label === "confirmed"
      ? `Confirmed by ${outlets} outlets`
      : label === "developing"
        ? `Developing${slot.developing ? ` · Day ${slot.developing.dayCount}` : ""}`
        : "Single source";
  const dot = label === "confirmed" ? "bg-confirm" : label === "developing" ? "bg-accent" : "bg-ink-3";
  return (
    <p className={`t-meta flex items-center gap-2 ${className}`}>
      <span aria-hidden className={`inline-block size-[6px] rounded-full ${dot}`} />
      <span>{text}</span>
      <span aria-hidden>·</span>
      <span>{Math.max(1, Math.round(slot.readMinutes))}&nbsp;min</span>
    </p>
  );
}
