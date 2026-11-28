'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BarChart3, Film, FileText, Hash, Radio, Users } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnalyticsPeriod } from '@/lib/types';

export const ANALYTICS_PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

const NAV_ITEMS = [
  { href: '/analytics', label: 'Overview', icon: BarChart3, exact: true },
  { href: '/analytics/posts', label: 'Posts', icon: FileText },
  { href: '/analytics/reels', label: 'Reels', icon: Film },
  { href: '/analytics/stories', label: 'Stories', icon: Radio },
  { href: '/analytics/hashtags', label: 'Hashtags', icon: Hash },
  { href: '/analytics/audience', label: 'Audience', icon: Users },
];

export function AnalyticsPeriodSelector({
  period,
  onChange,
}: {
  period: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg border bg-card p-1 shadow-sm"
      role="group"
      aria-label="Analytics period selector"
      data-testid="analytics-period-selector"
    >
      {ANALYTICS_PERIOD_OPTIONS.map((opt) => {
        const active = period === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-testid={`period-btn-${opt.value}`}
            aria-pressed={active}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function AnalyticsHeader({
  title,
  subtitle,
  period,
  onPeriodChange,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  period: AnalyticsPeriod;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  backHref?: string;
  backLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <AppHeader title={title} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{backLabel || 'Back'}</span>
              </Link>
            )}
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : (
              <span className="sr-only">{title}</span>
            )}
          </div>

          <div className="shrink-0">
            <AnalyticsPeriodSelector period={period} onChange={onPeriodChange} />
          </div>
        </div>

        <nav
          aria-label="Creator Studio sections"
          className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Button
                key={item.href}
                asChild
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-1.5 shrink-0',
                  active && 'font-semibold text-foreground bg-accent'
                )}
              >
                <Link href={item.href}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AnalyticsStatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  testId,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border bg-card p-4 shadow-sm space-y-2"
    >
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <Icon className="w-4 h-4 text-primary/80" />
      </div>
      <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

export function formatShortDate(dateKey: string): string {
  if (!dateKey || dateKey.length < 10) return dateKey;
  return dateKey.slice(5); // MM-DD
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}
