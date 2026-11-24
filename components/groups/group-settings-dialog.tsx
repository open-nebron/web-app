'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MemberPicker } from './member-picker';
import { MemberList } from './member-list';
import { InviteDialog } from './invite-dialog';
import { chatApi } from '@/lib/chat-api';
import type { Conversation, ConversationMember, PublicUser } from '@/lib/chat-types';
import { toast } from '@/components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { UserPopover } from '@/components/users/user-popover';
import {
  Users,
  Settings,
  UserPlus,
  UserMinus,
  LogOut,
  Crown,
  Check,
  Edit2,
  Link2,
} from 'lucide-react';

interface GroupSettingsDialogProps {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupSettingsDialog({
  conversation,
  open,
  onOpenChange,
}: GroupSettingsDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.userId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(conversation.name || 'Group');
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newMembersToAdd, setNewMembersToAdd] = useState<PublicUser[]>([]);

  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['group-members', conversation.id],
    queryFn: () => chatApi.listMembers(conversation.id),
    enabled: open,
  });

  const members = useMemo<ConversationMember[]>(
    () => membersData?.data || [],
    [membersData?.data]
  );
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isOwner = conversation.ownerId === currentUserId || currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin';
  const canManageGroup = isOwner || isAdmin;

  const renameMutation = useMutation({
    mutationFn: (newName: string) => chatApi.renameGroup(conversation.id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsEditingName(false);
      toast({ title: 'Group renamed', description: `Group is now named "${groupName}".` });
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Rename failed',
        description: error.message || 'Could not rename group',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' }) =>
      chatApi.updateMemberRole(conversation.id, userId, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', conversation.id] });
      toast({
        title: 'Role updated',
        description: `Member role set to ${data.role}.`,
      });
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not update role',
        description: error.message || 'Failed to update member role',
      });
    },
  });

  const addMembersMutation = useMutation({
    mutationFn: (userIds: string[]) => chatApi.addMembers(conversation.id, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsAddingMembers(false);
      setNewMembersToAdd([]);
      toast({ title: 'Members added', description: 'New members were added to the group.' });
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not add members',
        description: error.message || 'Failed to add members',
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => chatApi.removeMember(conversation.id, userId),
    onSuccess: (_, removedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (removedUserId === currentUserId) {
        onOpenChange(false);
        router.push('/chat');
        toast({ title: 'Left group', description: 'You have left the group conversation.' });
      } else {
        toast({ title: 'Member removed', description: 'Member removed from group.' });
      }
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not remove member',
        description: error.message || 'Failed to remove member',
      });
    },
  });

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    renameMutation.mutate(groupName.trim());
  };

  const handleAddMembersSubmit = () => {
    if (newMembersToAdd.length === 0) return;
    const userIds = newMembersToAdd.map((u) => u.userId);
    addMembersMutation.mutate(userIds);
  };

  const existingMemberIds = useMemo(() => members.map((m) => m.userId), [members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Group Settings</DialogTitle>
              <DialogDescription>
                Manage group name, members, and permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Group Name Section */}
          <div className="space-y-1.5 border-b pb-4">
            <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Group Name
            </Label>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex gap-2 mt-1">
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={60}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 px-3"
                  disabled={renameMutation.isPending || !groupName.trim()}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => {
                    setGroupName(conversation.name || 'Group');
                    setIsEditingName(false);
                  }}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{conversation.name || 'Group'}</span>
                {canManageGroup && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 text-muted-foreground"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Rename
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Members List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Members ({members.length})
              </Label>
              <div className="flex items-center gap-1.5">
                {canManageGroup && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setIsInviting(true)}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Invite Link
                  </Button>
                )}
                {canManageGroup && !isAddingMembers && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setIsAddingMembers(true)}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Member
                  </Button>
                )}
              </div>
            </div>

            {/* Add Member Drawer / Inline Picker */}
            {isAddingMembers && (
              <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                <Label className="text-xs font-medium">Select users to add:</Label>
                <MemberPicker
                  selectedUsers={newMembersToAdd}
                  onSelectedChange={setNewMembersToAdd}
                  excludeUserIds={existingMemberIds}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setIsAddingMembers(false);
                      setNewMembersToAdd([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddMembersSubmit}
                    disabled={addMembersMutation.isPending || newMembersToAdd.length === 0}
                  >
                    {addMembersMutation.isPending ? 'Adding...' : 'Add Selected'}
                  </Button>
                </div>
              </div>
            )}

            {/* Members scrollable */}
            <MemberList
              conversation={conversation}
              members={members}
              currentUserId={currentUserId}
              isLoading={isLoadingMembers}
              onRoleChange={(userId, role) => updateRoleMutation.mutate({ userId, role })}
              onRemoveMember={(userId) => removeMemberMutation.mutate(userId)}
              isPendingRoleChange={updateRoleMutation.isPending}
              isPendingRemove={removeMemberMutation.isPending}
            />
          </div>

          {/* Leave Group Action */}
          <div className="pt-2 border-t flex justify-between items-center">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => {
                if (confirm('Are you sure you want to leave this group?')) {
                  if (currentUserId) {
                    removeMemberMutation.mutate(currentUserId);
                  }
                }
              }}
              disabled={removeMemberMutation.isPending}
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave Group
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

      <InviteDialog
        conversationId={conversation.id}
        conversationName={conversation.name}
        open={isInviting}
        onOpenChange={setIsInviting}
      />
    </Dialog>
  );
}
