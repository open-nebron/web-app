'use client';

import React from 'react';
import type { ReactionSummary } from '@/lib/chat-types';
import { useAuthStore } from '@/lib/auth-store';
import { useUser } from '@/hooks/use-user';
import { chatApi } from '@/lib/chat-api';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmojiPicker } from './emoji-picker';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface MessageReactionsProps {
  conversationId: string;
  messageId: string;
  reactions?: ReactionSummary[];
  disabled?: boolean;
}

function ReactionUserRow({ userId }: { userId: string }) {
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const { data: user } = useUser(userId);
  const isSelf = currentUserId === userId;
  const name = isSelf ? 'You' : user?.name || user?.username || 'User';

  return (
    <div className="flex items-center gap-2 py-0.5">
      <Avatar className="w-4 h-4 shrink-0">
        <AvatarImage src={user?.avatarUrl || undefined} />
        <AvatarFallback className="text-[8px] font-semibold">
          {(name[0] || 'U').toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs text-foreground truncate max-w-[130px]">{name}</span>
    </div>
  );
}

export function MessageReactions({
  conversationId,
  messageId,
  reactions = [],
  disabled = false,
}: MessageReactionsProps) {
  const currentUserId = useAuthStore((s) => s.user?.userId);

  if (!reactions || reactions.length === 0) {
    return null;
  }

  const handleToggle = async (emoji: string, hasReacted: boolean) => {
    if (disabled || !conversationId || !messageId) return;

    try {
      if (hasReacted) {
        await chatApi.removeReaction(conversationId, messageId, emoji);
      } else {
        await chatApi.addReaction(conversationId, messageId, emoji);
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update reaction',
        description: err instanceof Error ? err.message : 'Action failed',
      });
    }
  };

  const handleAddReaction = async (emoji: string) => {
    if (disabled || !conversationId || !messageId) return;
    try {
      await chatApi.addReaction(conversationId, messageId, emoji);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not add reaction',
        description: err instanceof Error ? err.message : 'Action failed',
      });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-1 mt-1 select-none">
        {reactions.map((r) => {
          const hasReacted = Boolean(currentUserId && r.userIds.includes(currentUserId));
          const maxVisibleUsers = 5;
          const visibleUserIds = r.userIds.slice(0, maxVisibleUsers);
          const overflowCount = r.count - visibleUserIds.length;

          return (
            <Tooltip key={r.emoji}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleToggle(r.emoji, hasReacted)}
                  disabled={disabled}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
                    hasReacted
                      ? 'bg-primary/15 border-primary/50 text-primary font-semibold hover:bg-primary/25 shadow-xs'
                      : 'bg-muted/50 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  aria-label={`Reaction ${r.emoji}, count ${r.count}`}
                >
                  <span className="text-sm leading-none">{r.emoji}</span>
                  <span className="text-[11px] tabular-nums font-medium">{r.count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                className="bg-popover text-popover-foreground border shadow-md p-2 min-w-[140px] max-w-[200px]"
              >
                <div className="text-[11px] font-semibold text-muted-foreground mb-1 pb-1 border-b flex items-center justify-between">
                  <span>Reactions</span>
                  <span className="text-sm leading-none">{r.emoji}</span>
                </div>
                <div className="space-y-0.5">
                  {visibleUserIds.map((uId) => (
                    <ReactionUserRow key={uId} userId={uId} />
                  ))}
                  {overflowCount > 0 && (
                    <p className="text-[11px] text-muted-foreground pt-1">
                      +{overflowCount} others
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Plus reaction button */}
        {!disabled && (
          <EmojiPicker onSelect={handleAddReaction}>
            <button
              type="button"
              className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              aria-label="Add reaction"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </EmojiPicker>
        )}
      </div>
    </TooltipProvider>
  );
}
