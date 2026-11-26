'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Film, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReel } from '@/hooks/useReels';
import { ReelsFeed } from '@/components/reels/reels-feed';
import { ReelUploader } from '@/components/reels/reel-uploader';

export default function ReelDetailPage() {
  const params = useParams();
  const reelId = typeof params?.id === 'string' ? params.id : '';
  const { data: reel, isLoading, isError } = useReel(reelId);
  const [uploaderOpen, setUploaderOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isError || !reel) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-white gap-4 px-6 text-center">
        <Film className="w-10 h-10 text-muted-foreground" />
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Reel unavailable</h1>
          <p className="text-sm text-zinc-400">
            This reel may have been deleted or you do not have permission to view it.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/reels">Back to Reels</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-zinc-950 text-white overflow-hidden">
      <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="pointer-events-auto rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/10 backdrop-blur-sm"
        >
          <Link href="/reels" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            All Reels
          </Link>
        </Button>

        <Button
          size="sm"
          onClick={() => setUploaderOpen(true)}
          data-testid="upload-reel-btn"
          className="pointer-events-auto rounded-full shadow-lg gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Upload Reel
        </Button>
      </div>

      <ReelsFeed initialReel={reel} onOpenUploader={() => setUploaderOpen(true)} />

      <ReelUploader open={uploaderOpen} onOpenChange={setUploaderOpen} />
    </div>
  );
}
