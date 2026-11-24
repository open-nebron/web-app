'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  backHref?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function SettingsSection({
  title,
  description,
  backHref = '/settings',
  children,
  className,
  action,
}: SettingsSectionProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Section Header */}
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Back button on mobile */}
            {backHref && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="md:hidden -ml-2 h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              >
                <Link href={backHref} aria-label="Back to Settings">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Section Content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
