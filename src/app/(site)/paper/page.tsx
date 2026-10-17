import type { Metadata } from "next";
import { PaperScreen } from "@/components/session/Screens";
import { getSampleEdition } from "../_data";

export const metadata: Metadata = { title: "Your paper · Endpaper" };

export default function PaperPage() {
  return <PaperScreen sample={getSampleEdition()} />;
}
