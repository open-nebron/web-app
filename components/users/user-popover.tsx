'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PresenceDot } from '@/components/chat/presence-dot';
import { useUser } from '@/hooks/use-user';
import { usePresence } from '@/hooks/use-presence';
import { useAuthStore } from '@/lib/auth-store';
import { chatApi } from '@/lib/chat-api';
import { toast } from '@/components/ui/use-toast';
import { MessageSquare, ShieldAlert, VolumeX, UserCheck } from 'lucide-react';
import { BlockUserMenu } from './block-user-menu';

interface UserPopoverProps {
  userId: string;
  children: React.ReactNode;
}

export function UserPopover({ userId, children }: UserPopoverProps) {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const { data: user, isLoading } = useUser(userId);
  const presence = usePresence(userId);
  const [open, setOpen] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const isSelf = currentUserId === userId;

  const handleStartChat = async () => {
    if (isSelf) return;
    try {
      setIsStartingChat(true);
      const res = await chatApi.createDirect(userId);
      setOpen(false);
      router.push(`/chat/${res.conversationId}`);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not open chat',
        description: err.message || 'Failed to start conversation',
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  const displayName = user?.name || user?.username || 'User';
  const initial = (displayName[0] || 'U').toUpperCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-4 shadow-xl" align="start">
        {isLoading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="relative">
                <Avatar className="w-14 h-14 border border-border">
                  <AvatarImage src={user?.avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="font-semibold text-lg">{initial}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0">
                  <PresenceDot status={presence.status} size="md" />
                </div>
              </div>

              {!isSelf && (
                <BlockUserMenu userId={userId} userName={displayName} />
              )}
            </div>

            <div>
              <Link
                href={`/${user?.username || ''}`}
                className="font-semibold text-base hover:underline line-clamp-1 block"
                onClick={() => setOpen(false)}
              >
                {displayName}
              </Link>
              {user?.username && (
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              )}
            </div>

            {user?.bio && (
              <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">
                {user.bio}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 border-t">
              {!isSelf ? (
                <Button
                  size="sm"
                  variant="default"
                  className="w-full gap-1.5 h-8 text-xs"
                  onClick={handleStartChat}
                  disabled={isStartingChat}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {isStartingChat ? 'Opening...' : 'Send Message'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href={`/${user?.username || ''}`}>View Profile</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
