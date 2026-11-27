'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

function intensityClass(value: number, max: number): string {
  if (value <= 0 || max <= 0) return 'bg-muted/60 hover:bg-muted';
  const ratio = value / max;
  if (ratio >= 0.75) return 'bg-primary text-primary-foreground';
  if (ratio >= 0.5) return 'bg-primary/75';
  if (ratio >= 0.25) return 'bg-primary/45';
  return 'bg-primary/20';
}

/**
 * Displays a 7 days x 24 hours UTC activity heatmap for posting and audience insights.
 */
export function ActivityHeatmap({
  matrix,
  unitLabel = 'activity',
  emptyMessage = 'No hourly activity recorded yet for this period.',
}: {
  matrix?: number[][];
  unitLabel?: string;
  emptyMessage?: string;
}) {
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

  return (
    <div className="space-y-3" data-testid="analytics-heatmap">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>All times in UTC</span>
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
        <div className="min-w-[600px] space-y-1">
          <div className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-1 text-[10px] text-muted-foreground">
            <div />
            {HOURS.map((h) => (
              <div key={h} className="text-center font-mono">
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </div>
            ))}
          </div>

          {DAY_NAMES.map((dayLabel, dIdx) => (
            <div
              key={dayLabel}
              className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-1 items-center"
            >
              <span className="text-[11px] font-medium text-muted-foreground">{dayLabel}</span>
              {HOURS.map((h) => {
                const count = safeMatrix[dIdx][h] ?? 0;
                return (
                  <div
                    key={h}
                    title={`${dayLabel} ${String(h).padStart(2, '0')}:00 UTC — ${count} ${unitLabel}`}
                    className={cn(
                      'h-5 rounded-sm transition-colors border border-border/20',
                      intensityClass(count, maxVal)
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <span>Less</span>
        <span className="w-3 h-3 rounded-sm bg-muted/60 border border-border/30" />
        <span className="w-3 h-3 rounded-sm bg-primary/20" />
        <span className="w-3 h-3 rounded-sm bg-primary/45" />
        <span className="w-3 h-3 rounded-sm bg-primary/75" />
        <span className="w-3 h-3 rounded-sm bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}
