import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader, Schibsted_Grotesk, UnifrakturMaguntia } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});

const unifraktur = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-unifraktur",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name}: ${BRAND.tagline}`,
  description:
    "Every morning, one paper written for you. About ten stories, each confirmed across outlets, each with a line on what it means for you. Six minutes, then you're done.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

// Runs before paint: Morning Edition 05:00–17:59, Evening Edition otherwise (manual override in localStorage).
// Also marks the hero as pending so GSAP can set from-states without a flash; a timeout guarantees reveal.
const editionScript = `(function(){try{var d=document.documentElement;var o=localStorage.getItem('ep-edition');var h=new Date().getHours();d.dataset.edition=(o==='morning'||o==='evening')?o:((h>=5&&h<18)?'morning':'evening');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('intro-pending');setTimeout(function(){d.classList.remove('intro-pending')},2600)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-edition="morning"
      suppressHydrationWarning
      className={`${newsreader.variable} ${schibsted.variable} ${unifraktur.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: editionScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
