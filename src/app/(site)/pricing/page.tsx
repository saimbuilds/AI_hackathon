import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { Plans } from "@/components/pricing/Plans";

export const metadata: Metadata = { title: "Pricing · Endpaper" };

export default function PricingPage() {
  return (
    <PageShell plate="cyan" title="Free every morning." intro="Pay only for the extras: audio, your newsletters, a paper for your parents, or a brief for your team.">
      <Plans />
    </PageShell>
  );
}
