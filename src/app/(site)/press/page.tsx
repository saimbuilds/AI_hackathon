import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PRESSES_STOPPED } from "@/lib/frozen";
import { Press } from "@/components/press/Press";
import { paperFromEdition } from "@/components/paper/FrontPage";
import { getSampleEdition } from "../_data";

export const metadata: Metadata = { title: "Printing your paper · Endpaper" };

export default function PressPage() {
  if (PRESSES_STOPPED) redirect("/paper?tour=1");
  return <Press paper={paperFromEdition(getSampleEdition())} />;
}
