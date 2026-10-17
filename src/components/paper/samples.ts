import type { Edition } from "@/types/edition";
import { paperFromEdition, type PaperData } from "./FrontPage";

// Abbu's paper: the same morning's stories, translated, in large Nastaliq type.
export const URDU_SAMPLE: PaperData = {
  paperName: "ابو کا اخبار",
  number: 12,
  city: "Rawalpindi",
  dateLabel: "ہفتہ، ۱۷ اکتوبر ۲۰۲۶",
  stats: "۸ خبریں، ۶ منٹ",
  dir: "rtl",
  lang: "ur",
  ears: { left: ["شمارہ ۱۲", "راولپنڈی"], right: ["ابو کے لیے، صائم کی طرف سے"] },
  forYouLabel: "آپ کے لیے:",
  lead: {
    kicker: "معیشت",
    headline: "ہرمز کے قریب جہازوں پر حملے ریکارڈ سطح پر، تیل کی برآمدات سست",
    forYou: "تیل کی عالمی قیمتیں پاکستان میں پیٹرول کی قیمت پر اثر ڈالتی ہیں۔",
  },
  side: [
    { kicker: "پاکستان", headline: "پاکستان ۲۰۲۷ میں آئی ایم ایف اور عالمی بینک کے بورڈز کی صدارت کرے گا" },
    { kicker: "بجلی", headline: "بجلی کمپنیوں کا ستمبر کے لیے فی یونٹ ۲.۶ روپے اضافے کا مطالبہ" },
  ],
};

/** A large-print English gift paper built from the Pakistan pages of the edition. */
export function giftEnglish(e: Edition, forName = "Abbu", fromName = "Saim", city = "Rawalpindi"): PaperData {
  const paper = paperFromEdition(e);
  const pk = e.sections.find((s) => s.name.startsWith("Pakistan"))?.slots ?? [];
  return {
    ...paper,
    paperName: `The ${forName} Times`,
    city,
    stats: "8 stories, large print",
    ears: { left: [`Edition No. ${e.number}`, city], right: [`Compiled for ${forName}`, `by ${fromName}`] },
    lead: { kicker: pk[0]?.kicker ?? "Pakistan", headline: pk[0]?.headline ?? paper.lead.headline, dek: pk[0]?.dek, trust: pk[0]?.trust },
    side: pk.slice(1, 3).map((s) => ({ kicker: s.kicker, headline: s.headline })),
  };
}
