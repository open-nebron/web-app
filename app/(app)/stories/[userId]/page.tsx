'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldAlert, ImageOff } from 'lucide-react';
import { useUserStories } from '@/hooks/useStories';
import { StoryViewer } from '@/components/stories/story-viewer';
import { Button } from '@/components/ui/button';

export default function UserStoryPage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params?.userId === 'string' ? params.userId : '';

  const { data: storyGroup, isLoading, isError, error } = useUserStories(userId);

  const handleClose = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-white/70">Loading story...</p>
      </div>
    );
  }

  if (isError) {
    const errMsg = error instanceof Error ? error.message : 'Unable to load stories.';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Story unavailable</h2>
          <p className="text-sm text-muted-foreground max-w-sm">{errMsg}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  if (!storyGroup || storyGroup.stories.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
          <ImageOff className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">No active stories</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            @{storyGroup?.username || 'This user'} hasn&apos;t posted a story in the last 24 hours.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={storyGroup?.username ? `/${storyGroup.username}` : '/'}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <StoryViewer
      groups={[storyGroup]}
      initialGroupIndex={0}
      open={true}
      onClose={handleClose}
    />
  );
}
