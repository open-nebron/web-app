'use client';

import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PERMISSION_GROUPS,
  getOverrideState,
  setOverrideBit,
  type ChannelPermissionOverride,
  type SpaceCategory,
  type SpaceChannel,
  type SpaceRole,
} from '@/lib/spaces-api';
import { useDeleteChannel, useEditChannel } from '@/hooks/useSpaces';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Trash2, Check, X, Minus } from 'lucide-react';

interface ChannelSettingsDialogProps {
  spaceId: string;
  channel: SpaceChannel | null;
  categories: SpaceCategory[];
  roles: SpaceRole[];
  canManageChannels: boolean;
  canManageRoles: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function ChannelSettingsDialog({
  spaceId,
  channel,
  categories,
  roles,
  canManageChannels,
  canManageRoles,
  open,
  onOpenChange,
  onDeleted,
}: ChannelSettingsDialogProps) {
  const editMutation = useEditChannel(spaceId);
  const deleteMutation = useDeleteChannel(spaceId);

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState<string>('none');
  const [overrides, setOverrides] = useState<ChannelPermissionOverride[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  useEffect(() => {
    if (!channel) return;
    setName(channel.name);
    setTopic(channel.topic || '');
    setCategoryId(channel.categoryId || 'none');
    setOverrides(channel.permissionOverrides || []);
    const defaultRole = roles.find((r) => r.isDefault) || roles[0];
    setSelectedRoleId(defaultRole?.id || '');
  }, [channel, roles]);

  if (!channel) return null;

  const currentOverride: ChannelPermissionOverride = overrides.find(
    (o) => o.targetType === 'role' && o.targetId === selectedRoleId
  ) || {
    targetType: 'role',
    targetId: selectedRoleId,
    allow: '0',
    deny: '0',
  };

  const handleSetBitState = (bit: bigint, state: 'allow' | 'deny' | 'inherit') => {
    if (!selectedRoleId) return;
    const updated = setOverrideBit(currentOverride, bit, state);
    setOverrides((prev) => {
      const filtered = prev.filter(
        (o) => !(o.targetType === 'role' && o.targetId === selectedRoleId)
      );
      if (updated.allow === '0' && updated.deny === '0') {
        return filtered;
      }
      return [...filtered, updated];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await editMutation.mutateAsync({
        chId: channel.id,
        ...(canManageChannels
          ? {
              name: name.trim(),
              topic: topic.trim() || null,
              categoryId: categoryId === 'none' ? null : categoryId,
            }
          : {}),
        ...(canManageChannels || canManageRoles ? { permissionOverrides: overrides } : {}),
      });
      toast({ title: 'Channel saved' });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update channel',
        description: err instanceof Error ? err.message : 'Save failed',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(channel.id);
      toast({ title: 'Channel deleted' });
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not delete channel',
        description: err instanceof Error ? err.message : 'Delete failed',
      });
    }
  };

  const relevantGroups = PERMISSION_GROUPS.filter((g) => {
    if (g.id === 'membership') return false;
    if (channel.kind === 'text' && g.id === 'voice') return false;
    if (channel.kind === 'voice' && g.id === 'text') return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Channel Settings — #{channel.name}</DialogTitle>
          <DialogDescription>
            Configure channel details and role-level permission overrides.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col gap-4">
          <Tabs defaultValue={canManageChannels ? 'overview' : 'permissions'} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="overview" disabled={!canManageChannels}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="permissions">Permission Overrides</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-3 overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="ch-settings-name">Channel Name</Label>
                <Input
                  id="ch-settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ch-settings-topic">Topic</Label>
                <Textarea
                  id="ch-settings-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Optional channel topic"
                  maxLength={500}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Role Target
                </Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {relevantGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </h4>
                    <div className="divide-y border rounded-lg">
                      {group.items
                        .filter((item) => item.key !== 'ADMINISTRATOR' && item.key !== 'MANAGE_SPACE')
                        .map((item) => {
                          const state = getOverrideState(currentOverride, item.bit);
                          return (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-3 p-2.5 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-xs">{item.label}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {item.description}
                                </p>
                              </div>
                              <div className="flex items-center rounded-md border overflow-hidden shrink-0">
                                <button
                                  type="button"
                                  aria-label={`Deny ${item.label}`}
                                  onClick={() => handleSetBitState(item.bit, 'deny')}
                                  className={cn(
                                    'p-1.5 transition-colors',
                                    state === 'deny'
                                      ? 'bg-destructive text-destructive-foreground'
                                      : 'hover:bg-muted text-muted-foreground'
                                  )}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Inherit ${item.label}`}
                                  onClick={() => handleSetBitState(item.bit, 'inherit')}
                                  className={cn(
                                    'p-1.5 border-x transition-colors',
                                    state === 'inherit'
                                      ? 'bg-accent text-foreground'
                                      : 'hover:bg-muted text-muted-foreground'
                                  )}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Allow ${item.label}`}
                                  onClick={() => handleSetBitState(item.bit, 'allow')}
                                  className={cn(
                                    'p-1.5 transition-colors',
                                    state === 'allow'
                                      ? 'bg-emerald-600 text-white'
                                      : 'hover:bg-muted text-muted-foreground'
                                  )}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-3 shrink-0">
            {canManageChannels ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Channel
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
