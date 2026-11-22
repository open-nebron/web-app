'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import type { UserTheme } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled className="w-28">
          <Sun className="mr-2 h-4 w-4" /> Light
        </Button>
        <Button variant="outline" size="sm" disabled className="w-28">
          <Moon className="mr-2 h-4 w-4" /> Dark
        </Button>
        <Button variant="outline" size="sm" disabled className="w-28">
          <Laptop className="mr-2 h-4 w-4" /> System
        </Button>
      </div>
    );
  }

  const currentTheme = theme || profile?.theme || 'system';

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={currentTheme === 'light' ? 'default' : 'outline'}
        size="sm"
        className="w-28"
        onClick={() => handleThemeChange('light')}
        disabled={updateProfile.isPending}
      >
        <Sun className="mr-2 h-4 w-4" />
        Light
      </Button>

      <Button
        type="button"
        variant={currentTheme === 'dark' ? 'default' : 'outline'}
        size="sm"
        className="w-28"
        onClick={() => handleThemeChange('dark')}
        disabled={updateProfile.isPending}
      >
        <Moon className="mr-2 h-4 w-4" />
        Dark
      </Button>

      <Button
        type="button"
        variant={currentTheme === 'system' ? 'default' : 'outline'}
        size="sm"
        className="w-28"
        onClick={() => handleThemeChange('system')}
        disabled={updateProfile.isPending}
      >
        <Laptop className="mr-2 h-4 w-4" />
        System
      </Button>
    </div>
  );
}

