'use client';

import React from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NewMessageButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export function NewMessageButton({ onClick, unreadCount = 0 }: NewMessageButtonProps) {
  return (
    <div className="absolute bottom-20 right-6 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="rounded-full shadow-lg border border-border/80 flex items-center gap-1.5 px-3 py-1.5 hover:shadow-xl transition-all"
      >
        <ArrowDown className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium">Latest messages</span>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px] h-4 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
