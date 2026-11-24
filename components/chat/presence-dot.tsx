'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PresenceDotProps {
  status?: 'online' | 'offline';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PresenceDot({ status = 'offline', className, size = 'md' }: PresenceDotProps) {
  const isOnline = status === 'online';

  const sizeClasses = {
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
  };

  return (
    <span
      className={cn(
        'rounded-full ring-background inline-block shrink-0',
        sizeClasses[size],
        isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40',
        className
      )}
      title={isOnline ? 'Online' : 'Offline'}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  );
}
