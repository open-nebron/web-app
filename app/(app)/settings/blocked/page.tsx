'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SettingsSection } from '@/components/settings/settings-section';
import { BlockedUserRow } from '@/components/settings/blocked-user-row';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { chatApi } from '@/lib/chat-api';
import { UserCheck, ShieldAlert, Loader2 } from 'lucide-react';

export default function BlockedUsersSettingsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => chatApi.getBlockedUsers(),
  });

  const blockedList = data?.blocked || [];

  return (
    <SettingsSection
      title="Blocked Users"
      description="Users in your blocked list cannot send you direct messages or initiate voice calls with you."
    >
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-sm font-medium text-destructive">
            Could not load blocked users.
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs text-primary underline hover:opacity-80"
          >
            Retry
          </button>
        </Card>
      )}

      {!isLoading && !isError && blockedList.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-14 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <UserCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground">
                You haven&apos;t blocked anyone
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When you block contacts from their conversation header or profile, they will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && blockedList.length > 0 && (
        <div className="space-y-2.5">
          {blockedList.map((blockedUser) => (
            <BlockedUserRow key={blockedUser.userId} user={blockedUser} />
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
