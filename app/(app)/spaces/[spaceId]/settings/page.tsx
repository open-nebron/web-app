'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  Hash,
  Link2,
  Loader2,
  Plus,
  Settings,
  Shield,
  Trash2,
  Users,
  Volume2,
} from 'lucide-react';
import {
  canBanMembers,
  canCreateInvites,
  canKickMembers,
  canManageChannels,
  canManageRoles,
  canManageSpace,
  groupChannelsByCategory,
  parsePermissions,
  spacesApi,
  type SpaceChannel,
} from '@/lib/spaces-api';
import {
  useCreateCategory,
  useCreateChannel,
  useDeleteCategory,
  useDeleteSpace,
  useEditSpace,
  useSpaceBans,
  useSpaceDetail,
  useSpaceInvites,
  useUnbanMember,
} from '@/hooks/useSpaces';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { RolesPanel } from '@/components/spaces/roles-panel';
import { MemberManager } from '@/components/spaces/member-manager';
import { ChannelSettingsDialog } from '@/components/spaces/channel-settings-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function SpaceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const spaceId = params?.spaceId as string;
  const initialTab = searchParams?.get('tab') || 'overview';

  const { data: detail, isLoading } = useSpaceDetail(spaceId);
  const editSpaceMutation = useEditSpace(spaceId);
  const deleteSpaceMutation = useDeleteSpace();
  const createChannelMutation = useCreateChannel(spaceId);
  const createCategoryMutation = useCreateCategory(spaceId);
  const deleteCategoryMutation = useDeleteCategory(spaceId);
  const unbanMutation = useUnbanMember(spaceId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconKey, setIconKey] = useState('');
  const [bannerKey, setBannerKey] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [editingChannel, setEditingChannel] = useState<SpaceChannel | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelKind, setNewChannelKind] = useState<'text' | 'voice'>('text');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (!detail?.space) return;
    setName(detail.space.name);
    setDescription(detail.space.description || '');
    setIconKey(detail.space.iconKey || '');
    setBannerKey(detail.space.bannerKey || '');
  }, [detail?.space]);

  const myPerms = useMemo(() => {
    try {
      return parsePermissions(detail?.myPermissions || '0');
    } catch {
      return BigInt(0);
    }
  }, [detail?.myPermissions]);

  const isOwner = Boolean(detail?.isOwner);
  const permsCanManageSpace = isOwner || canManageSpace(myPerms);
  const permsCanManageRoles = isOwner || canManageRoles(myPerms);
  const permsCanManageChannels = isOwner || canManageChannels(myPerms);
  const permsCanKick = isOwner || canKickMembers(myPerms);
  const permsCanBan = isOwner || canBanMembers(myPerms);
  const permsCanCreateInvites = isOwner || canCreateInvites(myPerms);

  const { data: invites = [] } = useSpaceInvites(spaceId, permsCanManageSpace);
  const { data: bans = [] } = useSpaceBans(spaceId, permsCanBan);

  const createInviteMutation = useMutation({
    mutationFn: () => spacesApi.createInvite(spaceId, {}),
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', 'invites', spaceId] });
      toast({ title: 'Invite created', description: inv.code });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (code: string) => spacesApi.revokeInvite(spaceId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', 'invites', spaceId] });
      toast({ title: 'Invite revoked' });
    },
  });

  const handleSaveOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await editSpaceMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        iconKey: iconKey.trim() || null,
        bannerKey: bannerKey.trim() || null,
      });
      toast({ title: 'Space settings saved' });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save settings',
      });
    }
  };

  const handleDeleteSpace = async () => {
    try {
      await deleteSpaceMutation.mutateAsync(spaceId);
      toast({ title: 'Space deleted' });
      router.push('/');
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Only owner can delete space',
      });
    }
  };

  if (isLoading || !detail) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading space settings...
      </div>
    );
  }

  const grouped = groupChannelsByCategory(detail.categories, detail.channels);

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b px-6 flex items-center justify-between bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href={`/spaces/${spaceId}`} aria-label="Back to space">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-bold text-base leading-tight">{detail.space.name} Settings</h1>
            <p className="text-[11px] text-muted-foreground">{detail.space.memberCount} members</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Roles
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Members
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Invites
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Channels
            </TabsTrigger>
            <TabsTrigger value="bans" className="gap-1.5" disabled={!permsCanBan}>
              <Ban className="w-3.5 h-3.5" /> Bans
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Space Overview</CardTitle>
                <CardDescription>
                  Update the name, description, and branding keys for this space.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveOverview} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-space-name">Name</Label>
                    <Input
                      id="settings-space-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!permsCanManageSpace}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-space-desc">Description</Label>
                    <Textarea
                      id="settings-space-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={!permsCanManageSpace}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-space-icon">Icon URL / Key</Label>
                      <Input
                        id="settings-space-icon"
                        value={iconKey}
                        onChange={(e) => setIconKey(e.target.value)}
                        disabled={!permsCanManageSpace}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-space-banner">Banner URL / Key</Label>
                      <Input
                        id="settings-space-banner"
                        value={bannerKey}
                        onChange={(e) => setBannerKey(e.target.value)}
                        disabled={!permsCanManageSpace}
                      />
                    </div>
                  </div>
                  {permsCanManageSpace && (
                    <Button type="submit" disabled={editSpaceMutation.isPending}>
                      {editSpaceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Overview
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            {isOwner && (
              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Permanently deletes this space, its roles, channels, invites, and memberships.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteSpace}
                    disabled={deleteSpaceMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Space
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ROLES TAB */}
          <TabsContent value="roles">
            <RolesPanel
              spaceId={spaceId}
              isOwner={isOwner}
              canManageRoles={permsCanManageRoles}
            />
          </TabsContent>

          {/* MEMBERS TAB */}
          <TabsContent value="members">
            <MemberManager
              spaceId={spaceId}
              isOwner={isOwner}
              canManageRoles={permsCanManageRoles}
              canKick={permsCanKick}
              canBan={permsCanBan}
            />
          </TabsContent>

          {/* INVITES TAB */}
          <TabsContent value="invites" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Invites</h3>
                <p className="text-xs text-muted-foreground">
                  Manage invite codes for joining this space.
                </p>
              </div>
              {permsCanCreateInvites && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => createInviteMutation.mutate()}
                  disabled={createInviteMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Create Invite
                </Button>
              )}
            </div>

            {!permsCanManageSpace ? (
              <p className="text-sm text-muted-foreground">
                Requires Manage Space permission to view all space invites.
              </p>
            ) : invites.filter((i) => !i.revokedAt).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active invite links yet.</p>
            ) : (
              <div className="border rounded-xl divide-y bg-card">
                {invites
                  .filter((i) => !i.revokedAt)
                  .map((inv) => {
                    const url =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/spaces/join/${inv.code}`
                        : `/spaces/join/${inv.code}`;
                    return (
                      <div
                        key={inv.code}
                        className="flex items-center justify-between gap-3 p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <code className="font-mono font-semibold text-xs">{inv.code}</code>
                          <p className="text-xs text-muted-foreground">
                            {inv.uses} uses {inv.maxUses ? `(max ${inv.maxUses})` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard?.writeText(url).catch(() => {});
                              setCopiedCode(inv.code);
                              setTimeout(() => setCopiedCode(null), 2000);
                            }}
                          >
                            {copiedCode === inv.code ? (
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 mr-1" />
                            )}
                            Copy
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => revokeInviteMutation.mutate(inv.code)}
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* CHANNELS TAB */}
          <TabsContent value="channels" className="space-y-6">
            {permsCanManageChannels && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">New Channel</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Input
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="channel-name"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewChannelKind((k) => (k === 'text' ? 'voice' : 'text'))
                      }
                    >
                      {newChannelKind}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newChannelName.trim() || createChannelMutation.isPending}
                      onClick={async () => {
                        await createChannelMutation.mutateAsync({
                          name: newChannelName.trim(),
                          kind: newChannelKind,
                        });
                        setNewChannelName('');
                        toast({ title: 'Channel created' });
                      }}
                    >
                      Add
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">New Category</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category Name"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                      onClick={async () => {
                        await createCategoryMutation.mutateAsync({
                          name: newCategoryName.trim(),
                        });
                        setNewCategoryName('');
                        toast({ title: 'Category created' });
                      }}
                    >
                      Add
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              {grouped.categorized.map(({ category, channels }) => (
                <div key={category.id} className="border rounded-xl bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {category.name}
                    </span>
                    {permsCanManageChannels && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={() => deleteCategoryMutation.mutate(category.id)}
                      >
                        Delete Category
                      </Button>
                    )}
                  </div>
                  <div className="divide-y">
                    {channels.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {ch.kind === 'text' ? (
                            <Hash className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{ch.name}</span>
                        </div>
                        {(permsCanManageChannels || permsCanManageRoles) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingChannel(ch)}
                          >
                            Edit / Permissions
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* BANS TAB */}
          <TabsContent value="bans" className="space-y-4">
            <h3 className="font-semibold text-base">Banned Members</h3>
            {bans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No banned users in this space.</p>
            ) : (
              <div className="border rounded-xl divide-y bg-card">
                {bans.map((ban) => (
                  <div
                    key={ban.userId}
                    className="flex items-center justify-between gap-3 p-3.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium">{ban.userId}</p>
                      <p className="text-xs text-muted-foreground">
                        {ban.reason || 'No reason provided'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={unbanMutation.isPending}
                      onClick={() => unbanMutation.mutate(ban.userId)}
                    >
                      Unban
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ChannelSettingsDialog
        spaceId={spaceId}
        channel={editingChannel}
        categories={detail.categories}
        roles={detail.roles}
        canManageChannels={permsCanManageChannels}
        canManageRoles={permsCanManageRoles}
        open={Boolean(editingChannel)}
        onOpenChange={(open) => {
          if (!open) setEditingChannel(null);
        }}
      />
    </div>
  );
}
