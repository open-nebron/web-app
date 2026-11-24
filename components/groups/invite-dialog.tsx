'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { chatApi } from '@/lib/chat-api';
import { toast } from '@/components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Copy, Check, Trash2, Clock, Users } from 'lucide-react';

interface InviteDialogProps {
  conversationId: string;
  conversationName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({
  conversationId,
  conversationName,
  open,
  onOpenChange,
}: InviteDialogProps) {
  const queryClient = useQueryClient();
  const [durationHours, setDurationHours] = useState<string>('168');
  const [maxUses, setMaxUses] = useState<string>('unlimited');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: invites = [], isLoading: isLoadingInvites } = useQuery({
    queryKey: ['group-invites', conversationId],
    queryFn: () => chatApi.listInvites(conversationId),
    enabled: open,
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      const expiresInHours = durationHours === 'never' ? undefined : parseInt(durationHours, 10);
      const parsedMaxUses = maxUses === 'unlimited' ? undefined : parseInt(maxUses, 10);
      return chatApi.createInvite(conversationId, { expiresInHours, maxUses: parsedMaxUses });
    },
    onSuccess: (newInvite) => {
      queryClient.invalidateQueries({ queryKey: ['group-invites', conversationId] });
      toast({
        title: 'Invite link created',
        description: `Invite link created: ${newInvite.code}`,
      });
      navigator.clipboard.writeText(newInvite.url);
      setCopiedCode(newInvite.code);
      setTimeout(() => setCopiedCode(null), 2500);
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not create invite',
        description: error.message || 'Failed to create invite link',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (code: string) => chatApi.revokeInvite(conversationId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-invites', conversationId] });
      toast({ title: 'Invite revoked', description: 'The invite link is no longer valid.' });
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not revoke invite',
        description: error.message || 'Failed to revoke invite link',
      });
    },
  });

  const handleCopy = (code: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast({ title: 'Link copied', description: 'Invite link copied to clipboard.' });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Invite to {conversationName || 'Group'}</DialogTitle>
              <DialogDescription>
                Create invite links to let others join this conversation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Create Invite Form */}
          <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Create New Invite Link
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Expire after</Label>
                <Select value={durationHours} onValueChange={setDurationHours}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Max uses</Label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                    <SelectItem value="1">1 use</SelectItem>
                    <SelectItem value="5">5 uses</SelectItem>
                    <SelectItem value="25">25 uses</SelectItem>
                    <SelectItem value="100">100 uses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full h-8 text-xs mt-1"
              onClick={() => createInviteMutation.mutate()}
              disabled={createInviteMutation.isPending}
            >
              {createInviteMutation.isPending ? 'Generating...' : 'Generate New Link'}
            </Button>
          </div>

          {/* Active Invites List */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Invites ({invites.length})
            </Label>

            {isLoadingInvites ? (
              <p className="text-xs text-muted-foreground py-2 text-center">Loading invites...</p>
            ) : invites.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center border rounded-lg border-dashed">
                No active invite links. Generate one above.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.code}
                    className="p-2.5 border rounded-lg flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-mono text-xs font-semibold truncate">{inv.url}</div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {inv.uses} {inv.maxUses !== null ? `/ ${inv.maxUses} uses` : 'uses'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {inv.expiresAt
                            ? `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`
                            : 'Never expires'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => handleCopy(inv.code, inv.url)}
                      >
                        {copiedCode === inv.code ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => revokeMutation.mutate(inv.code)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
