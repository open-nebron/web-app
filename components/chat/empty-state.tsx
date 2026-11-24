'use client';

import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyChatStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyChatState({
  title = 'No conversation selected',
  description = 'Choose a conversation from the sidebar or start a new chat with someone.',
  actionLabel,
  onAction,
}: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-muted/10">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-sm">
        <MessageSquare className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5 gap-1.5" size="sm">
          <Plus className="w-4 h-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
