import type { Edition } from "@/types/edition";
import { PrintSheets } from "./PrintSheets";
import { qrCodes } from "./qr";

/** Server render of a known edition (the sample). */
export async function PrintEdition({ edition }: { edition: Edition }) {
  return <PrintSheets edition={edition} codes={await qrCodes(edition)} />;
}
