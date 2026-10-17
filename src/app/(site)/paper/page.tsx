import type { Metadata } from "next";
import { Reader } from "@/components/reader/Reader";
import { getSampleEdition } from "../_data";

export function generateMetadata(): Metadata {
  const e = getSampleEdition();
  return { title: `${e.paperName}, No. ${e.number} · Endpaper` };
}

export default function PaperPage() {
  return <Reader edition={getSampleEdition()} />;
}
