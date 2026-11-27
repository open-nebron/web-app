'use client';

import * as React from 'react';
import type { Post } from '@/lib/types';
import { ShareDialog } from './ShareDialog';

interface SharePostDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharePostDialog({ post, open, onOpenChange }: SharePostDialogProps) {
  return (
    <ShareDialog
      contentType="post"
      contentId={post?.id ?? ''}
      previewText={post?.body}
      post={post}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
