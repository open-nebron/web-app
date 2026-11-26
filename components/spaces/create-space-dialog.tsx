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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSpace, useJoinInvite } from '@/hooks/useSpaces';
import { toast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Link2 } from 'lucide-react';

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function extractInviteCode(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/spaces\/join\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  const parts = trimmed.split('/').filter(Boolean);
  return parts[parts.length - 1] || trimmed;
}

export function CreateSpaceDialog({ open, onOpenChange }: CreateSpaceDialogProps) {
  const router = useRouter();
  const createMutation = useCreateSpace();
  const joinMutation = useJoinInvite();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteInput, setInviteInput] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Invalid space name',
        description: 'Space name must be at least 2 characters.',
      });
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmed,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setName('');
      setDescription('');
      onOpenChange(false);
      toast({
        title: 'Space created',
        description: `Welcome to ${created.space.name}!`,
      });
      const firstText = created.channels.find((c) => c.kind === 'text') || created.channels[0];
      if (firstText) {
        router.push(`/spaces/${created.space.id}/channels/${firstText.id}`);
      } else {
        router.push(`/spaces/${created.space.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create space';
      toast({
        variant: 'destructive',
        title: 'Could not create space',
        description: msg,
      });
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractInviteCode(inviteInput);
    if (!code) {
      toast({
        variant: 'destructive',
        title: 'Invite code required',
        description: 'Enter an invite code or URL.',
      });
      return;
    }

    try {
      const res = await joinMutation.mutateAsync(code);
      setInviteInput('');
      onOpenChange(false);
      toast({
        title: res.alreadyMember ? 'Already a member' : 'Joined space',
        description: `Opened ${res.space.name}`,
      });
      router.push(`/spaces/${res.space.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired invite code';
      toast({
        variant: 'destructive',
        title: 'Could not join space',
        description: msg,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Spaces</DialogTitle>
          <DialogDescription>
            Create a new community space or join an existing one with an invite link.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'create' | 'join')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" />
              Create Space
            </TabsTrigger>
            <TabsTrigger value="join" className="gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Join via Invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="pt-3">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-space-name">Space Name</Label>
                <Input
                  id="create-space-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nebron Builders"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-space-desc">Description (optional)</Label>
                <Textarea
                  id="create-space-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this community about?"
                  maxLength={500}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Space
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="join" className="pt-3">
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-space-invite">Invite Link or Code</Label>
                <Input
                  id="join-space-invite"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  placeholder="https://nebron.com/spaces/join/abc123 or abc123"
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={joinMutation.isPending}>
                  {joinMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Join Space
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
