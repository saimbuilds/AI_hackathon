import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Newsreader, Schibsted_Grotesk, UnifrakturMaguntia } from "next/font/google";
import { BRAND } from "@/lib/brand";
import { PRESSES_STOPPED } from "@/lib/frozen";
import { PressesStopped } from "@/components/ui/PressesStopped";
import "./globals.css";

// Interface: one grotesk, cut for a newsroom (Schibsted), used at in-between weights.
const grotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

// The paper itself: Newsreader (optical sizes) + a blackletter masthead.
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const unifraktur = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-unifraktur",
  display: "swap",
});

// Absolute URLs for share images: APP_URL when set, else the Vercel production domain, else local dev.
const siteUrl = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${BRAND.name}: ${BRAND.tagline}`,
  description:
    "A morning paper written for you. About ten stories, each checked across outlets, each with a line on what it means for you. Six minutes, then it ends.",
};

export const viewport: Viewport = {
  themeColor: "#ffd23f",
};

// Runs before paint: Morning Edition 05:00–17:59, Evening Edition otherwise (manual override in localStorage).
// Only the reader opts into it (.edition-scope); marketing pages stay light.
// Also marks intro pieces pending so GSAP can set from-states without a flash; a timeout guarantees reveal.
const bootScript = `(function(){try{var d=document.documentElement;var o=localStorage.getItem('ep-edition');var h=new Date().getHours();d.dataset.edition=(o==='morning'||o==='evening')?o:((h>=5&&h<18)?'morning':'evening');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('intro-pending');setTimeout(function(){d.classList.remove('intro-pending')},2400)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-edition="morning"
      data-presses={PRESSES_STOPPED ? "stopped" : undefined}
      suppressHydrationWarning
      className={`${grotesk.variable} ${newsreader.variable} ${unifraktur.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {PRESSES_STOPPED && <PressesStopped />}
        {/* Route changes cross-fade with a short rise (see .page in ui.css); the nav keeps its own name and stays put. */}
        <ViewTransition default="page">{children}</ViewTransition>
      </body>
    </html>
  );
}
