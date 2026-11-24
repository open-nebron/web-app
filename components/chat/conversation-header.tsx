'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PresenceDot } from './presence-dot';
import { useUser } from '@/hooks/use-user';
import { usePresence } from '@/hooks/use-presence';
import { UserPopover } from '@/components/users/user-popover';
import { GroupSettingsDialog } from '@/components/groups/group-settings-dialog';
import { BlockUserMenu } from '@/components/users/block-user-menu';
import { CallButton } from '@/components/call/call-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Conversation } from '@/lib/chat-types';
import { ArrowLeft, Phone, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationHeaderProps {
  conversation: Conversation;
}

export function ConversationHeader({ conversation }: ConversationHeaderProps) {
  const router = useRouter();
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const isDirect = conversation.kind === 'direct';

  const { data: peerUser } = useUser(isDirect ? conversation.peerUserId : undefined);
  const presence = usePresence(isDirect ? conversation.peerUserId : undefined);

  const title = isDirect
    ? peerUser?.name || peerUser?.username || 'User'
    : conversation.name || 'Group Chat';

  const avatarUrl = isDirect ? peerUser?.avatarUrl : undefined;
  const initial = (title[0] || 'C').toUpperCase();

  return (
    <>
      <header className="h-16 border-b px-4 flex items-center justify-between bg-background/95 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 shrink-0 -ml-1 text-muted-foreground"
            onClick={() => router.push('/chat')}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Avatar and user/group details */}
          {isDirect && conversation.peerUserId ? (
            <UserPopover userId={conversation.peerUserId}>
              <div className="flex items-center gap-3 cursor-pointer group min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="w-10 h-10 border border-border/40 group-hover:opacity-90 transition-opacity">
                    <AvatarImage src={avatarUrl || undefined} alt={title} />
                    <AvatarFallback className="font-semibold text-sm">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0">
                    <PresenceDot status={presence.status} size="sm" />
                  </div>
                </div>

                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate leading-tight group-hover:underline">
                    {title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate leading-normal">
                    {presence.status === 'online' ? (
                      <span className="text-emerald-500 font-medium">Online</span>
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>
              </div>
            </UserPopover>
          ) : (
            <div
              onClick={() => setGroupSettingsOpen(true)}
              className="flex items-center gap-3 cursor-pointer group min-w-0"
            >
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10 border border-border/40 group-hover:opacity-90 transition-opacity">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    <Users className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate leading-tight group-hover:underline">
                  {title}
                </h3>
                <p className="text-[11px] text-muted-foreground truncate leading-normal">
                  {conversation.memberCount
                    ? `${conversation.memberCount} members`
                    : 'Group'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action icons on right */}
        <div className="flex items-center gap-1">
          {/* Voice call button (1:1 only) */}
          {isDirect && conversation.peerUserId && (
            <CallButton peerUserId={conversation.peerUserId} />
          )}

          {/* Settings / Block menu */}
          {isDirect && conversation.peerUserId ? (
            <BlockUserMenu userId={conversation.peerUserId} userName={title} />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setGroupSettingsOpen(true)}
              aria-label="Group settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Group settings dialog */}
      {!isDirect && (
        <GroupSettingsDialog
          conversation={conversation}
          open={groupSettingsOpen}
          onOpenChange={setGroupSettingsOpen}
        />
      )}
    </>
  );
}
