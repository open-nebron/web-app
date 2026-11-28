'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { sortRowsByKey, type SortDirection } from '@/lib/analytics-utils';

export { sortRowsByKey, type SortDirection };

export const CHART_PALETTE = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#3b82f6', // blue
];

export interface LineSeriesDef {
  dataKey: string;
  name: string;
  color: string;
  stackId?: string;
}

export function AnalyticsLineChart({
  data,
  xKey,
  series,
  height = 260,
  testId,
}: {
  data: Array<Record<string, any>>;
  xKey: string;
  series: LineSeriesDef[];
  height?: number;
  testId?: string;
}) {
  return (
    <div style={{ width: '100%', height }} data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: '12px',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={data.length <= 14}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsBarChart({
  data,
  xKey,
  bars,
  height = 260,
  testId,
}: {
  data: Array<Record<string, any>>;
  xKey: string;
  bars: LineSeriesDef[];
  height?: number;
  testId?: string;
}) {
  return (
    <div style={{ width: '100%', height }} data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: '12px',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          {bars.length > 1 && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {bars.map((b) => (
            <Bar
              key={b.dataKey}
              dataKey={b.dataKey}
              name={b.name}
              fill={b.color}
              stackId={b.stackId}
              radius={b.stackId ? undefined : [4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrafficSourcesPieChart({
  data,
  height = 260,
  emptyText = 'No traffic source impressions recorded in this period.',
  testId,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
  emptyText?: string;
  testId?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground text-center px-4"
        style={{ height }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }} data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={84}
            paddingAngle={3}
          >
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: '12px',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SortableColumnHeader<K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: K;
  activeKey: K;
  direction: SortDirection;
  onSort: (key: K) => void;
  align?: 'left' | 'right';
}) {
  const isActive = activeKey === sortKey;
  return (
    <th className={`px-3 py-2.5 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-primary" />
          ) : (
            <ArrowDown className="w-3 h-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  );
}
