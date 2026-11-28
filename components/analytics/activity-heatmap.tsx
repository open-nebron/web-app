'use client';

import * as React from 'react';
import type { BestTimeHourEntry } from '@/lib/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

function cellFillOpacity(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio >= 0.75) return 0.95;
  if (ratio >= 0.5) return 0.72;
  if (ratio >= 0.25) return 0.45;
  return 0.22;
}

/**
 * Interactive 7 days x 24 hours SVG `<rect>` heatmap supporting click-to-inspect
 * hour/day detail for best-time-to-post and audience activity charts.
 */
export function ActivityHeatmap({
  matrix,
  unitLabel = 'activity',
  emptyMessage = 'No hourly activity recorded yet for this period.',
  hourDetails,
  onSelectHour,
}: {
  matrix?: number[][];
  unitLabel?: string;
  emptyMessage?: string;
  hourDetails?: BestTimeHourEntry[];
  onSelectHour?: (selection: { day: string; hour: number; count: number }) => void;
}) {
  const [selected, setSelected] = React.useState<{
    dayIdx: number;
    hour: number;
    count: number;
  } | null>(null);

  const safeMatrix = React.useMemo(() => {
    if (Array.isArray(matrix) && matrix.length === 7) {
      return matrix.map((row) =>
        Array.isArray(row) && row.length === 24 ? row : new Array(24).fill(0)
      );
    }
    return Array.from({ length: 7 }, () => new Array(24).fill(0));
  }, [matrix]);

  let maxVal = 0;
  let totalVal = 0;
  let peakDay = 0;
  let peakHour = 0;

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const val = safeMatrix[d][h] ?? 0;
      totalVal += val;
      if (val > maxVal) {
        maxVal = val;
        peakDay = d;
        peakHour = h;
      }
    }
  }

  const labelW = 36;
  const cellW = 24;
  const cellH = 20;
  const gap = 3;
  const headerH = 18;
  const svgWidth = labelW + 24 * (cellW + gap);
  const svgHeight = headerH + 7 * (cellH + gap) + 4;

  const selectedDetail =
    selected && hourDetails ? hourDetails.find((h) => h.hour === selected.hour) : undefined;

  return (
    <div className="space-y-3" data-testid="analytics-heatmap">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>All times in UTC (click any cell for detail)</span>
        {totalVal > 0 ? (
          <span className="font-medium text-foreground">
            Peak: {DAY_NAMES[peakDay]} at {String(peakHour).padStart(2, '0')}:00 UTC ({maxVal}{' '}
            {unitLabel})
          </span>
        ) : (
          <span>{emptyMessage}</span>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[580px] h-auto select-none"
          role="img"
          aria-label="7 by 24 hourly activity heatmap"
          data-testid="heatmap-svg"
        >
          {HOURS.map((h) =>
            h % 3 === 0 ? (
              <text
                key={`hdr-${h}`}
                x={labelW + h * (cellW + gap) + cellW / 2}
                y={12}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px] font-mono"
              >
                {String(h).padStart(2, '0')}
              </text>
            ) : null
          )}

          {DAY_NAMES.map((dayLabel, dIdx) => {
            const y = headerH + dIdx * (cellH + gap);
            return (
              <g key={dayLabel}>
                <text
                  x={2}
                  y={y + cellH / 2 + 3.5}
                  className="fill-muted-foreground text-[10px] font-medium"
                >
                  {dayLabel}
                </text>
                {HOURS.map((h) => {
                  const count = safeMatrix[dIdx][h] ?? 0;
                  const x = labelW + h * (cellW + gap);
                  const opacity = cellFillOpacity(count, maxVal);
                  const isSelected = selected?.dayIdx === dIdx && selected?.hour === h;
                  return (
                    <rect
                      key={`${dIdx}-${h}`}
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
                      rx={3}
                      data-testid={`heatmap-cell-${dIdx}-${h}`}
                      onClick={() => {
                        setSelected({ dayIdx: dIdx, hour: h, count });
                        onSelectHour?.({ day: dayLabel, hour: h, count });
                      }}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        fill: opacity > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                        fillOpacity: opacity > 0 ? opacity : 0.6,
                        stroke: isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                        strokeWidth: isSelected ? 1.5 : 0.5,
                      }}
                    >
                      <title>{`${dayLabel} ${String(h).padStart(2, '0')}:00 UTC - ${count} ${unitLabel}`}</title>
                    </rect>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {selected ? (
          <div
            data-testid="heatmap-selected-detail"
            className="rounded-md border bg-muted/40 px-2.5 py-1 text-foreground"
          >
            <span className="font-semibold">
              {DAY_NAMES[selected.dayIdx]} {String(selected.hour).padStart(2, '0')}:00 UTC:
            </span>{' '}
            <span>
              {selected.count} {unitLabel}
            </span>
            {selectedDetail && (
              <span className="text-muted-foreground">
                {' '}
                · Avg ER {(selectedDetail.engagementRate * 100).toFixed(1)}% · Sample{' '}
                {selectedDetail.sampleSize} ({selectedDetail.verdict})
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-[11px]">
            Select any hour block to inspect engagement detail.
          </span>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm bg-muted/60 border border-border/30" />
          <span className="w-3 h-3 rounded-sm bg-primary/20" />
          <span className="w-3 h-3 rounded-sm bg-primary/45" />
          <span className="w-3 h-3 rounded-sm bg-primary/75" />
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
