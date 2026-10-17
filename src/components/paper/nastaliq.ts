import { Noto_Nastaliq_Urdu } from "next/font/google";

// Only routes that show an Urdu paper import this, so the large Nastaliq font isn't loaded elsewhere.
export const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "600"], variable: "--font-nastaliq", display: "swap" });
