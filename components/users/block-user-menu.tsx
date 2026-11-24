'use client';

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ShieldAlert, VolumeX, Volume2, UserCheck, Loader2 } from 'lucide-react';
import { chatApi } from '@/lib/chat-api';
import { toast } from '@/components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BlockUserMenuProps {
  userId: string;
  userName?: string;
}

export function BlockUserMenu({ userId, userName = 'user' }: BlockUserMenuProps) {
  const queryClient = useQueryClient();

  const { data: relationship, isLoading } = useQuery({
    queryKey: ['relationship', userId],
    queryFn: () => chatApi.getRelationship(userId),
    staleTime: 60 * 1000,
  });

  const isBlocked = relationship?.blocked ?? false;
  const isMuted = relationship?.muted?.messages ?? false;

  const toggleBlockMutation = useMutation({
    mutationFn: async () => {
      if (isBlocked) {
        await chatApi.unblockUser(userId);
      } else {
        await chatApi.blockUser(userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship', userId] });
      toast({
        title: isBlocked ? 'User unblocked' : 'User blocked',
        description: isBlocked
          ? `${userName} has been unblocked.`
          : `${userName} has been blocked.`,
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err.message || 'Could not update block status',
      });
    },
  });

  const toggleMuteMutation = useMutation({
    mutationFn: async () => {
      if (isMuted) {
        await chatApi.unmuteUser(userId);
      } else {
        await chatApi.muteUser(userId, { calls: true, messages: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship', userId] });
      toast({
        title: isMuted ? 'User unmuted' : 'User muted',
        description: isMuted
          ? `Notifications from ${userName} are now unmuted.`
          : `Notifications from ${userName} are now muted.`,
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err.message || 'Could not update mute status',
      });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-4 h-4" />
          <span className="sr-only">User options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => toggleMuteMutation.mutate()}
          disabled={isLoading || toggleMuteMutation.isPending}
          className="gap-2 text-xs cursor-pointer"
        >
          {isMuted ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Unmute notifications</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Mute notifications</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => toggleBlockMutation.mutate()}
          disabled={isLoading || toggleBlockMutation.isPending}
          className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
        >
          {isBlocked ? (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              <span>Unblock user</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Block user</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
