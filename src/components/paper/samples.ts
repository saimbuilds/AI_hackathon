import type { Edition } from "@/types/edition";
import { paperFromEdition, type PaperData } from "./FrontPage";

// A family paper: the same morning's stories, translated, in large Nastaliq type.
export const URDU_SAMPLE: PaperData = {
  paperName: "گھر کا اخبار",
  number: 12,
  city: "Lahore",
  dateLabel: "ہفتہ، ۱۷ اکتوبر ۲۰۲۶",
  stats: "۸ خبریں، ۶ منٹ",
  dir: "rtl",
  lang: "ur",
  ears: { left: ["شمارہ ۱۲", "لاہور"], right: ["آپ کے لیے، محبت کے ساتھ"] },
  forYouLabel: "آپ کے لیے:",
  lead: {
    kicker: "معیشت",
    headline: "ہرمز کے قریب جہازوں پر حملے ریکارڈ سطح پر، تیل کی برآمدات سست",
    forYou: "تیل کی عالمی قیمتیں آپ کے شہر میں پیٹرول کی قیمت پر اثر ڈالتی ہیں۔",
  },
  side: [],
};

/** A large-print English gift paper built from the edition's non-regional pages. */
export function giftEnglish(e: Edition, forName = "Mum", fromName = "you", city = "Manila"): PaperData {
  const paper = paperFromEdition(e);
  const pk = e.sections.find((s) => !s.name.startsWith("Pakistan"))?.slots ?? [];
  return {
    ...paper,
    paperName: `The ${forName} Times`,
    city,
    stats: "8 stories, large print",
    ears: { left: [`Edition No. ${e.number}`, city], right: [`Compiled for ${forName}`, fromName === "you" ? "with love" : `from ${fromName}`] },
    lead: { kicker: pk[0]?.kicker ?? paper.lead.kicker, headline: pk[0]?.headline ?? paper.lead.headline, dek: pk[0]?.dek, trust: pk[0]?.trust },
    side: pk.slice(1, 3).map((s) => ({ kicker: s.kicker, headline: s.headline })),
  };
}
