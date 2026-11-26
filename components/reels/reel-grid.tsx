'use client';

import * as React from 'react';
import Link from 'next/link';
import { Film, Play, Eye, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserReels } from '@/hooks/useReels';
import { normalizeStorageUrl } from '@/lib/utils';
import { ReelUploader } from './reel-uploader';

interface ReelGridProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function ReelGrid({ userId, isOwnProfile = false }: ReelGridProps) {
  const [uploaderOpen, setUploaderOpen] = React.useState(false);
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useUserReels(userId);

  const reels = React.useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isOwnProfile && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setUploaderOpen(true)}
            data-testid="profile-upload-reel-btn"
            className="gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Upload Reel
          </Button>
        </div>
      )}

      {reels.length === 0 ? (
        <div
          data-testid="reel-grid-empty"
          className="text-center py-12 border rounded-lg bg-muted/20 space-y-2"
        >
          <Film className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">No reels yet</p>
          <p className="text-xs text-muted-foreground">
            {isOwnProfile
              ? 'Upload your first MP4 reel (5-60s) to share it here.'
              : 'No reels shared yet.'}
          </p>
        </div>
      ) : (
        <div data-testid="reel-grid" className="grid grid-cols-3 gap-2 sm:gap-3">
          {reels.map((reel) => (
            <Link
              key={reel.id}
              href={`/reels/${reel.id}`}
              data-testid={`reel-grid-item-${reel.id}`}
              className="group relative aspect-[9/16] rounded-lg overflow-hidden bg-black border border-border/50 hover:opacity-95 transition-opacity"
            >
              {reel.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={normalizeStorageUrl(reel.thumbnailUrl)}
                  alt={reel.caption || 'Reel thumbnail'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={normalizeStorageUrl(reel.videoUrl)}
                  preload="metadata"
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-90" />

              <div className="absolute top-2 right-2 p-1 rounded-full bg-black/55 text-white">
                <Play className="w-3.5 h-3.5 fill-white" />
              </div>

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white font-medium">
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {reel.viewCount}
                </span>
                <span>{Math.round(reel.duration)}s</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Load more reels
          </Button>
        </div>
      )}

      {isOwnProfile && (
        <ReelUploader open={uploaderOpen} onOpenChange={setUploaderOpen} />
      )}
    </div>
  );
}
