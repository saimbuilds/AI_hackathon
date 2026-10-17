import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "@/components/home/Footer";

type Plate = "sun" | "cyan" | "press" | "leaf" | "ink";
const BG: Record<Plate, string> = {
  sun: "bg-sun",
  cyan: "bg-cyan",
  press: "bg-press",
  leaf: "bg-leaf",
  ink: "bg-ink text-[var(--on-dark)]",
};

/** Standard inner page: a color plate header, newsprint body, and the footer revealed underneath. */
export function PageShell({
  plate = "sun",
  title,
  intro,
  aside,
  children,
}: {
  plate?: Plate;
  title: ReactNode;
  intro?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Nav />
      <main id="main" className="panel-bottom relative z-10 bg-newsprint pb-24">
        <header className={`panel-bottom ${BG[plate]} pt-[calc(var(--nav-h)+var(--nav-top)+10vh)] pb-[9vh]`}>
          <div className="container-page grid items-end gap-8 md:grid-cols-12">
            <div className="md:col-span-8">
              <h1 className="t-mega max-w-[12ch] !text-[clamp(3.2rem,1rem+7.6vw,8rem)]">{title}</h1>
            </div>
            {(intro || aside) && (
              <div className="md:col-span-4">
                {intro && <p className="t-body-lg max-w-[36ch] opacity-80">{intro}</p>}
                {aside}
              </div>
            )}
          </div>
        </header>
        {children}
      </main>
      <Footer />
    </>
  );
}
