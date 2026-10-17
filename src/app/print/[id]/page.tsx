import { Suspense } from "react";
import type { Metadata } from "next";
import { PrintEdition } from "@/components/print/PrintEdition";
import { PrintLoader } from "@/components/print/PrintLoader";
import { getSampleEdition } from "../../(site)/_data";
import { nastaliq } from "@/components/paper/nastaliq";

export const metadata: Metadata = { title: "Print edition · Endpaper" };

// The sample prints on the server; a reader's own edition is read under their session in the browser.
export function generateStaticParams() {
  return [{ id: getSampleEdition().id }];
}

async function Sheets({ params }: { params: PageProps<"/print/[id]">["params"] }) {
  const { id } = await params;
  const sample = getSampleEdition();
  return id === sample.id ? <PrintEdition edition={sample} /> : <PrintLoader id={id} />;
}

export default function PrintPage({ params }: PageProps<"/print/[id]">) {
  return (
    <div className={nastaliq.variable}>
      <Suspense fallback={<div className="print-desk" />}>
        <Sheets params={params} />
      </Suspense>
    </div>
  );
}
