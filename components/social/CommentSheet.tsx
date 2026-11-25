'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CommentList } from './CommentList';
import { CommentComposer } from './CommentComposer';
import type { Post } from '@/lib/types';

interface CommentSheetProps {
  post: Post;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentSheet({ post, isOpen, onOpenChange }: CommentSheetProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-base font-semibold">Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 max-h-[50vh]">
          <div className="text-xs text-muted-foreground border-b pb-2">
            Replying to <span className="text-foreground font-medium">@{post.author.username}</span>
            <p className="mt-1 text-foreground/80 line-clamp-2 italic">
              &quot;{post.body}&quot;
            </p>
          </div>

          <CommentList
            postId={post.id}
            postAuthorId={post.author.userId}
            initialComments={post.comments}
          />
        </div>

        <div className="p-4 border-t bg-card/50">
          <CommentComposer postId={post.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
