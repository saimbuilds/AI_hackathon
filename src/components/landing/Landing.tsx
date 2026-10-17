import type { Edition, StorySlot } from "@/types/edition";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Reveals } from "@/components/motion/Reveals";
import { Hero } from "./Hero";
import { PressScene } from "./PressScene";
import { StoryScene } from "./StoryScene";
import { EndScene } from "./EndScene";
import { PrintScene } from "./PrintScene";
import { FamilyScene } from "./FamilyScene";
import { Pricing } from "./Pricing";
import { Footer } from "./Footer";

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
  const showcase = slots.find((s) => s.forYou && s.body.length >= 2) ?? edition.lead;
  return (
    <>
      <SmoothScroll />
      <Reveals />
      <Hero stories={frontPage} onThisDay={edition.extras.onThisDay} />
      <main id="how">
        <PressScene headlines={slots.map((s) => s.headline)} />
        <StoryScene story={showcase} />
        <EndScene threeThings={edition.threeThings} tomorrow={edition.tomorrow} editionNumber={edition.number} />
        <PrintScene
          paperName={edition.paperName}
          city={edition.city}
          lead={edition.lead}
          secondary={edition.sections.flatMap((s) => s.slots)}
        />
        <FamilyScene />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
