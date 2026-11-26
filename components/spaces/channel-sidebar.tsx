'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  FolderPlus,
  Hash,
  Loader2,
  LogOut,
  Plus,
  Settings,
  SlidersHorizontal,
  UserPlus,
  Volume2,
} from 'lucide-react';
import {
  canCreateInvites,
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
  useKickMember,
  useSpaceDetail,
} from '@/hooks/useSpaces';
import { useSpacesStore } from '@/lib/spaces-store';
import { useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/hooks/use-auth';
import { useWsClient, useWsEvent } from '@/hooks/use-ws';
import type { WSMessageNewPayload } from '@/lib/chat-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import { CategoryGroup } from './category-group';
import { ChannelItem } from './channel-item';
import { VoiceChannelPanel } from './voice-channel-panel';
import { SpaceInviteDialog } from './invite-dialog';
import { SpaceSettingsDialog } from './space-settings-dialog';
import { ChannelSettingsDialog } from './channel-settings-dialog';

interface ChannelSidebarProps {
  spaceId: string;
  activeChannelId?: string;
}

export function ChannelSidebar({ spaceId, activeChannelId }: ChannelSidebarProps) {
  const router = useRouter();
  const { data: detail, isLoading, isError } = useSpaceDetail(spaceId);
  const { data: profile } = useProfile();
  const { logout } = useAuth();
  const { subscribeChannel, status: wsStatus } = useWsClient();

  const createChannelMutation = useCreateChannel(spaceId);
  const createCategoryMutation = useCreateCategory(spaceId);
  const leaveMutation = useKickMember(spaceId);

  const unreadByChannel = useSpacesStore((s) => s.unreadByChannel);
  const incrementUnread = useSpacesStore((s) => s.incrementUnread);
  const clearChannelUnread = useSpacesStore((s) => s.clearChannelUnread);
  const activeVoice = useSpacesStore((s) => s.activeVoice);
  const setActiveVoice = useSpacesStore((s) => s.setActiveVoice);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [settingsChannel, setSettingsChannel] = useState<SpaceChannel | null>(null);

  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelKind, setNewChannelKind] = useState<'text' | 'voice'>('text');
  const [newChannelCategoryId, setNewChannelCategoryId] = useState<string>('none');

  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const myPerms = useMemo(() => {
    try {
      return parsePermissions(detail?.myPermissions || '0');
    } catch {
      return BigInt(0);
    }
  }, [detail?.myPermissions]);

  const isOwner = Boolean(detail?.isOwner);
  const permsCanManageChannels = isOwner || canManageChannels(myPerms);
  const permsCanManageRoles = isOwner || canManageRoles(myPerms);
  const permsCanManageSpace = isOwner || canManageSpace(myPerms);
  const permsCanCreateInvites = isOwner || canCreateInvites(myPerms);

  // Subscribe to all visible text channel conversations for unread tracking
  useEffect(() => {
    if (!detail?.channels || wsStatus !== 'connected') return;
    detail.channels.forEach((ch) => {
      if (ch.kind === 'text' && ch.conversationId) {
        subscribeChannel(ch.conversationId);
      }
    });
  }, [detail?.channels, wsStatus, subscribeChannel]);

  // Clear unread when navigating to active channel
  useEffect(() => {
    if (spaceId && activeChannelId) {
      clearChannelUnread(spaceId, activeChannelId);
    }
  }, [spaceId, activeChannelId, clearChannelUnread]);

  // Increment unread badge for background channel messages
  useWsEvent('message.new', (payload: WSMessageNewPayload) => {
    const convId = payload?.message?.conversationId;
    if (!convId || !detail?.channels) return;
    if (payload.message.senderId === profile?.userId) return;
    const targetCh = detail.channels.find((c) => c.conversationId === convId);
    if (targetCh && targetCh.id !== activeChannelId) {
      incrementUnread(spaceId, targetCh.id);
    }
  });

  const grouped = useMemo(() => {
    if (!detail) return { categorized: [], uncategorized: [] };
    return groupChannelsByCategory(detail.categories, detail.channels);
  }, [detail]);

  const handleSelectChannel = async (channel: SpaceChannel) => {
    if (channel.kind === 'text') {
      clearChannelUnread(spaceId, channel.id);
      router.push(`/spaces/${spaceId}/channels/${channel.id}`);
      return;
    }

    // Voice channel: connect to LiveKit + open voice stage
    if (activeVoice?.channelId !== channel.id) {
      try {
        const res = await spacesApi.joinVoiceChannel(spaceId, channel.id);
        setActiveVoice({
          spaceId,
          spaceName: detail?.space.name || 'Space',
          channelId: channel.id,
          channelName: channel.name,
          roomName: res.roomName,
          livekitUrl: res.livekitUrl,
          token: res.token,
          canPublish: res.canPublish,
          joinedAt: new Date().toISOString(),
        });
      } catch (err: unknown) {
        toast({
          variant: 'destructive',
          title: 'Cannot join voice channel',
          description: err instanceof Error ? err.message : 'Missing voice permission',
        });
        return;
      }
    }
    router.push(`/spaces/${spaceId}/channels/${channel.id}`);
  };

  const handleOpenCreateChannel = (categoryId?: string) => {
    setNewChannelCategoryId(categoryId || 'none');
    setNewChannelName('');
    setNewChannelKind('text');
    setCreateChannelOpen(true);
  };

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newChannelName.trim();
    if (!cleaned) return;
    try {
      const ch = await createChannelMutation.mutateAsync({
        name: cleaned,
        kind: newChannelKind,
        categoryId: newChannelCategoryId === 'none' ? null : newChannelCategoryId,
      });
      setCreateChannelOpen(false);
      setNewChannelName('');
      toast({ title: 'Channel created', description: `#${ch.name}` });
      if (ch.kind === 'text') {
        router.push(`/spaces/${spaceId}/channels/${ch.id}`);
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not create channel',
        description: err instanceof Error ? err.message : 'Failed to create channel',
      });
    }
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newCategoryName.trim();
    if (!cleaned) return;
    try {
      await createCategoryMutation.mutateAsync({ name: cleaned });
      setCreateCategoryOpen(false);
      setNewCategoryName('');
      toast({ title: 'Category created' });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not create category',
        description: err instanceof Error ? err.message : 'Failed to create category',
      });
    }
  };

  const handleLeaveSpace = async () => {
    if (!profile?.userId) return;
    try {
      await leaveMutation.mutateAsync(profile.userId);
      toast({ title: 'Left space' });
      router.push('/');
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Cannot leave space',
        description: err instanceof Error ? err.message : 'Failed to leave space',
      });
    }
  };

  const userInitial = (profile?.name?.[0] || profile?.username?.[0] || 'U').toUpperCase();

  return (
    <>
      <aside
        aria-label="Space channels sidebar"
        className="w-60 shrink-0 h-screen sticky top-0 border-r bg-card flex flex-col select-none"
      >
        {/* Space Header */}
        <div className="h-14 border-b px-3 flex items-center justify-between shrink-0">
          {isLoading ? (
            <Skeleton className="h-5 w-36" />
          ) : detail ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Space menu"
                  data-testid="space-header-menu-btn"
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left"
                >
                  <span className="font-bold text-sm truncate">{detail.space.name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {permsCanCreateInvites && (
                  <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span>Invite People</span>
                  </DropdownMenuItem>
                )}

                {permsCanManageChannels && (
                  <>
                    <DropdownMenuItem onClick={() => handleOpenCreateChannel()}>
                      <Plus className="w-4 h-4 mr-2" />
                      <span>Create Channel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCreateCategoryOpen(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      <span>Create Category</span>
                    </DropdownMenuItem>
                  </>
                )}

                {permsCanManageSpace && (
                  <DropdownMenuItem onClick={() => setQuickSettingsOpen(true)}>
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    <span>Edit Space Profile</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild>
                  <Link href={`/spaces/${spaceId}/settings`} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    <span>Space Settings</span>
                  </Link>
                </DropdownMenuItem>

                {!isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLeaveSpace}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>Leave Space</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Space</span>
          )}
        </div>

        {/* Channel Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {isLoading ? (
            <div className="space-y-2 px-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-4 w-24 mt-3" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : isError || !detail ? (
            <div className="px-2 py-4 text-xs text-muted-foreground">
              Unable to load channels for this space.
            </div>
          ) : (
            <>
              {grouped.uncategorized.length > 0 && (
                <div className="space-y-0.5">
                  {grouped.uncategorized.map((ch) => (
                    <ChannelItem
                      key={ch.id}
                      channel={ch}
                      isActive={ch.id === activeChannelId}
                      canManage={permsCanManageChannels || permsCanManageRoles}
                      unreadCount={unreadByChannel[ch.id] || 0}
                      onSelect={handleSelectChannel}
                      onOpenSettings={setSettingsChannel}
                    />
                  ))}
                </div>
              )}

              {grouped.categorized.map(({ category, channels }) => (
                <CategoryGroup
                  key={category.id}
                  category={category}
                  channels={channels}
                  activeChannelId={activeChannelId}
                  canManageChannels={permsCanManageChannels}
                  canManageRoles={permsCanManageRoles}
                  onSelectChannel={handleSelectChannel}
                  onAddChannel={handleOpenCreateChannel}
                  onOpenChannelSettings={setSettingsChannel}
                />
              ))}
            </>
          )}
        </div>

        {/* Persistent Active Voice Channel Control Strip */}
        <VoiceChannelPanel />

        {/* Bottom User Bar */}
        <div className="border-t p-2.5 flex items-center justify-between gap-2 bg-card/80">
          <Link href="/profile" className="flex items-center gap-2 min-w-0 hover:opacity-85">
            <Avatar className="w-8 h-8 border">
              {profile?.avatarUrl && (
                <AvatarImage
                  src={normalizeStorageUrl(profile.avatarUrl)}
                  alt={profile.name || profile.username}
                />
              )}
              <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate leading-tight">
                {profile?.name || profile?.username || 'User'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                @{profile?.username || 'user'}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              asChild
              aria-label="User settings"
            >
              <Link href="/settings">
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => logout()}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Modals */}
      {detail && (
        <>
          <SpaceInviteDialog
            spaceId={spaceId}
            spaceName={detail.space.name}
            canViewAllInvites={permsCanManageSpace}
            open={inviteOpen}
            onOpenChange={setInviteOpen}
          />
          <SpaceSettingsDialog
            space={detail.space}
            open={quickSettingsOpen}
            onOpenChange={setQuickSettingsOpen}
          />
          <ChannelSettingsDialog
            spaceId={spaceId}
            channel={settingsChannel}
            categories={detail.categories}
            roles={detail.roles}
            canManageChannels={permsCanManageChannels}
            canManageRoles={permsCanManageRoles}
            open={Boolean(settingsChannel)}
            onOpenChange={(open) => {
              if (!open) setSettingsChannel(null);
            }}
            onDeleted={() => {
              if (settingsChannel?.id === activeChannelId) {
                router.push(`/spaces/${spaceId}`);
              }
            }}
          />
        </>
      )}

      {/* Create Channel Modal */}
      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>Add a text or voice channel to this space.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={newChannelKind === 'text' ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setNewChannelKind('text')}
                >
                  <Hash className="w-4 h-4" /> Text Channel
                </Button>
                <Button
                  type="button"
                  variant={newChannelKind === 'voice' ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setNewChannelKind('voice')}
                >
                  <Volume2 className="w-4 h-4" /> Voice Channel
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-channel-name">Channel Name</Label>
              <Input
                id="new-channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder={newChannelKind === 'text' ? 'announcements' : 'Lounge'}
                maxLength={100}
                required
              />
            </div>

            {detail && detail.categories.length > 0 && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newChannelCategoryId} onValueChange={setNewChannelCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {detail.categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateChannelOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createChannelMutation.isPending}>
                {createChannelMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Channel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Category Modal */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Group channels together under a collapsible header.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Engineering"
                maxLength={100}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCategoryMutation.isPending}>
                Create Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
