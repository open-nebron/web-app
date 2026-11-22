'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { UserX, ArrowLeft } from 'lucide-react';
import { usePublicProfile } from '@/hooks/use-profile';
import { AppHeader } from '@/components/layout/app-header';
import { ProfileHeader } from '@/components/profile/profile-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicProfilePage() {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';

  // TODO: GET /users/:username will be fully wired in core-backend in phase 7a
  const { data: profile, isLoading, isError } = usePublicProfile(username);

  if (isLoading) {
    return (
      <div>
        <AppHeader title={`@${username}`} />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <div className="max-w-4xl mx-auto px-6 space-y-4">
            <Skeleton className="h-28 w-28 rounded-full -mt-16" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div>
        <AppHeader title="Profile Not Found" />
        <div className="max-w-md mx-auto py-24 px-6 text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <UserX className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Profile not found</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            The user @{username} doesn&apos;t exist or public profiles are not yet enabled.
          </p>
          <Button asChild variant="outline">
            <Link href="/profile">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to your profile
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title={`@${profile.username}`} />
      <ProfileHeader profile={profile} isOwnProfile={false} />

      <div className="max-w-4xl mx-auto px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.about ? (
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {profile.about}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No bio or about section provided.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

