'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { ProfileEditForm } from '@/components/profile/profile-edit-form';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileEditPage() {
  const { data: profile, isLoading } = useProfile();

  return (
    <div>
      <AppHeader
        title="Edit Profile"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-6 py-6">
        {isLoading || !profile ? (
          <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <ProfileEditForm />
        )}
      </div>
    </div>
  );
}

