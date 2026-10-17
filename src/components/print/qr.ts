import QRCode from "qrcode";
import type { Edition } from "@/types/edition";
import { allSlots } from "@/components/paper/FrontPage";

// One QR code per story, pointing at its first source. Works on the server and in the browser.
export async function qrCodes(e: Edition): Promise<Record<string, string>> {
  const pairs = await Promise.all(
    allSlots(e).map(async (s) => {
      const svg = await QRCode.toString(s.sources[0]?.url ?? "https://endpaper.app", { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff00" } });
      return [s.storyId, svg] as const;
    }),
  );
  return Object.fromEntries(pairs);
}
