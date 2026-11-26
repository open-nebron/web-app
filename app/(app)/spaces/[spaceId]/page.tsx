'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Settings, AlertCircle } from 'lucide-react';
import { useSpaceDetail } from '@/hooks/useSpaces';
import { Button } from '@/components/ui/button';

export default function SpaceIndexPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params?.spaceId as string;
  const { data: detail, isLoading, isError, error } = useSpaceDetail(spaceId);

  useEffect(() => {
    if (!detail) return;
    const firstText = detail.channels.find((c) => c.kind === 'text');
    const target = firstText || detail.channels[0];
    if (target) {
      router.replace(`/spaces/${spaceId}/channels/${target.id}`);
    }
  }, [detail, spaceId, router]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-muted-foreground gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading space...
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <h2 className="text-lg font-semibold">Cannot open space</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error instanceof Error ? error.message : 'Space not found or you are not a member.'}
        </p>
        <Button asChild variant="outline">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center space-y-3">
      <h2 className="text-xl font-bold">{detail.space.name}</h2>
      <p className="text-sm text-muted-foreground">
        No visible channels found yet in this space.
      </p>
      <Button asChild variant="outline">
        <Link href={`/spaces/${spaceId}/settings`}>
          <Settings className="w-4 h-4 mr-2" /> Open Space Settings
        </Link>
      </Button>
    </div>
  );
}
