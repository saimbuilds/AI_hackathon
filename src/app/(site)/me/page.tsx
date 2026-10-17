import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { Dashboard } from "@/components/account/Dashboard";

export const metadata: Metadata = { title: "My paper · Endpaper", robots: { index: false } };

export default function MePage() {
  return (
    <PageShell plate="sun" title="My paper." intro="Today’s edition, your streak, what you follow, the papers you give, and your account.">
      <Dashboard />
    </PageShell>
  );
}
