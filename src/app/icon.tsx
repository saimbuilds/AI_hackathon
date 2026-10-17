import { ImageResponse } from "next/og";

// The mark (a page with its corner turned) at the sizes browsers and the installed app ask for.
export function generateImageMetadata() {
  return [32, 192, 512].map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const s = Number(await id);
  const pad = Math.round(s * 0.16);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffd23f", borderRadius: s >= 192 ? s * 0.22 : s * 0.2 }}>
        <svg width={s - pad * 2} height={s - pad * 2} viewBox="0 0 26 26">
          <path d="M4 3h12.5L22 8.5V23H4z" fill="#1c1d1a" />
          <path d="M16.5 3v5.5H22z" fill="#fbfaf6" />
          <path d="M8 13h10M8 16.5h10M8 20h6" stroke="#ffd23f" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: s, height: s },
  );
}
