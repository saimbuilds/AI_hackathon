import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { GiftBuilder } from "@/components/gift/GiftBuilder";
import { URDU_SAMPLE, giftEnglish } from "@/components/paper/samples";
import { nastaliq } from "@/components/paper/nastaliq";
import { getSampleEdition } from "../_data";

export const metadata: Metadata = { title: "Make a paper for someone you love · Endpaper" };

export default function GiftPage() {
  return (
    <div className={nastaliq.variable}>
      <PageShell
        plate="sun"
        title="Make one for someone you love."
        intro="A morning paper for your parents or grandparents, in their language and in type they can read, signed from you."
      >
        <GiftBuilder english={giftEnglish(getSampleEdition())} urdu={URDU_SAMPLE} />
      </PageShell>
    </div>
  );
}
