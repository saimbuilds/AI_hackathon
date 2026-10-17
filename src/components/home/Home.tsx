import type { Edition } from "@/types/edition";
import { Nav } from "@/components/ui/Nav";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { paperFromEdition, allSlots } from "@/components/paper/FrontPage";
import { URDU_SAMPLE, giftEnglish } from "@/components/paper/samples";
import { nastaliq } from "@/components/paper/nastaliq";
import { HomeTop } from "./HomeTop";
import { Journey } from "./Journey";
import { ReadyCta } from "./ReadyCta";
import { GiftPanel } from "./GiftPanel";
import { Numbers } from "./Numbers";
import { BusinessModel } from "./BusinessModel";
import { TodaysPaper } from "./TodaysPaper";
import { Sources } from "./Sources";
import { Footer } from "./Footer";
import { SourcesSticker, SwipeSticker, TrustSticker, EndSticker } from "./Stickers";

export function Home({ edition }: { edition: Edition }) {
  const paper = paperFromEdition(edition);
  const slots = allSlots(edition);
  // Calm, short headlines for the swipe sticker: the landing page shouldn’t lead with tragedy.
  const calmHeadlines = slots.filter((s) => s.distress === 0 && s.headline.length < 70).map((s) => s.headline).slice(0, 2);
  const english = giftEnglish(edition);
  const forYou = slots.find((s) => s.forYou && s !== edition.lead)?.forYou ?? edition.lead.forYou ?? "";

  const steps = [
    {
      title: "While you slept, we read 530 newsrooms.",
      body: "From the BBC, NPR and The Guardian to Le Monde, El País and Dawn, read overnight and grouped into the stories underneath the noise, so five articles about one event become one story.",
      cta: { label: "See who we read", href: "#sources", tone: "press" as const },
      sticker: <SourcesSticker />,
    },
    {
      title: "Then we keep the ten that are yours.",
      body: "Tell us who you are in one sentence and swipe twelve of today’s headlines. Every swipe, skip and save teaches your editor what belongs in your paper.",
      cta: { label: "Try it in 90 seconds", href: "/start", tone: "cyan" as const },
      sticker: <SwipeSticker headlines={calmHeadlines} />,
    },
    {
      title: "Every story says what it means for you.",
      body: "A line under each story ties it to your city, your work and your plans, and a badge shows how many outlets confirmed it. Single-source stories say so.",
      cta: { label: "Read a sample story", href: "/paper", tone: "sun" as const },
      sticker: <TrustSticker forYou={forYou} />,
    },
    {
      title: "And then it ends.",
      body: "No feed and no “one more”. The last page gives you three things to remember and a three-question quiz, then lets you go until tomorrow at 7.",
      cta: { label: "See the last page", href: "/paper/end", tone: "leaf" as const },
      sticker: <EndSticker />,
    },
  ];

  return (
    <>
      <SmoothScroll />
      <Nav />
      <main id="main" className={`relative z-10 ${nastaliq.variable}`}>
        <HomeTop paper={paper} />
        <section className="relative z-10 bg-newsprint" aria-label="How it works">
          <Journey steps={steps} />
        </section>
        <ReadyCta />
        <GiftPanel urdu={URDU_SAMPLE} english={english} />
        <Numbers />
        <BusinessModel />
        <section
          id="sources"
          className="panel relative z-10 -mt-[var(--r-lg)] bg-newsprint-2 pt-28 pb-28 md:pt-36 md:pb-36"
        >
          <TodaysPaper edition={edition} />
          <Sources />
        </section>
      </main>
      <Footer />
    </>
  );
}
