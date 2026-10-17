import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { FollowingList } from "@/components/follow/FollowingList";

export const metadata: Metadata = { title: "Following · Endpaper" };

export default function FollowingPage() {
  return (
    <PageShell plate="sun" title="What you’re following." intro="Questions and stories you asked us to watch. When the news changes the answer, it opens your next paper.">
      <FollowingList />
    </PageShell>
  );
}
