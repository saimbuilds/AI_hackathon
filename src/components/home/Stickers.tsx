import { Check } from "@/components/ui/icons";

/** Small product objects that sit on the ribbon, standing in for illustration. All real UI pieces. */

export function SourcesSticker() {
  const chips: [string, number, number, number][] = [
    ["Dawn", -8, 0, 0],
    ["BBC News", 5, 46, 30],
    ["Al Jazeera", -3, 10, 82],
    ["Le Monde", 9, 70, 120],
    ["The Express Tribune", -6, -6, 160],
  ];
  return (
    <div className="relative h-[230px] w-[300px]">
      {chips.map(([n, r, x, y]) => (
        <span
          key={n}
          className="chip absolute h-[38px] px-4 text-[0.95rem] shadow-[0_1px_0_rgb(0_0_0/0.06)]"
          style={{ left: x, top: y, transform: `rotate(${r}deg)` }}
        >
          <span className="chip-dot text-press" />
          {n}
        </span>
      ))}
      <span className="absolute right-0 top-[64px] grid h-[104px] w-[104px] rotate-[8deg] place-items-center rounded-full bg-press text-center leading-none">
        <span>
          <span className="block text-[2.1rem] font-semibold tracking-[-0.06em]">530</span>
          <span className="mt-1 block text-[0.78rem]">sources</span>
        </span>
      </span>
    </div>
  );
}

export function SwipeSticker({ headlines }: { headlines: string[] }) {
  const [front, back] = headlines;
  return (
    <div className="relative h-[230px] w-[300px]">
      {back && (
        <div className="absolute top-0 left-6 w-[250px] rotate-[6deg] rounded-[var(--r-md)] bg-sheet p-5 opacity-80 shadow-[0_1px_0_rgb(0_0_0/0.06)]">
          <span className="chip !h-6 !px-2.5 !text-[0.72rem]" data-tone="line">
            Pass
          </span>
          <p className="mt-3 line-clamp-2 font-serif text-[1rem] leading-[1.2] text-ink-3">{back}</p>
        </div>
      )}
      {front && (
        <div className="absolute top-12 left-0 w-[260px] -rotate-[4deg] rounded-[var(--r-md)] bg-sheet p-5 shadow-[0_18px_40px_-24px_rgb(28_29_26/0.45)]">
          <span className="chip !h-6 !px-2.5 !text-[0.72rem]" data-tone="leaf">
            Keep
          </span>
          <p className="mt-3 line-clamp-3 font-serif text-[1.1rem] leading-[1.18] font-medium tracking-[-0.01em]">{front}</p>
        </div>
      )}
    </div>
  );
}

export function TrustSticker({ forYou }: { forYou: string }) {
  return (
    <div className="relative h-[230px] w-[320px]">
      <span className="chip absolute left-4 top-0 h-[40px] -rotate-[4deg] gap-2 px-4 text-[0.95rem]" data-tone="leaf">
        <Check /> Confirmed by 3 outlets
      </span>
      <div className="absolute left-0 top-[64px] w-[300px] rotate-[3deg] rounded-[var(--r-md)] bg-cyan p-4">
        <p className="t-sm">
          <b className="font-semibold">For you.</b> {forYou}
        </p>
      </div>
    </div>
  );
}

export function EndSticker() {
  return (
    <div className="grid h-[200px] w-[300px] place-items-center">
      <span className="-rotate-[7deg] rounded-[var(--r-sm)] border-[3px] border-press px-6 py-3 text-[3.4rem] leading-none font-semibold tracking-[-0.04em] text-press">
        — 30 —
      </span>
      <span className="t-sm -mt-6 rotate-[2deg] text-ink-3">the old newsroom sign for “the end”</span>
    </div>
  );
}
