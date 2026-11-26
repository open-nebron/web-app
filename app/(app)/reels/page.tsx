'use client';

import * as React from 'react';
import { Plus, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReelsFeed } from '@/components/reels/reels-feed';
import { ReelUploader } from '@/components/reels/reel-uploader';

export default function ReelsPage() {
  const [uploaderOpen, setUploaderOpen] = React.useState(false);

  return (
    <div className="relative h-full w-full bg-zinc-950 text-white overflow-hidden">
      {/* Top floating header */}
      <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 pointer-events-auto">
          <Film className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Reels</span>
        </div>

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

      <ReelsFeed onOpenUploader={() => setUploaderOpen(true)} />

      <ReelUploader open={uploaderOpen} onOpenChange={setUploaderOpen} />
    </div>
  );
}
