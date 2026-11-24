'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import { voiceApi } from '@/lib/voice-api';
import { useAuthStore } from '@/lib/auth-store';
import { useCallStore } from '@/lib/call-store';
import { useUser } from '@/hooks/use-user';
import type { Conversation, ConversationMember } from '@/lib/chat-types';
import { Phone, Video, Loader2, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StartGroupCallDialogProps {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MemberItem({
  member,
  isSelected,
  onSelect,
}: {
  member: ConversationMember;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: user } = useUser(member.userId);
  const name = user?.name || user?.username || 'Member';
  const initial = (name[0] || 'M').toUpperCase();

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border/60 hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={user?.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-left">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.username ? `@${user.username}` : member.role}
          </p>
        </div>
      </div>
      <div
        className={cn(
          'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
        )}
      >
        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
    </div>
  );
}

export function StartGroupCallDialog({
  conversation,
  open,
  onOpenChange,
}: StartGroupCallDialogProps) {
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const [mode, setMode] = useState<'audio' | 'video'>('audio');
  const [selectedInviteeId, setSelectedInviteeId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['group-members', conversation.id],
    queryFn: () => chatApi.listMembers(conversation.id),
    enabled: open,
  });

  const otherMembers = (membersData?.data || []).filter(
    (m) => m.userId !== currentUserId
  );

  const handleStartCall = async () => {
    try {
      setIsStarting(true);
      const res = await voiceApi.startGroupCall(
        conversation.id,
        selectedInviteeId || undefined,
        mode
      );

      useCallStore.getState().setState({
        kind: 'connecting',
        callId: res.call.id,
        roomName: res.roomName,
        livekitUrl: res.livekitUrl,
        token: res.token,
        peerId: res.call.hostId || currentUserId || '',
        startedAt: res.call.startedAt,
        mode,
        isGroup: true,
        conversationId: conversation.id,
        hostId: res.call.hostId || undefined,
        participants: res.call.participants || (res.call.hostId ? [res.call.hostId] : []),
      });

      onOpenChange(false);
      toast({
        title: mode === 'video' ? 'Group video call started' : 'Group voice call started',
        description: selectedInviteeId
          ? 'Selected member is being rung; others can join from chat.'
          : 'Call invite card posted in group chat.',
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not start group call',
        description: errorObj.message || 'An error occurred while starting the call.',
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Start Group Call</span>
          </DialogTitle>
          <DialogDescription>
            Choose a call type and optionally ring a specific group member directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Call Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('audio')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all',
                  mode === 'audio'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                )}
              >
                <Phone className="w-4 h-4" />
                <span>Voice Call</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('video')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all',
                  mode === 'video'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                )}
              >
                <Video className="w-4 h-4" />
                <span>Video Call</span>
              </button>
            </div>
          </div>

          {/* Ring-first invitee selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ring Member (Optional)
            </label>
            <p className="text-xs text-muted-foreground">
              Nebron uses ring-first: the selected member receives an incoming call ring, while all other members see a live card in chat to join.
            </p>

            <div className="max-h-56 overflow-y-auto space-y-2 pt-1 pr-1">
              {/* Option: None */}
              <div
                onClick={() => setSelectedInviteeId(null)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all',
                  selectedInviteeId === null
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/60 hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">None (invite via chat)</p>
                    <p className="text-xs text-muted-foreground">Posts a live join card without ringing anyone</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                    selectedInviteeId === null
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {selectedInviteeId === null && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              {/* Members list */}
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-xs">Loading members...</span>
                </div>
              ) : (
                otherMembers.map((member) => (
                  <MemberItem
                    key={member.userId}
                    member={member}
                    isSelected={selectedInviteeId === member.userId}
                    onSelect={() => setSelectedInviteeId(member.userId)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartCall}
            disabled={isStarting}
            className="gap-2"
          >
            {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>Start Call</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
