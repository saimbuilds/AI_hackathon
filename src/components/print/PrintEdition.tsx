import QRCode from "qrcode";
import type { Edition, StorySlot } from "@/types/edition";
import { allSlots, formatEditionDate, trustLabel } from "@/components/paper/FrontPage";
import { PrintToolbar } from "./PrintToolbar";

const sentences = (s: StorySlot, max = 99) =>
  s.body.slice(0, max).map((b, i) => (
    <span key={i}>
      {b.text}
      <sup>{b.sources.join(",")}</sup>{" "}
    </span>
  ));

async function qr(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff00" } });
}

function Story({ s, qrSvg, size = "md", drop = false, maxSentences = 99 }: { s: StorySlot; qrSvg: string; size?: "xl" | "lg" | "md" | "sm"; drop?: boolean; maxSentences?: number }) {
  const hed = { xl: "2.9em", lg: "1.8em", md: "1.35em", sm: "1.1em" }[size];
  return (
    <article className="story">
      <p className="kick">{s.kicker}</p>
      <h3 className="hed" style={{ fontSize: hed }}>
        {s.headline}
      </h3>
      {size !== "sm" && <p className="dek">{s.dek}</p>}
      <p className={`just ${drop ? "drop" : ""}`}>{sentences(s, maxSentences)}</p>
      {s.forYou && size !== "sm" && (
        <p className="foryou">
          <b>For you.</b> {s.forYou}
        </p>
      )}
      <div className="meta">
        <span>
          {trustLabel(s.trust)}. Sources: {s.sources.map((x, i) => `${i + 1} ${x.name}`).join(", ")}
        </span>
        <span className="qr flex-none" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="Scan to read online" />
      </div>
    </article>
  );
}

function Foot({ e, page }: { e: Edition; page: number }) {
  return (
    <div className="sheet-foot">
      <span translate="no">
        {e.paperName} · Edition No. {e.number}
      </span>
      <span>{formatEditionDate(e.date)}</span>
      <span>Page {page} of 4</span>
    </div>
  );
}

/** Four A4 pages: front, two section pages sized by interest, and a back page that ends the paper. */
export async function PrintEdition({ edition: e }: { edition: Edition }) {
  const slots = allSlots(e);
  const codes = Object.fromEntries(await Promise.all(slots.map(async (s) => [s.storyId, await qr(s.sources[0]?.url ?? "https://endpaper.app")] as const)));
  const [secA, ...rest] = e.sections;
  const pageTwo = [secA].filter(Boolean);
  const pageThree = rest;

  return (
    <div className="print-root">
      <PrintToolbar />
      <div className="print-desk">
        {/* ---------- Page 1: the front ---------- */}
        <section className="sheet" aria-label="Front page">
          <div className="flex items-end justify-between font-sans text-[7.5pt]">
            <span>
              Edition No. {e.number}
              <br />
              {e.city} Edition
            </span>
            <span className="text-right">
              {e.gift ? `Compiled for ${e.gift.forName} by ${e.gift.fromName}` : "An Endpaper edition"}
              <br />
              {e.weather ? `${e.weather.hi}° / ${e.weather.lo}°` : ""}
            </span>
          </div>
          <h1 className="text-center font-blackletter text-[54pt] leading-none" translate="no">
            {e.paperName}
          </h1>
          <div className="mt-[2mm] flex justify-between border-y-[1.2pt] border-[#c8102e] py-[1.2mm] font-sans text-[7.5pt]">
            <span>{formatEditionDate(e.date)}</span>
            <span>{slots.length} stories</span>
            <span>Scan any code to read the sources</span>
          </div>
          <p className="dek mt-[3mm] text-[1.05em]">{e.editorNote}</p>
          <div className="mt-[4mm] grid min-h-0 flex-1 grid-cols-[1.9fr_1fr] gap-[5mm]">
            <div className="min-h-0 overflow-hidden">
              <Story s={e.lead} qrSvg={codes[e.lead.storyId]} size="xl" drop />
            </div>
            <div className="min-h-0 overflow-hidden border-l-[0.25pt] border-[rgb(17_17_17/0.28)] pl-[5mm]">
              {e.everyonesFrontPage.map((s) => (
                <Story key={s.storyId} s={s} qrSvg={codes[s.storyId]} size="md" maxSentences={3} />
              ))}
              {e.sections
                .flatMap((x) => x.slots)
                .filter((s) => s.size === "major")
                .slice(0, 1)
                .map((s) => (
                  <Story key={s.storyId} s={s} qrSvg={codes[s.storyId]} size="md" maxSentences={2} />
                ))}
            </div>
          </div>
          <Foot e={e} page={1} />
        </section>

        {/* ---------- Pages 2 and 3: sections, sized by interest ---------- */}
        {[pageTwo, pageThree].map((secs, pi) => (
          <section key={pi} className="sheet" aria-label={`Page ${pi + 2}`}>
            {secs.map((sec, si) => (
              <div key={sec.name} className={`flex min-h-0 flex-col ${si === secs.length - 1 ? "flex-1" : ""}`}>
                <h2 className="mb-[3mm] border-b-[1.2pt] border-[#111] pb-[1mm] font-sans text-[15pt] font-semibold tracking-[-0.03em]">{sec.name}</h2>
                <div className="sheet-cols">
                  {sec.slots.map((s) => (
                    <Story key={s.storyId} s={s} qrSvg={codes[s.storyId]} size={s.size === "major" ? "lg" : "md"} drop={s.size === "major"} />
                  ))}
                </div>
              </div>
            ))}
            <Foot e={e} page={pi + 2} />
          </section>
        ))}

        {/* ---------- Page 4: the back page ---------- */}
        <section className="sheet" aria-label="Back page">
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-[6mm]">
            <div className="min-h-0 overflow-hidden">
              <h2 className="mb-[3mm] border-b-[1.2pt] border-[#111] pb-[1mm] font-sans text-[15pt] font-semibold tracking-[-0.03em]">Off your beat</h2>
              {e.offYourBeat.map((s) => (
                <Story key={s.storyId} s={s} qrSvg={codes[s.storyId]} size="lg" drop />
              ))}
              <h2 className="mt-[4mm] mb-[3mm] border-b-[1.2pt] border-[#111] pb-[1mm] font-sans text-[15pt] font-semibold tracking-[-0.03em]">In other news</h2>
              {e.briefs.map((s) => (
                <Story key={s.storyId} s={s} qrSvg={codes[s.storyId]} size="sm" maxSentences={2} />
              ))}
            </div>
            <div className="flex min-h-0 flex-col gap-[4mm] overflow-hidden">
              {e.extras.onThisDay && (
                <div className="border-[0.6pt] border-[#111] p-[3mm]">
                  <p className="kick">On this day</p>
                  <p className="mt-[1mm]">{e.extras.onThisDay}</p>
                </div>
              )}
              <div>
                <p className="kick">Three things to remember</p>
                <ol className="mt-[1.5mm] list-decimal space-y-[1mm] pl-[4mm]">
                  {e.threeThings.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="kick">The Daily 3</p>
                <ol className="mt-[1.5mm] space-y-[2mm]">
                  {e.dailyThree.map((q, i) => (
                    <li key={q.q}>
                      <b>
                        {i + 1}. {q.q}
                      </b>
                      <br />
                      {q.options.map((o, oi) => `${String.fromCharCode(97 + oi)}) ${o}`).join("   ")}
                    </li>
                  ))}
                </ol>
                <p className="upside mt-[2mm]">Answers: {e.dailyThree.map((q, i) => `${i + 1}${String.fromCharCode(97 + q.answer)}`).join("  ")}</p>
              </div>
              <div>
                <p className="kick">Tomorrow in your paper</p>
                <ul className="mt-[1.5mm] space-y-[1mm]">
                  {e.tomorrow.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-auto text-center font-sans text-[16pt] font-semibold text-[#c8102e]">— 30 —</p>
            </div>
          </div>
          <Foot e={e} page={4} />
        </section>
      </div>
    </div>
  );
}
