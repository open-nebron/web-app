'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/use-profile';
import { useCreateComment, type CommentTargetType } from '@/hooks/useComments';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import type { Comment } from '@/lib/types';
import { Loader2, Send, X } from 'lucide-react';

export interface ReplyComposerProps {
  targetId: string;
  targetType?: CommentTargetType;
  parentCommentId: string;
  replyToUsername?: string;
  placeholder?: string;
  className?: string;
  onCancel?: () => void;
  onSuccess?: (created: Comment) => void;
}

export function ReplyComposer({
  targetId,
  targetType = 'post',
  parentCommentId,
  replyToUsername,
  placeholder,
  className,
  onCancel,
  onSuccess,
}: ReplyComposerProps) {
  const { data: profile } = useProfile();
  const [body, setBody] = React.useState('');
  const createCommentMutation = useCreateComment(targetId, targetType);

  const maxChars = 300;
  const remainingChars = maxChars - body.length;
  const isOverLimit = remainingChars < 0;
  const isEmpty = body.trim().length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEmpty || isOverLimit || createCommentMutation.isPending) return;

    createCommentMutation.mutate(
      { body: body.trim(), parentCommentId },
      {
        onSuccess: (created) => {
          setBody('');
          onSuccess?.(created);
        },
      }
    );
  };

  const authorInitials = (profile?.name || profile?.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      data-testid={`reply-composer-${parentCommentId}`}
      className={cn('flex gap-2 items-start pt-2', className)}
    >
      <Avatar className="w-6 h-6 shrink-0 mt-1">
        <AvatarImage
          src={profile?.avatarUrl ? normalizeStorageUrl(profile.avatarUrl) : undefined}
          alt={profile?.username || 'User'}
        />
        <AvatarFallback className="text-[10px]">{authorInitials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        {replyToUsername && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Replying to <span className="font-medium text-foreground">@{replyToUsername}</span>
            </span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                aria-label="Cancel reply"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>
        )}

        <div className="relative border rounded-lg bg-background/60 focus-within:ring-1 focus-within:ring-ring">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder || (replyToUsername ? `Reply to @${replyToUsername}...` : 'Write a reply...')}
            rows={1}
            autoFocus
            data-testid={`reply-input-${parentCommentId}`}
            className="resize-none border-none focus-visible:ring-0 p-2 text-xs shadow-none bg-transparent placeholder:text-muted-foreground w-full min-h-[36px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(e);
              } else if (e.key === 'Escape' && onCancel) {
                e.preventDefault();
                onCancel();
              }
            }}
          />

          <div className="flex items-center justify-between px-2 pb-1.5 pt-1 border-t border-border/40">
            <span
              className={cn(
                'text-[10px] font-medium',
                isOverLimit
                  ? 'text-destructive font-bold'
                  : remainingChars <= 30
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
              )}
            >
              {body.length} / {maxChars}
            </span>

            <div className="flex items-center gap-1.5">
              {onCancel && !replyToUsername && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-6 px-2 text-[11px]"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isEmpty || isOverLimit || createCommentMutation.isPending}
                size="sm"
                data-testid={`reply-submit-${parentCommentId}`}
                className="h-6 px-2.5 text-[11px] gap-1"
              >
                {createCommentMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Send className="w-2.5 h-2.5" />
                    <span>Reply</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
