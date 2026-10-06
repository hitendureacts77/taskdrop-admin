'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { inr, inrShort } from '@/lib/format';

export type ChartSeries = {
  name: string;
  color: string;
  /** Paise per point. null = no matching point (e.g. 31 Aug has no 31st in the comparison month). */
  values: (number | null)[];
  dashed?: boolean;
  area?: boolean;
  /** Per-point names for this series in the tooltip, when they differ from the x labels (the comparison line's own dates). */
  pointLabels?: (string | null)[];
};

type Props = {
  /** Long name of each point, for the tooltip: "Mon, 21 Sep". */
  labels: string[];
  /** Which points get a date under the axis. */
  ticks: { index: number; text: string }[];
  series: ChartSeries[];
  /** One sentence for screen readers describing what the chart shows. */
  summary: string;
  height?: number;
  emptyText?: string;
  /** Where clicking (or pressing Enter on) each point goes, e.g. that day's list. */
  pointHrefs?: string[];
};

function niceScale(max: number): { top: number; step: number } {
  if (!(max > 0)) return { top: 10000, step: 2500 };
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((s) => s * mag).find((s) => s >= raw) ?? 10 * mag;
  return { top: step * Math.ceil(max / step), step };
}

export function LineChart({ labels, ticks, series, summary, height = 260, emptyText, pointHrefs }: Props) {
  const router = useRouter();
  const [opening, startTransition] = useTransition();
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const n = labels.length;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const max = Math.max(0, ...all);
  const min = Math.min(0, ...all); // corrections can be negative
  const { step } = niceScale(max - min);
  const top = max > 0 ? step * Math.ceil(max / step) : min < 0 ? 0 : step * 4;
  const bottom = min < 0 ? -step * Math.ceil(-min / step) : 0;
  const gridValues: number[] = [];
  for (let v = bottom; v <= top + 1e-9; v += step) gridValues.push(Math.round(v));

  const xPct = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const yPct = (v: number) => 100 - ((v - bottom) / (top - bottom)) * 96; // 4% headroom so the highest point isn't cut by the edge

  const pathFor = (values: (number | null)[]) => {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${(xPct(i) * 10).toFixed(2)} ${yPct(v).toFixed(2)} `;
      pen = true;
    });
    if (n === 1 && values[0] != null) d += `L${(xPct(0) * 10 + 0.01).toFixed(2)} ${yPct(values[0]).toFixed(2)}`;
    return d.trim();
  };

  const areaFor = (values: (number | null)[]) => {
    const pts = values.map((v, i) => (v === null ? null : { x: xPct(i) * 10, y: yPct(v) })).filter(Boolean) as { x: number; y: number }[];
    if (pts.length < 2) return '';
    const base = yPct(0).toFixed(2);
    return `M${pts[0]!.x} ${base} ${pts.map((p) => `L${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')} L${pts[pts.length - 1]!.x} ${base} Z`;
  };

  const indexAt = (e: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = r.width ? (e.clientX - r.left) / r.width : 0;
    return Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
  };
  const pick = (e: PointerEvent<HTMLDivElement>) => setActive(indexAt(e));
  const go = (i: number) => {
    const href = pointHrefs?.[i];
    if (href) startTransition(() => router.push(href, { scroll: false }));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = active ?? n - 1;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'ArrowRight') next = Math.min(n - 1, cur + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === 'Enter' && pointHrefs) {
      e.preventDefault();
      go(cur);
      return;
    } else if (e.key === 'Escape') {
      setActive(null);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    }
  };

  const describe = (i: number) =>
    [
      labels[i],
      ...series.map((s) => {
        const v = s.values[i];
        const own = s.pointLabels?.[i];
        return v == null ? null : `${s.name}${own ? ` (${own})` : ''}: ${inr(v)}`;
      }),
    ]
      .filter(Boolean)
      .join(', ');

  const isEmpty = all.every((v) => v === 0);
  const tipLeft = active !== null ? xPct(active) : 0;

  return (
    <figure className="chart">
      {series.length > 1 ? (
        <figcaption className="chart-legend">
          {series.map((s) => (
            <span key={s.name} className="legend-item">
              <svg width="22" height="10" aria-hidden="true">
                <line x1="1" y1="5" x2="21" y2="5" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '4 3' : undefined} strokeLinecap="round" />
              </svg>
              {s.name}
            </span>
          ))}
        </figcaption>
      ) : (
        <figcaption className="sr-only">{summary}</figcaption>
      )}

      <div className="chart-frame" style={{ height }}>
        <div className="chart-y" aria-hidden="true">
          {gridValues.map((v) => (
            <span key={v} style={{ top: `${yPct(v)}%` }}>
              {inrShort(v)}
            </span>
          ))}
        </div>
        <div
          className={`chart-plot${pointHrefs ? ' chart-clickable' : ''}${opening ? ' chart-opening' : ''}`}
          tabIndex={0}
          role="group"
          aria-label={`${summary} Use the left and right arrow keys to read each point${pointHrefs ? ', and Enter to open it' : ''}.`}
          aria-describedby={`${id}-live`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
          onClick={pointHrefs ? (e) => go(indexAt(e)) : undefined}
          onKeyDown={onKey}
          onFocus={() => setActive((a) => (a === null ? n - 1 : a))}
          onBlur={() => setActive(null)}
        >
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            {gridValues.map((v) => (
              <line key={v} x1="0" x2="1000" y1={yPct(v)} y2={yPct(v)} className={v === 0 ? 'grid-zero' : 'grid'} vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s) =>
              s.area ? <path key={`${s.name}-area`} d={areaFor(s.values)} fill={s.color} fillOpacity={0.1} stroke="none" /> : null,
            )}
            {[...series].reverse().map((s) => (
              <path
                key={s.name}
                d={pathFor(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? 1.75 : 2.25}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* The latest point of the main line, always marked. */}
          {series[0] && series[0].values[n - 1] != null && active === null ? (
            <span className="chart-dot" style={{ left: `${xPct(n - 1)}%`, top: `${yPct(series[0].values[n - 1]!)}%`, background: series[0].color }} />
          ) : null}

          {active !== null ? (
            <>
              <span className="chart-cross" style={{ left: `${tipLeft}%` }} aria-hidden="true" />
              {series.map((s) =>
                s.values[active] != null ? (
                  <span
                    key={s.name}
                    className="chart-dot"
                    style={{ left: `${tipLeft}%`, top: `${yPct(s.values[active]!)}%`, background: s.dashed ? '#fff' : s.color, borderColor: s.color }}
                  />
                ) : null,
              )}
              <div className={`chart-tip${tipLeft > 60 ? ' tip-left' : ''}`} style={{ left: `${tipLeft}%` }} aria-hidden="true">
                <div className="chart-tip-title">{labels[active]}</div>
                {series.map((s) => {
                  const v = s.values[active];
                  if (v == null) return null;
                  const own = s.pointLabels?.[active];
                  return (
                    <div key={s.name} className="chart-tip-row">
                      <span className="swatch" style={{ background: s.color }} />
                      <span className="chart-tip-name">
                        {s.name}
                        {own ? <em> · {own}</em> : null}
                      </span>
                      <strong>{inr(v)}</strong>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {isEmpty && emptyText ? <div className="chart-empty">{emptyText}</div> : null}
        </div>
      </div>

      <div className="chart-x" aria-hidden="true">
        {ticks.map((t) => {
          const left = xPct(t.index);
          const edge = left < 4 ? ' first' : left > 96 ? ' last' : '';
          return (
            <span key={t.index} className={`chart-tick${edge}`} style={{ left: `${left}%` }}>
              {t.text}
            </span>
          );
        })}
      </div>

      <p id={`${id}-live`} className="sr-only" aria-live="polite">
        {active !== null ? describe(active) : ''}
      </p>

      <details className="chart-table">
        <summary>Show these numbers as a table</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="th">When</th>
                {series.map((s) => (
                  <th key={s.name} className="th num">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i}>
                  <td className="td">{l}</td>
                  {series.map((s) => (
                    <td key={s.name} className="td num">
                      {s.values[i] == null ? '—' : inr(s.values[i]!)}
                      {s.pointLabels?.[i] ? <span className="muted small"> ({s.pointLabels[i]})</span> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
