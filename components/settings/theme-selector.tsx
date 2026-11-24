'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop, Sparkles, Check } from 'lucide-react';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { Badge } from '@/components/ui/badge';
import type { UserTheme } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme: UserTheme = (theme as UserTheme) || profile?.theme || 'system';

  const handleThemeChange = async (newTheme: UserTheme) => {
    setTheme(newTheme);
    try {
      await updateProfile.mutateAsync({ theme: newTheme });
      toast({
        title: 'Theme updated',
        description: `Theme preference saved as ${newTheme}.`,
      });
    } catch {
      // Revert if API fails
      if (profile?.theme) {
        setTheme(profile.theme);
      }
    }
  };

  const themeOptions: Array<{
    value: UserTheme;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    previewClass: string;
  }> = [
    {
      value: 'light',
      title: 'Light',
      description: 'Crisp light background with dark typography',
      icon: Sun,
      previewClass: 'bg-white text-zinc-900 border-zinc-200',
    },
    {
      value: 'dark',
      title: 'Dark',
      description: 'Eye-friendly deep dark tones for night viewing',
      icon: Moon,
      previewClass: 'bg-zinc-950 text-zinc-100 border-zinc-800',
    },
    {
      value: 'system',
      title: 'System',
      description: 'Automatically synchronizes with your device theme',
      icon: Laptop,
      previewClass: 'bg-gradient-to-r from-white to-zinc-900 text-zinc-800 border-zinc-300',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Cards */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Theme mode</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose how nebron looks to you. Select a single theme or sync with your system.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = mounted && currentTheme === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleThemeChange(opt.value)}
                disabled={!mounted || updateProfile.isPending}
                className={cn(
                  'flex flex-col text-left p-4 rounded-xl border transition-all relative overflow-hidden select-none',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40'
                )}
              >
                {/* Header with icon & check */}
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <h4 className="font-semibold text-sm text-foreground">{opt.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-normal">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* v2 Placeholder: Accent Color */}
      <div className="p-4 rounded-xl border bg-muted/20 opacity-70 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-foreground">Accent color</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalize primary button and highlight colors
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
            <Sparkles className="w-3 h-3 text-primary" /> Coming in v2
          </Badge>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          {['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316'].map((color) => (
            <div
              key={color}
              className="w-7 h-7 rounded-full border border-black/10 cursor-not-allowed opacity-50"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* v2 Placeholder: Font Size */}
      <div className="p-4 rounded-xl border bg-muted/20 opacity-70 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground">Font size scaling</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scale text size across conversation bubbles and message lists
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
          <Sparkles className="w-3 h-3 text-primary" /> Coming in v2
        </Badge>
      </div>
    </div>
  );
}
