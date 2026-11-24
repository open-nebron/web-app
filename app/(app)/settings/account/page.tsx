'use client';

import * as React from 'react';
import { SettingsSection } from '@/components/settings/settings-section';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, KeyRound, Mail, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';

export default function AccountSettingsPage() {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <SettingsSection
      title="Account"
      description="Manage your login credentials, password, and active session."
    >
      {/* Credentials Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>Email Address</span>
          </CardTitle>
          <CardDescription>
            Your registered email is used for account login and recovery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Input
              type="email"
              value={user?.email || 'Loading...'}
              readOnly
              disabled
              className="bg-muted cursor-not-allowed text-sm"
            />
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified with auth-service</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card (v2 Placeholder) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <span>Password & Security</span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
              <Sparkles className="w-3 h-3 text-primary" /> Coming in v2
            </Badge>
          </div>
          <CardDescription>
            Update your account password or review active sign-in sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-muted/20">
            <div>
              <p className="text-sm font-medium text-foreground">Account Password</p>
              <p className="text-xs text-muted-foreground">Self-service password change will be available in v2.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="opacity-60 cursor-not-allowed shrink-0 text-xs"
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>
            Terminate your session and sign out of this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
            <div>
              <h4 className="text-sm font-semibold text-destructive">
                Log Out of Nebron
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Terminates your current session and clears your secure authentication credentials.
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => logout()}
              loading={isLoggingOut}
              disabled={isLoggingOut}
              className="shrink-0 gap-2 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Danger Zone</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Delete Account</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete your nebron user account and all personal messages.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled
              className="opacity-60 cursor-not-allowed shrink-0 text-xs"
            >
              Delete Account
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Self-serve account deletion will be available in v2. To delete your account currently, please contact support.
          </p>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
