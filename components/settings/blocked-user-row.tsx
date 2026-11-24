'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { chatApi } from '@/lib/chat-api';
import type { BlockedUser } from '@/lib/chat-types';
import { UserCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BlockedUserRowProps {
  user: BlockedUser;
}

export function BlockedUserRow({ user }: BlockedUserRowProps) {
  const queryClient = useQueryClient();

  const unblockMutation = useMutation({
    mutationFn: () => chatApi.unblockUser(user.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['relationship', user.userId] });
      toast({
        title: 'User unblocked',
        description: `@${user.username} has been unblocked.`,
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Could not unblock user',
        description: err.message || 'Action failed',
      });
    },
  });

  const displayName = user.name || user.username || 'User';
  const initial = (displayName[0] || 'U').toUpperCase();

  let blockedAgo = '';
  try {
    blockedAgo = formatDistanceToNow(new Date(user.blockedAt), { addSuffix: true });
  } catch {
    blockedAgo = '';
  }

  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 border shrink-0">
          <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-xs font-semibold">{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h4 className="font-semibold text-sm truncate leading-tight text-foreground">
            {displayName}
          </h4>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            @{user.username}
            {blockedAgo && <span className="text-muted-foreground/60 ml-2">• Blocked {blockedAgo}</span>}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => unblockMutation.mutate()}
        disabled={unblockMutation.isPending}
        className="shrink-0 text-xs gap-1.5 h-8 border-destructive/20 text-destructive hover:bg-destructive/10"
      >
        {unblockMutation.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <UserCheck className="w-3.5 h-3.5" />
        )}
        <span>Unblock</span>
      </Button>
    </div>
  );
}
