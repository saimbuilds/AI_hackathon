import type { Metadata } from "next";
import { EndScreen } from "@/components/session/Screens";
import { getSampleEdition } from "../../_data";

export const metadata: Metadata = { title: "You’re all caught up · Endpaper" };

export default function EndPage() {
  return <EndScreen sample={getSampleEdition()} />;
}
