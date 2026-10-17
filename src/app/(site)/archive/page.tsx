import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { Shelf } from "@/components/archive/Shelf";
import { getSampleEdition } from "../_data";

export const metadata: Metadata = { title: "Archive · Endpaper" };

export default function ArchivePage() {
  return (
    <PageShell plate="press" title="Every paper you’ve finished." intro="Open any edition as it was printed that morning, or save it as a PDF.">
      <Shelf editions={[getSampleEdition()]} />
    </PageShell>
  );
}
