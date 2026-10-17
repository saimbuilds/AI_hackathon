import { Suspense } from "react";
import type { Metadata } from "next";
import { GiftPaper } from "@/components/gift/GiftPaper";
import { nastaliq } from "@/components/paper/nastaliq";

export const metadata: Metadata = { title: "A paper made for you · Endpaper", robots: { index: false } };

async function Paper({ params }: { params: PageProps<"/gift/[token]">["params"] }) {
  const { token } = await params;
  return <GiftPaper token={token} />;
}

export default function GiftTokenPage({ params }: PageProps<"/gift/[token]">) {
  return (
    <div className={nastaliq.variable}>
      <Suspense fallback={<main className="min-h-dvh bg-sun" />}>
        <Paper params={params} />
      </Suspense>
    </div>
  );
}
