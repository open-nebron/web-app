export type SortDirection = 'asc' | 'desc';

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
