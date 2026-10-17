import type { Metadata } from "next";
import { Press } from "@/components/press/Press";
import { paperFromEdition } from "@/components/paper/FrontPage";
import { getSampleEdition } from "../_data";

export const metadata: Metadata = { title: "Printing your paper · Endpaper" };

export default function PressPage() {
  return <Press paper={paperFromEdition(getSampleEdition())} />;
}
