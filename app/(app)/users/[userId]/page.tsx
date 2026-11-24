'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { UserX, ArrowLeft, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserByIdPage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params?.userId === 'string' ? params.userId : '';

  const { data: user, isLoading, isError } = useUser(userId);

  React.useEffect(() => {
    if (user?.username) {
      router.replace(`/${user.username}`);
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div>
        <AppHeader title="User Profile" />
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div>
        <AppHeader title="User Not Found" />
        <div className="max-w-md mx-auto py-24 px-6 text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <UserX className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">User not found</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            The requested user ID could not be found.
          </p>
          <Button asChild variant="outline">
            <Link href="/chat">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to chat
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title={user.name || user.username} />
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
