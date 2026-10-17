/** The reader's own paper name in blackletter. With `animate`, each glyph drops in like set metal type. */
export function Masthead({ name, animate = false }: { name: string; animate?: boolean }) {
  const len = [...name].length;
  return (
    <h2
      className="paper-masthead"
      data-long={len > 16 || undefined}
      data-xlong={len > 21 || undefined}
      translate="no"
      aria-label={name}
    >
      {animate
        ? [...name].map((ch, i) => (
            <span key={`${i}-${ch}`} className="glyph" aria-hidden style={{ animationDelay: `${Math.min(i, 14) * 18}ms` }}>
              {ch === " " ? " " : ch}
            </span>
          ))
        : name}
    </h2>
  );
}
