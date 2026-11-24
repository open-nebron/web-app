'use client';

import * as React from 'react';
import { SettingsSection } from '@/components/settings/settings-section';
import { ThemeSelector } from '@/components/settings/theme-selector';
import { Card, CardContent } from '@/components/ui/card';

export default function AppearanceSettingsPage() {
  return (
    <SettingsSection
      title="Appearance"
      description="Customize the visual theme and interface styling for your account."
    >
      <Card>
        <CardContent className="p-6">
          <ThemeSelector />
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
