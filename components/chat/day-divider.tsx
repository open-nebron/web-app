'use client';

import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';

interface DayDividerProps {
  date: Date | string | number;
}

export function DayDivider({ date }: DayDividerProps) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  let label = '';
  if (isToday(d)) {
    label = 'Today';
  } else if (isYesterday(d)) {
    label = 'Yesterday';
  } else {
    label = format(d, 'MMMM d, yyyy');
  }

  return (
    <div className="relative my-4 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/60" />
      </div>
      <span className="relative z-10 bg-background px-3 py-0.5 text-[11px] font-medium tracking-wide uppercase text-muted-foreground rounded-full border border-border/50 shadow-sm">
        {label}
      </span>
    </div>
  );
}
