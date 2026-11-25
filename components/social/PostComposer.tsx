'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/use-profile';
import { useCreatePost } from '@/hooks/usePosts';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import { Loader2, Send } from 'lucide-react';

interface PostComposerProps {
  placeholder?: string;
  className?: string;
  onSuccess?: () => void;
}

export function PostComposer({
  placeholder = "What's on your mind?",
  className,
  onSuccess,
}: PostComposerProps) {
  const { data: profile } = useProfile();
  const [body, setBody] = useState('');
  const createPostMutation = useCreatePost();

  const maxChars = 500;
  const remainingChars = maxChars - body.length;
  const isOverLimit = remainingChars < 0;
  const isEmpty = body.trim().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || isOverLimit || createPostMutation.isPending) return;

    createPostMutation.mutate(body.trim(), {
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
    <div className={cn('p-4 border rounded-xl bg-card shadow-sm', className)}>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage
              src={profile?.avatarUrl ? normalizeStorageUrl(profile.avatarUrl) : undefined}
              alt={profile?.username || 'User'}
            />
            <AvatarFallback>{authorInitials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="resize-none border-none focus-visible:ring-0 p-0 text-base shadow-none bg-transparent placeholder:text-muted-foreground"
            />

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span
                className={cn(
                  'text-xs font-medium',
                  isOverLimit
                    ? 'text-destructive font-bold'
                    : remainingChars <= 50
                    ? 'text-amber-500'
                    : 'text-muted-foreground'
                )}
              >
                {body.length} / {maxChars}
              </span>

              <Button
                type="submit"
                disabled={isEmpty || isOverLimit || createPostMutation.isPending}
                size="sm"
                className="gap-1.5"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
