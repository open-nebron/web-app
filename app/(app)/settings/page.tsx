'use client';

import * as React from 'react';
import { LogOut } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { ThemePicker } from '@/components/profile/theme-picker';
import { LanguagePicker } from '@/components/profile/language-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

export default function SettingsPage() {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <div>
      <AppHeader title="Settings" />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the Nebron interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">Theme Preference</p>
              <ThemePicker />
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Language & Region</CardTitle>
            <CardDescription>
              Select your preferred display and content language
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">Preferred Language</p>
              <LanguagePicker />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Manage your personal credentials and session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 max-w-sm">
              <label className="text-sm font-medium leading-none">
                Registered Email
              </label>
              <Input
                type="email"
                value={user?.email || 'Loading...'}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Your email is verified with auth-service.
              </p>
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Sign Out of Nebron
                </p>
                <p className="text-xs text-muted-foreground">
                  Terminates your active session and clears the secure authentication cookie.
                </p>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => logout()}
                loading={isLoggingOut}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

