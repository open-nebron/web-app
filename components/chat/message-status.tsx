'use client';

import React from 'react';
import { Check, CheckCheck, Loader2, AlertCircle } from 'lucide-react';
import type { MessageStatus } from '@/lib/chat-types';
import { cn } from '@/lib/utils';

interface MessageStatusProps {
  status?: MessageStatus;
  className?: string;
}

export function MessageStatusIcon({ status, className }: MessageStatusProps) {
  if (!status) return null;

  switch (status) {
    case 'sending':
      return (
        <Loader2
          className={cn('w-3.5 h-3.5 text-muted-foreground animate-spin inline-block', className)}
          aria-label="Sending"
        />
      );
    case 'sent':
      return (
        <Check
          className={cn('w-3.5 h-3.5 text-muted-foreground inline-block', className)}
          aria-label="Sent"
        />
      );
    case 'delivered':
      return (
        <CheckCheck
          className={cn('w-3.5 h-3.5 text-muted-foreground inline-block', className)}
          aria-label="Delivered"
        />
      );
    case 'read':
      return (
        <CheckCheck
          className={cn('w-3.5 h-3.5 text-sky-500 inline-block', className)}
          aria-label="Read"
        />
      );
    case 'failed':
      return (
        <AlertCircle
          className={cn('w-3.5 h-3.5 text-destructive inline-block', className)}
          aria-label="Failed to send"
        />
      );
    default:
      return null;
  }
}
