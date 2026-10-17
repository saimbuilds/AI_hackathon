import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffd23f" }}>
        <svg width="124" height="124" viewBox="0 0 26 26">
          <path d="M4 3h12.5L22 8.5V23H4z" fill="#1c1d1a" />
          <path d="M16.5 3v5.5H22z" fill="#fbfaf6" />
          <path d="M8 13h10M8 16.5h10M8 20h6" stroke="#ffd23f" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
