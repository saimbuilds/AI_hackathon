import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { Lab } from "@/components/lab/Lab";

export const metadata: Metadata = { title: "Learning Lab · Endpaper" };

export default function LabPage() {
  return (
    <PageShell plate="cyan" title="Proof it learns." intro="Simulated readers with hidden interests read a week of real stories. We measure whether their paper gets more relevant without shrinking into a bubble.">
      <Lab />
    </PageShell>
  );
}
