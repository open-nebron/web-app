export type SortDirection = 'asc' | 'desc';

export const FOLLOW_SOURCE_SERIES = [
  { dataKey: 'profile', name: 'Profile', color: '#6366f1', stackId: 'sources' },
  { dataKey: 'feed', name: 'Feed', color: '#14b8a6', stackId: 'sources' },
  { dataKey: 'reel', name: 'Reel', color: '#ec4899', stackId: 'sources' },
  { dataKey: 'search', name: 'Search', color: '#f59e0b', stackId: 'sources' },
  { dataKey: 'suggestion', name: 'Suggestion', color: '#8b5cf6', stackId: 'sources' },
  { dataKey: 'other', name: 'Other', color: '#64748b', stackId: 'sources' },
];

/**
 * Pivots sparse `{ date, source, count }` trend records onto sorted dates for Recharts stacked bars.
 */
export function buildStackedFollowSourceSeries(
  dates: string[],
  trend: Array<{ date: string; source: string; count: number }>
): Array<Record<string, string | number>> {
  const byDate = new Map<string, Record<string, string | number>>();
  for (const date of dates) {
    byDate.set(date, {
      date,
      label: date.slice(5),
      profile: 0,
      feed: 0,
      reel: 0,
      search: 0,
      suggestion: 0,
      other: 0,
    });
  }
  for (const pt of trend) {
    let row = byDate.get(pt.date);
    if (!row) {
      row = {
        date: pt.date,
        label: pt.date.slice(5),
        profile: 0,
        feed: 0,
        reel: 0,
        search: 0,
        suggestion: 0,
        other: 0,
      };
      byDate.set(pt.date, row);
    }
    const key = pt.source in row ? pt.source : 'other';
    row[key] = (Number(row[key]) || 0) + pt.count;
  }
  return Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
}

/**
 * Sorts analytics table rows by a given key in ascending or descending order.
 */
export function sortRowsByKey<T>(
  rows: T[],
  key: keyof T,
  direction: SortDirection
): T[] {
  return [...rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === 'number' && typeof vb === 'number') {
      return direction === 'asc' ? va - vb : vb - va;
    }
    const sa = String(va ?? '');
    const sb = String(vb ?? '');
    return direction === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}
