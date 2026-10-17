import { Suspense } from "react";
import type { Metadata } from "next";
import { ShareLanding } from "@/components/share/ShareLanding";

export const metadata: Metadata = { title: "A story for you · Endpaper", robots: { index: false } };

async function Landing({ params }: { params: PageProps<"/s/[token]">["params"] }) {
  const { token } = await params;
  return <ShareLanding token={token} />;
}

export default function SharePage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-sun" />}>
      <Landing params={params} />
    </Suspense>
  );
}
