'use client';

import * as React from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommentList } from '@/components/social/comment-list';
import { useCreateComment } from '@/hooks/useComments';

interface ReelCommentsProps {
  reelId: string;
  reelAuthorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReelComments({
  reelId,
  reelAuthorId,
  open,
  onOpenChange,
}: ReelCommentsProps) {
  const [body, setBody] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const addComment = useCreateComment(reelId, 'reel');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 300 || addComment.isPending) return;
    await addComment.mutateAsync({ body: trimmed });
    setBody('');
    inputRef.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="reel-comments-drawer"
        className="sm:max-w-md max-h-[82vh] flex flex-col p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[240px] max-h-[55vh]">
          {open && (
            <CommentList
              postId={reelId}
              postAuthorId={reelAuthorId}
              targetType="reel"
            />
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t flex items-center gap-2 bg-muted/20">
          <Input
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={300}
            placeholder="Add a comment..."
            data-testid="reel-comment-input"
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!body.trim() || addComment.isPending}
            data-testid="reel-comment-submit"
          >
            {addComment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
