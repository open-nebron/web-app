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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MoreHorizontal,
  ShieldAlert,
  VolumeX,
  Volume2,
  PhoneOff,
  Phone,
  UserCheck,
  Loader2,
  MessageSquareOff,
} from 'lucide-react';
import { chatApi } from '@/lib/chat-api';
import { toast } from '@/components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BlockUserMenuProps {
  userId: string;
  userName?: string;
}

export function BlockUserMenu({ userId, userName = 'user' }: BlockUserMenuProps) {
  const queryClient = useQueryClient();
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  const { data: relationship, isLoading } = useQuery({
    queryKey: ['relationship', userId],
    queryFn: () => chatApi.getRelationship(userId),
    staleTime: 60 * 1000,
  });

  const isBlocked = relationship?.blocked ?? false;
  const muteState = relationship?.mute || relationship?.muted;
  const isMutedMessages = muteState?.messages ?? false;
  const isMutedCalls = muteState?.calls ?? false;

  const toggleMuteMessagesMutation = useMutation({
    mutationFn: async () => {
      const newMessages = !isMutedMessages;
      if (!newMessages && !isMutedCalls) {
        await chatApi.unmuteUser(userId);
      } else {
        await chatApi.muteUser(userId, { messages: newMessages, calls: isMutedCalls });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship', userId] });
      toast({
        title: isMutedMessages ? 'Messages unmuted' : 'Messages muted',
        description: isMutedMessages
          ? `Message notifications from ${userName} are now unmuted.`
          : `Message notifications from ${userName} are now muted.`,
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

  const toggleMuteCallsMutation = useMutation({
    mutationFn: async () => {
      const newCalls = !isMutedCalls;
      if (!newCalls && !isMutedMessages) {
        await chatApi.unmuteUser(userId);
      } else {
        await chatApi.muteUser(userId, { messages: isMutedMessages, calls: newCalls });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship', userId] });
      toast({
        title: isMutedCalls ? 'Calls unmuted' : 'Calls muted',
        description: isMutedCalls
          ? `Call notifications from ${userName} are now unmuted.`
          : `Call notifications from ${userName} are now muted.`,
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err.message || 'Could not update call mute status',
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (isBlocked) {
        await chatApi.unblockUser(userId);
      } else {
        await chatApi.blockUser(userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship', userId] });
      setShowBlockDialog(false);
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-4 h-4" />
            <span className="sr-only">User options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Mute Messages */}
          <DropdownMenuItem
            onClick={() => toggleMuteMessagesMutation.mutate()}
            disabled={isLoading || toggleMuteMessagesMutation.isPending}
            className="gap-2 text-xs cursor-pointer"
          >
            {isMutedMessages ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Unmute messages</span>
              </>
            ) : (
              <>
                <MessageSquareOff className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Mute messages</span>
              </>
            )}
          </DropdownMenuItem>

          {/* Mute Calls */}
          <DropdownMenuItem
            onClick={() => toggleMuteCallsMutation.mutate()}
            disabled={isLoading || toggleMuteCallsMutation.isPending}
            className="gap-2 text-xs cursor-pointer"
          >
            {isMutedCalls ? (
              <>
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Unmute calls</span>
              </>
            ) : (
              <>
                <PhoneOff className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Mute calls</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Block User */}
          <DropdownMenuItem
            onClick={() => {
              if (isBlocked) {
                blockMutation.mutate();
              } else {
                setShowBlockDialog(true);
              }
            }}
            disabled={isLoading || blockMutation.isPending}
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

      {/* Confirmation Dialog for Block User */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Block {userName}?</DialogTitle>
            <DialogDescription>
              They will no longer be able to send you messages or call you on nebron. You can unblock them at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBlockDialog(false)}
              disabled={blockMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending}
              className="gap-2"
            >
              {blockMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
