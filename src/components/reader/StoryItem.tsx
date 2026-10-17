import type { StorySlot } from "@/types/edition";
import { trustLabel } from "@/components/paper/FrontPage";
import { Check } from "@/components/ui/icons";

export function TrustChip({ s, size = "md" }: { s: StorySlot; size?: "sm" | "md" }) {
  const tone = s.trust.label === "confirmed" ? "leaf" : s.trust.label === "developing" ? "press" : "sun";
  return (
    <span className={`chip ${size === "sm" ? "!h-[26px] !px-2.5 !text-[0.75rem]" : ""}`} data-tone={tone}>
      {s.trust.label === "confirmed" ? <Check size={11} /> : <span className="chip-dot" />}
      {trustLabel(s.trust)}
    </span>
  );
}

type Variant = "lead" | "major" | "minor" | "brief";

/** One story on the broadsheet. The whole block is the button that opens the story. */
export function StoryItem({
  s,
  variant,
  read,
  onOpen,
}: {
  s: StorySlot;
  variant: Variant;
  read: boolean;
  onOpen: (s: StorySlot) => void;
}) {
  const head =
    variant === "lead"
      ? "text-[clamp(2.4rem,1.5rem+3.4vw,4.6rem)] leading-[0.96] tracking-[-0.032em]"
      : variant === "major"
        ? "text-[clamp(1.6rem,1.25rem+1.2vw,2.25rem)] leading-[1.02] tracking-[-0.025em]"
        : variant === "minor"
          ? "text-[1.35rem] leading-[1.08] tracking-[-0.015em]"
          : "text-[1.1rem] leading-[1.15] tracking-[-0.01em]";
  return (
    <button
      type="button"
      onClick={() => onOpen(s)}
      className="story-item group block w-full rounded-[var(--r-sm)] text-left outline-offset-4"
      data-story={s.storyId}
      aria-label={`${s.headline}${read ? " (read)" : ""}`}
    >
      <span className="flex items-center gap-2 text-[0.82rem] font-semibold tracking-[-0.005em] text-[#c2321a]">
        {s.kicker}
        {read && (
          <span className="inline-flex items-center gap-1 font-medium text-ink-3">
            <Check size={11} /> Read
          </span>
        )}
      </span>
      <span
        className={`mt-2 block font-serif font-medium text-balance decoration-[1.5px] underline-offset-[0.14em] group-hover:underline ${head}`}
      >
        {s.headline}
      </span>
      {variant !== "brief" && (
        <span
          className={`mt-3 block font-serif text-ink-2 text-pretty ${
            variant === "lead" ? "text-[1.3rem] leading-[1.38] italic" : "text-[1.02rem] leading-[1.42]"
          }`}
        >
          {s.dek}
        </span>
      )}
      {variant === "lead" && s.forYou && (
        <span className="t-body mt-5 block rounded-[var(--r-sm)] bg-sun p-4">
          <b className="font-semibold">For you.</b> {s.forYou}
        </span>
      )}
      <span className="mt-4 flex flex-wrap items-center gap-2">
        <TrustChip s={s} size="sm" />
        <span className="t-xs text-ink-3">{Math.max(1, Math.round(s.readMinutes))} min</span>
      </span>
    </button>
  );
}
