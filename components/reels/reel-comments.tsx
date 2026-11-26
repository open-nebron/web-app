'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Send, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReelComments } from '@/hooks/useReels';
import { useProfile } from '@/hooks/use-profile';
import { normalizeStorageUrl } from '@/lib/utils';

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
  const { data: myProfile } = useProfile();
  const { comments, isLoading, addComment, deleteComment } = useReelComments(reelId, open);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 300 || addComment.isPending) return;
    await addComment.mutateAsync(trimmed);
    setBody('');
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

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-[220px] max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => {
              const canDelete =
                myProfile?.userId === comment.author.userId ||
                myProfile?.userId === reelAuthorId;

              return (
                <div
                  key={comment.id}
                  data-testid={`reel-comment-item-${comment.id}`}
                  className="flex items-start gap-2.5 group"
                >
                  <Link href={`/${comment.author.username}`}>
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarImage
                        src={
                          comment.author.avatarUrl
                            ? normalizeStorageUrl(comment.author.avatarUrl)
                            : undefined
                        }
                      />
                      <AvatarFallback>
                        {(comment.author.name || comment.author.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/${comment.author.username}`}
                        className="text-xs font-semibold hover:underline truncate"
                      >
                        @{comment.author.username}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words mt-0.5">{comment.body}</p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteComment.mutate(comment.id)}
                      disabled={deleteComment.isPending}
                      data-testid={`delete-reel-comment-${comment.id}`}
                      aria-label="Delete comment"
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t flex items-center gap-2 bg-muted/20">
          <Input
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
