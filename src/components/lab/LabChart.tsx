"use client";

import { useId, useState } from "react";

export type Series = { key: string; label: string; color: string; points: { day: number; value: number }[] };

/** One-axis line chart (0–100%), days on x. Direct labels at the line ends + a legend; crosshair tooltip on hover. */
export function LabChart({ series, title, floor, height = 340 }: { series: Series[]; title: string; floor?: { value: number; label: string }; height?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = height;
  const pad = { l: 44, r: 150, t: 16, b: 36 };
  const days = Math.max(...series.flatMap((s) => s.points.map((p) => p.day)), 1);
  const x = (d: number) => pad.l + ((d - 1) / Math.max(days - 1, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <figure className="w-full" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="t-md">
        {title}
      </figcaption>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="t-sm flex items-center gap-2 text-ink-2">
            <span className="h-[3px] w-5 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`${title}. ${series.map((s) => `${s.label}: day 1 ${Math.round((s.points[0]?.value ?? 0) * 100)}%, day ${days} ${Math.round((s.points.at(-1)?.value ?? 0) * 100)}%`).join("; ")}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={pad.l - 10} y={y(t)} textAnchor="end" dominantBaseline="central" className="fill-[var(--ink-3)] text-[12px]">
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
            <text key={d} x={x(d)} y={H - 10} textAnchor="middle" className="fill-[var(--ink-3)] text-[12px]">
              Day {d}
            </text>
          ))}
          {floor && (
            <g>
              <line x1={pad.l} x2={W - pad.r} y1={y(floor.value)} y2={y(floor.value)} stroke="var(--ink-2)" strokeWidth={1.5} strokeDasharray="5 5" />
              <text x={W - pad.r + 8} y={y(floor.value)} dominantBaseline="central" className="fill-[var(--ink-2)] text-[12px]">
                {floor.label}
              </text>
            </g>
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-3)" strokeWidth={1} />}
          {series.map((s) => (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" points={s.points.map((p) => `${x(p.day)},${y(p.value)}`).join(" ")} />
              {s.points.map((p) => (
                <circle key={p.day} cx={x(p.day)} cy={y(p.value)} r={hover === p.day ? 5 : 3.5} fill={s.color} stroke="var(--sheet)" strokeWidth={2} />
              ))}
              {s.points.length > 0 && (
                <text x={W - pad.r + 10} y={y(s.points.at(-1)!.value)} dominantBaseline="central" className="fill-[var(--ink)] text-[13px] font-medium">
                  {s.label} {Math.round(s.points.at(-1)!.value * 100)}%
                </text>
              )}
            </g>
          ))}
          {/* Hit areas: one column per day, wider than the marks */}
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
            <rect
              key={d}
              x={x(d) - (W - pad.l - pad.r) / Math.max(days - 1, 1) / 2}
              y={pad.t}
              width={(W - pad.l - pad.r) / Math.max(days - 1, 1)}
              height={H - pad.t - pad.b}
              fill="transparent"
              onPointerEnter={() => setHover(d)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-[var(--r-sm)] bg-ink px-3 py-2 text-[var(--on-dark)] shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)]"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > days / 2 ? "-110%" : "10%"})` }}
            role="status"
          >
            <p className="t-xs opacity-70">Day {hover}</p>
            {series.map((s) => {
              const v = s.points.find((p) => p.day === hover)?.value;
              return (
                <p key={s.key} className="t-sm t-num flex items-center gap-2 whitespace-nowrap">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                  {s.label}: {v === undefined ? "–" : `${Math.round(v * 100)}%`}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </figure>
  );
}
