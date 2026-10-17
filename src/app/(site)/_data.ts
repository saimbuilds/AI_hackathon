import sample from "../../../fixtures/edition.sample.json";
import { EditionSchema, type Edition, type StorySlot } from "@/types/edition";

// Landing + offline demo data. Validated against the contract so a fixture drift fails loudly at build.
// The fixture was cut for one Pakistani reader; the public sample reads as a global edition instead, so
// anything tied to that reader's country is neutralised here (the fixture itself is backend-owned).
const LOCAL = /pakistan|islamabad|disco|\bRs\s?\d|\bPKR\b|K-P|peshawar|karachi|lahore/i;
const local = (...t: (string | undefined)[]) => t.some((x) => x && LOCAL.test(x));

function neutral(s: StorySlot): StorySlot {
  const kicker = LOCAL.test(s.kicker) ? s.kicker.replace(/Pakistan\s*&\s*the\s*Gulf/i, "Energy").replace(/Pakistan\s*·\s*/i, "") : s.kicker;
  return { ...s, kicker, forYou: local(s.forYou) ? undefined : s.forYou, whyThis: local(s.whyThis) ? "Picked for you from today’s top stories." : s.whyThis, whyItMatters: local(s.whyItMatters) ? s.dek : s.whyItMatters };
}

export function getSampleEdition(): Edition {
  const e = EditionSchema.parse(sample);
  const keep = (s: StorySlot) => !local(s.headline, s.dek);
  const sections = e.sections
    .map((x) => ({ name: LOCAL.test(x.name) ? "World & Energy" : x.name, slots: x.slots.filter(keep).map(neutral) }))
    .filter((x) => x.slots.length);
  const alive = new Set([e.lead, ...sections.flatMap((x) => x.slots), ...e.offYourBeat, ...e.briefs, ...e.everyonesFrontPage].map((s) => s.storyId));
  return {
    ...e,
    paperName: "The Morning Paper",
    city: "New York",
    editorNote:
      "Good morning. Washington sets the front page today: a sanctions waiver that Kyiv will read as a setback. Elsewhere, Gulf shipping still weighs on oil markets, and the AI desk has a safety finding worth five minutes. Off your beat: a rare piece of good climate news from Brazil.",
    lead: neutral(e.lead),
    sections,
    offYourBeat: e.offYourBeat.filter(keep).map(neutral),
    briefs: e.briefs.filter(keep).map(neutral),
    everyonesFrontPage: e.everyonesFrontPage.filter(keep).map(neutral),
    threeThings: e.threeThings.filter((t) => !local(t)),
    tomorrow: e.tomorrow.filter((t) => !local(t)),
    quiz: e.quiz.filter((q) => alive.has(q.storyId) && !local(q.q, ...q.options)),
    dailyThree: e.dailyThree.filter((q) => !local(q.q, ...q.options)),
    extras: { ...e.extras, onThisDay: local(e.extras.onThisDay) ? "On this day in 1989, the first Game Boy went on sale in Japan." : e.extras.onThisDay },
  };
}
