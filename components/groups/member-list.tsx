'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserPopover } from '@/components/users/user-popover';
import type { Conversation, ConversationMember } from '@/lib/chat-types';
import { Crown, Shield, ShieldCheck, ShieldAlert, MoreVertical, UserMinus } from 'lucide-react';

interface MemberListProps {
  conversation: Conversation;
  members: ConversationMember[];
  currentUserId?: string;
  isLoading?: boolean;
  onRoleChange: (userId: string, newRole: 'admin' | 'member') => void;
  onRemoveMember: (userId: string) => void;
  isPendingRoleChange?: boolean;
  isPendingRemove?: boolean;
}

export function MemberList({
  conversation,
  members,
  currentUserId,
  isLoading,
  onRoleChange,
  onRemoveMember,
  isPendingRoleChange,
  isPendingRemove,
}: MemberListProps) {
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isOwner = conversation.ownerId === currentUserId || currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin';

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2 text-center">Loading members...</p>;
  }

  return (
    <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-border/40">
      {members.map((member) => {
        const isThisMemberOwner =
          member.role === 'owner' || conversation.ownerId === member.userId;
        const isThisMemberAdmin = member.role === 'admin' && !isThisMemberOwner;
        const isCurrent = member.userId === currentUserId;
        const name = member.profile?.name || member.profile?.username || member.userId;

        // Permissions:
        // Owner can promote/demote anyone (except self)
        // Owner can remove anyone (except self)
        // Admin can remove regular members only (not owner, not other admins, not self)
        const canManageRole = isOwner && !isCurrent && !isThisMemberOwner;
        const canRemove =
          !isCurrent &&
          ((isOwner && !isThisMemberOwner) ||
            (isAdmin && !isThisMemberOwner && !isThisMemberAdmin));

        return (
          <div
            key={member.userId}
            className="flex items-center justify-between py-2 text-sm"
          >
            <UserPopover userId={member.userId}>
              <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.profile?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {(name[0] || 'U').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs">
                      {name} {isCurrent && '(You)'}
                    </span>
                    {isThisMemberOwner && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 gap-0.5">
                        <Crown className="w-2.5 h-2.5 text-amber-500" /> Owner
                      </Badge>
                    )}
                    {isThisMemberAdmin && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 gap-0.5 text-blue-500 border-blue-500/30">
                        <Shield className="w-2.5 h-2.5 text-blue-500" /> Admin
                      </Badge>
                    )}
                    {!isThisMemberOwner && !isThisMemberAdmin && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-muted-foreground">
                        Member
                      </Badge>
                    )}
                  </div>
                  {member.profile?.username && (
                    <p className="text-[11px] text-muted-foreground">
                      @{member.profile.username}
                    </p>
                  )}
                </div>
              </div>
            </UserPopover>

            {/* Actions Menu */}
            {(canManageRole || canRemove) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={isPendingRoleChange || isPendingRemove}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 text-xs">
                  {canManageRole && (
                    <>
                      {isThisMemberAdmin ? (
                        <DropdownMenuItem
                          onClick={() => onRoleChange(member.userId, 'member')}
                          className="gap-2"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                          <span>Demote to Member</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onRoleChange(member.userId, 'admin')}
                          className="gap-2"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                          <span>Promote to Admin</span>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {canRemove && (
                    <DropdownMenuItem
                      onClick={() => onRemoveMember(member.userId)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Remove Member</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
