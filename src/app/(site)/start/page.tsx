import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { allSlots, paperFromEdition } from "@/components/paper/FrontPage";
import { getSampleEdition } from "../_data";

export const metadata: Metadata = { title: "Print your first paper · Endpaper" };

export default function StartPage() {
  const e = getSampleEdition();
  // Until the API deck lands (GET /api/onboarding/deck), the deck is today's real fixture headlines.
  const deck = allSlots(e)
    .slice(0, 12)
    .map((s) => ({ storyId: s.storyId, headline: s.headline, dek: s.dek, kicker: s.kicker.split(" · ")[0], outlets: s.trust.outlets }));
  return <Onboarding deck={deck} preview={paperFromEdition(e, "The Morning Paper")} />;
}
