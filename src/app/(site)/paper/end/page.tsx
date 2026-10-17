import type { Metadata } from "next";
import { Ending } from "@/components/ending/Ending";
import { getSampleEdition } from "../../_data";

export const metadata: Metadata = { title: "You’re all caught up · Endpaper" };

export default function EndPage() {
  return <Ending edition={getSampleEdition()} />;
}
