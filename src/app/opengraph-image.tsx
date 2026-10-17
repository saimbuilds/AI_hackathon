import { ImageResponse } from "next/og";
import { googleFont } from "@/components/og/googleFont";

export const alt = "Endpaper: the morning paper that ends. Read less. Remember more.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEAD = ["Read less.", "Remember more."];
const TAG = "The morning paper that ends.";
const MAST = "The Morning Paper";

export default async function Image() {
  const [grotesk, black] = await Promise.all([
    googleFont("Schibsted Grotesk", 500, HEAD.join("") + "Endpaper" + TAG),
    googleFont("UnifrakturMaguntia", 400, MAST),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffd23f", color: "#1c1d1a", padding: "64px 72px", position: "relative", fontFamily: "Grotesk" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, letterSpacing: "-0.04em" }}>
          <svg width="40" height="40" viewBox="0 0 26 26">
            <path d="M4 3h12.5L22 8.5V23H4z" fill="#1c1d1a" />
            <path d="M16.5 3v5.5H22z" fill="#fbfaf6" />
          </svg>
          Endpaper
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 44, fontSize: 132, lineHeight: 0.9, letterSpacing: "-0.06em" }}>
          {HEAD.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 30, letterSpacing: "-0.02em", color: "#474842" }}>{TAG}</div>
        <div
          style={{
            position: "absolute",
            right: 64,
            bottom: -70,
            width: 430,
            height: 300,
            background: "#f6f3ec",
            borderRadius: 8,
            transform: "rotate(-5deg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 34,
            fontFamily: "Blackletter",
            fontSize: 52,
            boxShadow: "0 30px 60px -30px rgba(28,29,26,0.45)",
          }}
        >
          <span>{MAST}</span>
          <div style={{ display: "flex", width: 360, height: 3, background: "#151513", marginTop: 14 }} />
          {[300, 340, 280, 330, 260].map((w, i) => (
            <div key={i} style={{ display: "flex", width: w, height: i === 0 ? 18 : 9, background: i === 0 ? "#151513" : "#c9c4b8", borderRadius: 2, marginTop: i === 0 ? 18 : 12, alignSelf: "flex-start", marginLeft: 35 }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(grotesk ? [{ name: "Grotesk", data: grotesk, weight: 500 as const, style: "normal" as const }] : []),
        ...(black ? [{ name: "Blackletter", data: black, weight: 400 as const, style: "normal" as const }] : []),
      ],
    },
  );
}
