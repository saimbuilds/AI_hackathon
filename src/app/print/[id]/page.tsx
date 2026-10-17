import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintEdition } from "@/components/print/PrintEdition";
import { getSampleEdition } from "../../(site)/_data";

// Until editions are read from the database, the printable edition is the fixture.
export function generateStaticParams() {
  return [{ id: getSampleEdition().id }];
}

export async function generateMetadata({ params }: PageProps<"/print/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = getSampleEdition();
  return { title: id === e.id ? `${e.paperName}, No. ${e.number} (print)` : "Not found" };
}

export default async function PrintPage({ params }: PageProps<"/print/[id]">) {
  const { id } = await params;
  const e = getSampleEdition();
  if (id !== e.id) notFound();
  return <PrintEdition edition={e} />;
}
