import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { Newsroom } from "@/components/newsroom/Newsroom";

export const metadata: Metadata = { title: "Newsroom · Endpaper", robots: { index: false } };

export default function NewsroomPage() {
  return (
    <PageShell plate="ink" title="The newsroom." intro="Everything about today’s launch on one screen: readers, the press, the queue and what the AI is costing.">
      <Newsroom />
    </PageShell>
  );
}
