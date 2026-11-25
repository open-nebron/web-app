'use client';

import * as React from 'react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/use-profile';
import { useCreateComment } from '@/hooks/useComments';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import { Loader2, Send } from 'lucide-react';

interface CommentComposerProps {
  postId: string;
  placeholder?: string;
  className?: string;
  onSuccess?: () => void;
}

export function CommentComposer({
  postId,
  placeholder = 'Write a comment...',
  className,
  onSuccess,
}: CommentComposerProps) {
  const { data: profile } = useProfile();
  const [body, setBody] = useState('');
  const createCommentMutation = useCreateComment(postId);

  const maxChars = 300;
  const remainingChars = maxChars - body.length;
  const isOverLimit = remainingChars < 0;
  const isEmpty = body.trim().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || isOverLimit || createCommentMutation.isPending) return;

    createCommentMutation.mutate(body.trim(), {
      onSuccess: () => {
        setBody('');
        if (onSuccess) onSuccess();
      },
    });
  };

  const authorInitials = (profile?.name || profile?.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2.5 items-start', className)}>
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarImage
          src={profile?.avatarUrl ? normalizeStorageUrl(profile.avatarUrl) : undefined}
          alt={profile?.username || 'User'}
        />
        <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1.5">
        <div className="relative border rounded-lg bg-background/50 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="resize-none border-none focus-visible:ring-0 p-2.5 text-sm shadow-none bg-transparent placeholder:text-muted-foreground w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center justify-between px-2.5 pb-2 pt-1 border-t border-border/40">
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

            <Button
              type="submit"
              disabled={isEmpty || isOverLimit || createCommentMutation.isPending}
              size="sm"
              className="h-7 px-3 text-xs gap-1"
            >
              {createCommentMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Reply</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
