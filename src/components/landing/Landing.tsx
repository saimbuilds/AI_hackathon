import type { Edition, StorySlot } from "@/types/edition";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Hero } from "./Hero";
import { PressScene } from "./PressScene";

const allSlots = (e: Edition): StorySlot[] => [
  e.lead,
  ...e.sections.flatMap((s) => s.slots),
  ...e.offYourBeat,
  ...e.everyonesFrontPage,
  ...e.briefs,
];

export function Landing({ edition }: { edition: Edition }) {
  const slots = allSlots(edition);
  const frontPage = slots.filter((s) => s.forYou).slice(0, 3);
  return (
    <>
      <SmoothScroll />
      <Hero stories={frontPage} onThisDay={edition.extras.onThisDay} />
      <main id="how">
        <PressScene headlines={slots.map((s) => s.headline)} />
        <div className="h-[100dvh]" />
      </main>
    </>
  );
}
