'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Hash,
  Loader2,
  Lock,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  canCreateInvites,
  canManageChannels,
  canManageMessages,
  canManageRoles,
  canManageSpace,
  canSend,
  canConnectVoice,
  canSpeak,
  canVideo,
  parsePermissions,
} from '@/lib/spaces-api';
import {
  useChannelPermissions,
  useSpaceDetail,
  useSpaceMembers,
} from '@/hooks/useSpaces';
import { useProfile } from '@/hooks/use-profile';
import { useMessages } from '@/hooks/use-messages';
import { useSendMessage } from '@/hooks/use-send-message';
import { useWsClient } from '@/hooks/use-ws';
import { useSpacesStore } from '@/lib/spaces-store';
import { useUser } from '@/hooks/use-user';
import { usePresence } from '@/hooks/use-presence';
import { MessageList } from '@/components/chat/message-list';
import { MessageComposer } from '@/components/chat/message-composer';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VoiceStage } from '@/components/spaces/voice-stage';
import { SpaceInviteDialog } from '@/components/spaces/invite-dialog';
import { ChannelSettingsDialog } from '@/components/spaces/channel-settings-dialog';
import { cn, normalizeStorageUrl } from '@/lib/utils';

function CompactMemberEntry({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const { data: user } = useUser(userId);
  const presence = usePresence(userId);
  const label = user?.name || user?.username || userId.slice(0, 8);
  const initial = (label[0] || 'U').toUpperCase();

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors">
      <div className="relative shrink-0">
        <Avatar className="w-7 h-7 border">
          {user?.avatarUrl && (
            <AvatarImage src={normalizeStorageUrl(user.avatarUrl)} alt={label} />
          )}
          <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
            presence?.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">
          {label} {isOwner ? '(Owner)' : ''}
        </p>
      </div>
    </div>
  );
}

export default function SpaceChannelPage() {
  const params = useParams();
  const spaceId = params?.spaceId as string;
  const channelId = params?.channelId as string;

  const { data: profile } = useProfile();
  const { data: detail, isLoading: isLoadingSpace } = useSpaceDetail(spaceId);
  const { data: chPermData } = useChannelPermissions(spaceId, channelId, profile?.userId);
  const { data: membersData } = useSpaceMembers(spaceId);

  const { subscribeChannel, status: wsStatus } = useWsClient();
  const clearChannelUnread = useSpacesStore((s) => s.clearChannelUnread);

  const [showMemberList, setShowMemberList] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);

  const channel = useMemo(
    () => detail?.channels.find((c) => c.id === channelId),
    [detail?.channels, channelId]
  );

  const conversationId = channel?.kind === 'text' ? channel.conversationId || '' : '';

  const {
    messages,
    isLoading: isLoadingMessages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    deleteMessage,
  } = useMessages(conversationId);

  const { sendMessage } = useSendMessage(conversationId);

  // Subscribe WS to this channel's conversation for live updates & typing
  useEffect(() => {
    if (!conversationId || wsStatus !== 'connected') return;
    subscribeChannel(conversationId);
  }, [conversationId, wsStatus, subscribeChannel]);

  useEffect(() => {
    if (spaceId && channelId) {
      clearChannelUnread(spaceId, channelId);
    }
  }, [spaceId, channelId, clearChannelUnread]);

  const effectivePerms = useMemo(() => {
    try {
      return parsePermissions(chPermData?.permissions ?? detail?.myPermissions ?? '0');
    } catch {
      return BigInt(0);
    }
  }, [chPermData?.permissions, detail?.myPermissions]);

  const isOwner = Boolean(detail?.isOwner);
  const permsCanSend = isOwner || canSend(effectivePerms);
  const permsCanManageMessages = isOwner || canManageMessages(effectivePerms);
  const permsCanManageChannels = isOwner || canManageChannels(effectivePerms);
  const permsCanManageRoles = isOwner || canManageRoles(effectivePerms);
  const permsCanManageSpace = isOwner || canManageSpace(effectivePerms);
  const permsCanCreateInvites = isOwner || canCreateInvites(effectivePerms);
  const permsCanConnect = isOwner || canConnectVoice(effectivePerms);
  const permsCanSpeak = isOwner || canSpeak(effectivePerms);
  const permsCanVideo = isOwner || canVideo(effectivePerms);

  if (isLoadingSpace) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading channel...
      </div>
    );
  }

  if (!detail || !channel) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center space-y-3">
        <h2 className="text-lg font-semibold">Channel unavailable</h2>
        <p className="text-sm text-muted-foreground">
          You may not have access to this channel, or it may have been deleted.
        </p>
        <Button asChild variant="outline">
          <Link href={`/spaces/${spaceId}`}>Back to Space</Link>
        </Button>
      </div>
    );
  }

  if (channel.kind === 'voice') {
    return (
      <VoiceStage
        spaceId={spaceId}
        spaceName={detail.space.name}
        channel={channel}
        canConnect={permsCanConnect}
        canSpeakPerm={permsCanSpeak}
        canVideoPerm={permsCanVideo}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen bg-background overflow-hidden">
      {/* Main Channel Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b px-4 flex items-center justify-between gap-3 shrink-0 bg-background/95">
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="w-5 h-5 text-muted-foreground shrink-0" />
            <h1 className="font-bold text-base truncate" data-testid="channel-header-name">
              {channel.name}
            </h1>
            {channel.topic && (
              <span className="hidden sm:inline-block text-xs text-muted-foreground border-l pl-2 truncate max-w-md">
                {channel.topic}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {permsCanCreateInvites && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setInviteOpen(true)}
                aria-label="Invite people"
                title="Invite people"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            )}

            {(permsCanManageChannels || permsCanManageRoles) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setChannelSettingsOpen(true)}
                aria-label="Channel settings"
                title="Channel settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}

            <Button
              type="button"
              variant={showMemberList ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowMemberList((v) => !v)}
              aria-label="Toggle members list"
              title="Toggle members list"
            >
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Message List */}
        {isLoadingMessages && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading messages...
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={profile?.userId || null}
            isGroupChat={true}
            hideReadReceipts={true}
            canDeleteAny={permsCanManageMessages}
            isLoadingMore={isFetchingNextPage}
            hasMore={hasNextPage}
            onLoadMore={() => fetchNextPage()}
            onRetry={(msg) => sendMessage(msg.body, msg.replyToId || undefined)}
            onDelete={deleteMessage}
          />
        )}

        {/* Typing Indicator */}
        {conversationId && <TypingIndicator conversationId={conversationId} />}

        {/* Composer or Read-Only Notice */}
        {permsCanSend ? (
          <MessageComposer
            conversationId={conversationId}
            onSend={(text, replyToId) => sendMessage(text, replyToId)}
            placeholder={`Message #${channel.name}`}
          />
        ) : (
          <div
            data-testid="channel-readonly-banner"
            className="border-t bg-muted/40 px-4 py-3 flex items-center justify-center gap-2 text-xs text-muted-foreground"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>You do not have permission to send messages in #{channel.name}.</span>
          </div>
        )}
      </div>

      {/* Collapsible Right Member List Drawer */}
      {showMemberList && (
        <aside className="hidden lg:flex w-60 border-l bg-card flex-col p-3 overflow-y-auto shrink-0 space-y-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Members — {detail.space.memberCount}
            </p>
            <Link
              href={`/spaces/${spaceId}/settings?tab=members`}
              className="text-[11px] text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="space-y-0.5">
            {(membersData?.members || []).map((m) => (
              <CompactMemberEntry key={m.userId} userId={m.userId} isOwner={m.isOwner} />
            ))}
          </div>
        </aside>
      )}

      {/* Dialogs */}
      <SpaceInviteDialog
        spaceId={spaceId}
        spaceName={detail.space.name}
        canViewAllInvites={permsCanManageSpace}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      <ChannelSettingsDialog
        spaceId={spaceId}
        channel={channel}
        categories={detail.categories}
        roles={detail.roles}
        canManageChannels={permsCanManageChannels}
        canManageRoles={permsCanManageRoles}
        open={channelSettingsOpen}
        onOpenChange={setChannelSettingsOpen}
      />
    </div>
  );
}
