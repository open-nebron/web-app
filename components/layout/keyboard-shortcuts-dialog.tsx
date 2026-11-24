'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard, Command } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Navigation & Search',
    items: [
      { keys: ['⌘', 'K'], description: 'Quick search across conversations' },
      { keys: ['⌘', '?'], description: 'Open keyboard shortcuts dialog' },
      { keys: ['Esc'], description: 'Close dialog, menu, or search' },
    ],
  },
  {
    title: 'Messaging & Chat',
    items: [
      { keys: ['Enter'], description: 'Send message' },
      { keys: ['Shift', 'Enter'], description: 'Insert new line in composer' },
      { keys: ['↑'], description: 'Edit your last sent message (when composer is empty)' },
      { keys: ['Esc'], description: 'Cancel message edit or reply quote' },
    ],
  },
  {
    title: 'Voice & Video Calls',
    items: [
      { keys: ['M'], description: 'Toggle microphone mute' },
      { keys: ['V'], description: 'Toggle video camera' },
      { keys: ['D'], description: 'Leave or end active call' },
    ],
  },
];

export function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger on Cmd+? or Ctrl+? (Shift+/ on standard QWERTY)
      if ((e.metaKey || e.ctrlKey) && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Keyboard Shortcuts</DialogTitle>
              <DialogDescription className="text-xs">
                Quick actions to navigate Nebron at lightspeed.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.title} className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {category.title}
              </h4>
              <div className="space-y-1.5 rounded-lg border p-2.5 bg-muted/20">
                {category.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-1"
                  >
                    <span className="text-foreground">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted border rounded shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
