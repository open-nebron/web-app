'use client';

import React, { useState } from 'react';
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
import { MemberPicker } from './member-picker';
import { chatApi } from '@/lib/chat-api';
import type { PublicUser } from '@/lib/chat-types';
import { toast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<PublicUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Group name required',
        description: 'Please enter a name for the group.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const memberIds = selectedMembers.map((m) => m.userId);
      const res = await chatApi.createGroup(groupName.trim(), memberIds);

      toast({
        title: 'Group created',
        description: `Group "${groupName.trim()}" has been created.`,
      });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onOpenChange(false);
      setGroupName('');
      setSelectedMembers([]);
      router.push(`/chat/${res.conversationId}`);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create group',
        description: err.message || 'Something went wrong while creating group',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Create Group Chat</DialogTitle>
              <DialogDescription>
                Start a group conversation with up to 100 members.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. Design Team, Family, Friends"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={60}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Add Members ({selectedMembers.length})</Label>
            <MemberPicker
              selectedUsers={selectedMembers}
              onSelectedChange={setSelectedMembers}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !groupName.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
