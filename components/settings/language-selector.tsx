'use client';

import * as React from 'react';
import { useMeta } from '@/hooks/use-meta';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Info } from 'lucide-react';

export function LanguageSelector() {
  const { data: meta, isLoading: isMetaLoading } = useMeta();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await updateProfile.mutateAsync({ language: newLanguage });
      const langName = meta?.languages.find((l) => l.code === newLanguage)?.name || newLanguage;
      toast({
        title: 'Language preference saved',
        description: `Your app will use ${langName} after next refresh.`,
      });
    } catch {
      // Error handled in updateProfile hook
    }
  };

  if (isMetaLoading || isProfileLoading) {
    return <Skeleton className="h-10 w-full max-w-sm" />;
  }

  const currentLanguageCode = profile?.language || meta?.defaultLanguage || 'en';
  const selectedLanguage = meta?.languages.find((l) => l.code === currentLanguageCode);
  const selectedName = selectedLanguage?.name || 'English';

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-md">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span>Interface language</span>
        </label>
        <Select
          value={currentLanguageCode}
          onValueChange={handleLanguageChange}
          disabled={updateProfile.isPending}
        >
          <SelectTrigger aria-label="Select language" className="w-full">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {meta?.languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name} ({lang.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground">
          Your app will use <span className="font-medium text-foreground">{selectedName}</span> after next refresh.
        </p>
      </div>

      {/* Info note */}
      <div className="p-3.5 rounded-xl border bg-muted/30 flex items-start gap-2.5 max-w-md text-xs text-muted-foreground leading-relaxed">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          Language preference is stored in your nebron account. Community-contributed localization across all application strings will activate in v2.
        </p>
      </div>
    </div>
  );
}
