'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProfile } from '@/hooks/use-profile';
import { SettingsSection } from '@/components/settings/settings-section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeStorageUrl } from '@/lib/utils';
import { Pencil, Calendar, AlertTriangle, ShieldAlert } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ProfileSettingsPage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <SettingsSection
        title="Profile"
        description="Manage your public profile details and information."
      >
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </SettingsSection>
    );
  }

  const userInitial = profile?.name
    ? profile.name[0].toUpperCase()
    : profile?.username
    ? profile.username[0].toUpperCase()
    : 'U';

  const avatarUrl = profile?.avatarUrl ? normalizeStorageUrl(profile.avatarUrl) : undefined;

  let dobFormatted: string | null = null;
  if (profile?.dateOfBirth) {
    try {
      dobFormatted = format(parseISO(profile.dateOfBirth), 'MMMM d, yyyy');
    } catch {
      dobFormatted = profile.dateOfBirth;
    }
  }

  let memberSince = 'Recently';
  if (profile?.createdAt) {
    try {
      memberSince = format(parseISO(profile.createdAt), 'MMMM yyyy');
    } catch {
      memberSince = 'Recently';
    }
  }

  return (
    <SettingsSection
      title="Profile"
      description="View your public profile details. To edit your avatar, cover, or bio, open the full profile editor."
      action={
        <Button asChild size="sm" className="gap-2">
          <Link href="/profile/edit">
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Link>
        </Button>
      }
    >
      {/* Profile Overview Card */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border shadow-xs">
              <AvatarImage src={avatarUrl} alt={profile?.name || 'Avatar'} />
              <AvatarFallback className="text-xl font-bold bg-muted">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold truncate text-foreground">
                {profile?.name || profile?.username}
              </h2>
              <p className="text-xs text-muted-foreground">@{profile?.username}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {memberSince}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-0.5">
                Full Name
              </span>
              <p className="text-foreground font-medium">
                {profile?.name || <span className="text-muted-foreground italic">Not set</span>}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-0.5">
                Username
              </span>
              <p className="text-foreground font-medium">@{profile?.username}</p>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground block mb-0.5">
                  Bio
                </span>
                <Link href="/profile/edit" className="text-xs text-primary hover:underline">
                  Edit
                </Link>
              </div>
              <p className="text-foreground/90 leading-relaxed text-xs sm:text-sm">
                {profile?.bio || (
                  <span className="text-muted-foreground italic">No bio provided.</span>
                )}
              </p>
            </div>

            {profile?.about && (
              <div className="sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground block mb-0.5">
                  About
                </span>
                <p className="text-foreground/90 leading-relaxed text-xs sm:text-sm whitespace-pre-line">
                  {profile.about}
                </p>
              </div>
            )}

            {dobFormatted && (
              <div>
                <span className="text-xs font-medium text-muted-foreground block mb-0.5">
                  Date of Birth
                </span>
                <p className="text-foreground font-medium">{dobFormatted}</p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button asChild variant="outline" className="w-full gap-2 text-xs">
              <Link href="/profile/edit">
                <Pencil className="w-3.5 h-3.5" />
                <span>Open Full Profile Editor</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone: Delete Account */}
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
