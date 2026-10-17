import type { Edition } from "@/types/edition";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Hero } from "./Hero";

export function Landing({ edition }: { edition: Edition }) {
  const frontPage = [edition.lead, ...edition.sections.flatMap((s) => s.slots)].filter((s) => s.forYou).slice(0, 3);
  return (
    <>
      <SmoothScroll />
      <Hero stories={frontPage} onThisDay={edition.extras.onThisDay} />
      <main id="how" className="min-h-[60vh]" />
    </>
  );
}
