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
import { spacesApi } from '@/lib/spaces-api';
import { useSpaceInvites } from '@/hooks/useSpaces';
import { toast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Copy, Check, Trash2, Clock, Users } from 'lucide-react';

interface SpaceInviteDialogProps {
  spaceId: string;
  spaceName?: string;
  canViewAllInvites?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpaceInviteDialog({
  spaceId,
  spaceName,
  canViewAllInvites = true,
  open,
  onOpenChange,
}: SpaceInviteDialogProps) {
  const queryClient = useQueryClient();
  const [durationHours, setDurationHours] = useState<string>('168');
  const [maxUses, setMaxUses] = useState<string>('unlimited');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [latestCreatedCode, setLatestCreatedCode] = useState<string | null>(null);

  const { data: invites = [], isLoading } = useSpaceInvites(spaceId, open && canViewAllInvites);

  const buildInviteUrl = (code: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/spaces/join/${code}`;
    }
    return `/spaces/join/${code}`;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const expiresInHours = durationHours === 'never' ? null : parseInt(durationHours, 10);
      const parsedMaxUses = maxUses === 'unlimited' ? null : parseInt(maxUses, 10);
      return spacesApi.createInvite(spaceId, { expiresInHours, maxUses: parsedMaxUses });
    },
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', 'invites', spaceId] });
      setLatestCreatedCode(inv.code);
      const url = buildInviteUrl(inv.code);
      navigator.clipboard?.writeText(url).catch(() => {});
      setCopiedCode(inv.code);
      toast({
        title: 'Invite link created',
        description: `Code: ${inv.code} (copied to clipboard)`,
      });
      setTimeout(() => setCopiedCode(null), 2500);
    },
    onError: (err: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Could not create invite',
        description: err instanceof Error ? err.message : 'Failed to create invite link',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (code: string) => spacesApi.revokeInvite(spaceId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', 'invites', spaceId] });
      toast({ title: 'Invite revoked' });
    },
    onError: (err: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Could not revoke invite',
        description: err instanceof Error ? err.message : 'Failed to revoke invite link',
      });
    },
  });

  const handleCopy = (code: string) => {
    const url = buildInviteUrl(code);
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedCode(code);
    toast({ title: 'Invite link copied' });
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
              <DialogTitle>Invite to {spaceName || 'Space'}</DialogTitle>
              <DialogDescription>
                Share an invite link so friends can join this server.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Generate Invite Link
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" /> Expires
                </Label>
                <Select value={durationHours} onValueChange={setDurationHours}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" /> Max uses
                </Label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                    <SelectItem value="1">1 use</SelectItem>
                    <SelectItem value="5">5 uses</SelectItem>
                    <SelectItem value="10">10 uses</SelectItem>
                    <SelectItem value="50">50 uses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              className="w-full text-xs"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="create-space-invite-btn"
            >
              {createMutation.isPending ? 'Creating invite...' : 'Create & Copy Invite Link'}
            </Button>

            {latestCreatedCode && (
              <div className="flex items-center justify-between gap-2 p-2 rounded border bg-background text-xs">
                <code className="truncate font-mono" data-testid="generated-invite-url">
                  {buildInviteUrl(latestCreatedCode)}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={() => handleCopy(latestCreatedCode)}
                >
                  {copiedCode === latestCreatedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {canViewAllInvites && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Invites
              </Label>
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Loading invites...</p>
              ) : invites.filter((i) => !i.revokedAt).length === 0 ? (
                <p className="text-xs text-muted-foreground">No active invite links.</p>
              ) : (
                invites
                  .filter((i) => !i.revokedAt)
                  .map((inv) => (
                    <div
                      key={inv.code}
                      className="flex items-center justify-between gap-2 p-2 rounded-md border text-xs bg-background"
                    >
                      <div className="min-w-0">
                        <p className="font-mono font-medium truncate">{inv.code}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {inv.uses} / {inv.maxUses ?? 'unlimited'} uses
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(inv.code)}
                          aria-label={`Copy invite ${inv.code}`}
                        >
                          {copiedCode === inv.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => revokeMutation.mutate(inv.code)}
                          aria-label={`Revoke invite ${inv.code}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
