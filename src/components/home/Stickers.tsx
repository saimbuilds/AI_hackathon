import { Check } from "@/components/ui/icons";

/** Small product objects that sit on the ribbon, standing in for illustration. All real UI pieces. */

export function SourcesSticker() {
  const chips: [string, number, number, number][] = [
    ["NPR", -8, 0, 0],
    ["BBC News", 5, 46, 30],
    ["Al Jazeera", -3, 10, 82],
    ["Le Monde", 9, 70, 120],
    ["The Guardian", -6, -6, 160],
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
  const [headline] = headlines;
  if (!headline) return null;
  // One card, the way the real deck looks: a headline and the three answers.
  return (
    <div className="w-[290px] -rotate-[3deg] rounded-[var(--r-md)] bg-sheet p-5 shadow-[0_18px_40px_-24px_rgb(28_29_26/0.45)]">
      <p className="t-xs text-ink-3">1 of 12</p>
      <p className="mt-2 line-clamp-3 font-serif text-[1.2rem] leading-[1.15] font-medium tracking-[-0.01em]">{headline}</p>
      <div className="mt-5 grid grid-cols-3 gap-1.5">
        <span className="chip !h-9 justify-center !bg-newsprint !text-[0.8rem]">Pass</span>
        <span className="chip !h-9 justify-center !text-[0.8rem]" data-tone="sun">
          Love
        </span>
        <span className="chip !h-9 justify-center !text-[0.8rem] ring-2 ring-ink" data-tone="leaf">
          Keep
        </span>
      </div>
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
  // What the last page feels like: done, remembered, and a score to share.
  return (
    <div className="w-[280px] rotate-[3deg] rounded-[var(--r-md)] bg-sun p-5 shadow-[0_18px_40px_-24px_rgb(28_29_26/0.45)]">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sun">
        <Check size={16} />
      </span>
      <p className="t-md mt-4">Done for today.</p>
      <p className="t-sm mt-1 text-ink-2">Daily 3: 3 of 3</p>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-7 w-7 rounded-[var(--r-xs)] bg-leaf" />
        ))}
      </div>
    </div>
  );
}
