/** Print-sheet trim marks in the four corners and a registration target. Decoration that belongs to the subject. */
export function CropMarks({ inset = 28, target = true }: { inset?: number; target?: boolean }) {
  const L = 18;
  const corner = (x: "left" | "right", y: "top" | "bottom") => (
    <svg
      key={x + y}
      width={L + 10}
      height={L + 10}
      viewBox={`0 0 ${L + 10} ${L + 10}`}
      className="absolute"
      style={{ [x]: inset - 10, [y]: inset - 10, transform: `scale(${x === "right" ? -1 : 1}, ${y === "bottom" ? -1 : 1})` }}
      aria-hidden
    >
      <path d={`M10 0v${L - 8}M0 10h${L - 8}`} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
  return (
    <div className="cropmarks hidden md:block" aria-hidden>
      {corner("left", "top")}
      {corner("right", "top")}
      {corner("left", "bottom")}
      {corner("right", "bottom")}
      {target && (
        <svg width="26" height="26" viewBox="0 0 26 26" className="absolute left-1/2 -translate-x-1/2" style={{ bottom: inset - 13 }}>
          <circle cx="13" cy="13" r="6.5" stroke="currentColor" strokeWidth="1" fill="none" />
          <path d="M13 0v26M0 13h26" stroke="currentColor" strokeWidth="1" />
        </svg>
      )}
    </div>
  );
}
