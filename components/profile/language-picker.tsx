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

export function LanguagePicker() {
  const { data: meta, isLoading: isMetaLoading } = useMeta();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await updateProfile.mutateAsync({ language: newLanguage });
      toast({
        title: 'Language updated',
        description: 'Your language preference has been saved.',
      });
    } catch {
      // Handled in updateProfile hook
    }
  };

  if (isMetaLoading || isProfileLoading) {
    return <Skeleton className="h-9 w-64" />;
  }

  const currentLanguage = profile?.language || meta?.defaultLanguage || 'en';

  return (
    <div className="w-full max-w-xs">
      <Select
        value={currentLanguage}
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
    </div>
  );
}

