'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil, MessageSquareQuote } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { AppHeader } from '@/components/layout/app-header';
import { ProfileHeader } from '@/components/profile/profile-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <div>
        <AppHeader title="Profile" />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <div className="max-w-4xl mx-auto px-6 space-y-4">
            <Skeleton className="h-28 w-28 rounded-full -mt-16" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title="Profile"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/profile/edit">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        }
      />

      <ProfileHeader profile={profile} isOwnProfile={true} />

      <div className="max-w-4xl mx-auto px-6 py-6">
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About Me</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.about ? (
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                    {profile.about}
                  </p>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No bio or about section written yet.
                    </p>
                    <Button asChild variant="link" size="sm" className="mt-2">
                      <Link href="/profile/edit">Add details to your profile</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquareQuote className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                <h3 className="text-base font-semibold">Coming soon</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Posts and social activity will appear here in phase 7a.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

