/** The reader's own paper name in blackletter. With `animate`, each glyph drops in like set metal type. */
export function Masthead({ name, animate = false, as: Tag = "h2" }: { name: string; animate?: boolean; as?: "h1" | "h2" }) {
  const len = [...name].length;
  return (
    <Tag
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
    </Tag>
  );
}
