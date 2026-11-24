'use client';

import * as React from 'react';
import { SettingsSection } from '@/components/settings/settings-section';
import { LanguageSelector } from '@/components/settings/language-selector';
import { Card, CardContent } from '@/components/ui/card';

export default function LanguageSettingsPage() {
  return (
    <SettingsSection
      title="Language"
      description="Choose the language you want to use for the nebron interface."
    >
      <Card>
        <CardContent className="p-6">
          <LanguageSelector />
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
