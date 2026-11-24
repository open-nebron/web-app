'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import { useTheme } from 'next-themes';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';

const RECENT_KEY = 'nebron:recent_emojis';
const DEFAULT_RECENTS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface EmojiItem {
  native?: string;
  id?: string;
  shortcodes?: string;
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  children?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

interface PickerComponentProps {
  data: unknown;
  onEmojiSelect: (emoji: EmojiItem) => void;
  theme?: string;
  previewPosition?: string;
  skinTonePosition?: string;
}

const DynamicPicker = dynamic<PickerComponentProps>(
  () => import('@emoji-mart/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-[352px] h-[435px] flex items-center justify-center text-muted-foreground text-sm">
        Loading emojis...
      </div>
    ),
  }
);

export function getRecentEmojis(): string[] {
  if (typeof window === 'undefined') return DEFAULT_RECENTS;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_RECENTS;
  } catch {
    return DEFAULT_RECENTS;
  }
}

export function saveRecentEmoji(emoji: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getRecentEmojis().filter((e) => e !== emoji);
    list.unshift(emoji);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    // Ignore storage errors
  }
}

export function EmojiPicker({
  onSelect,
  children,
  align = 'center',
  side = 'top',
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(DEFAULT_RECENTS);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setRecentEmojis(getRecentEmojis());
  }, [open]);

  const handleSelect = (emojiChar: string) => {
    saveRecentEmoji(emojiChar);
    onSelect(emojiChar);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
            aria-label="Add reaction"
          >
            <SmilePlus className="w-4 h-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-auto p-0 border-none shadow-xl bg-transparent"
      >
        <div className="bg-popover rounded-xl border overflow-hidden shadow-lg">
          {/* Quick reactions bar */}
          <div className="flex items-center gap-1 p-2 border-b bg-muted/40">
            {recentEmojis.slice(0, 6).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="hover:scale-125 hover:bg-muted p-1 rounded text-lg transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
          {/* Full emoji picker */}
          <DynamicPicker
            data={data}
            onEmojiSelect={(e: EmojiItem) => {
              const val = e.native || e.id || '';
              if (val) {
                handleSelect(val);
              }
            }}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
