'use client';

import React from 'react';
import { Hash, Volume2, Settings } from 'lucide-react';
import type { SpaceChannel } from '@/lib/spaces-api';
import { useSpacesStore } from '@/lib/spaces-store';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, normalizeStorageUrl } from '@/lib/utils';

function VoiceParticipantMiniRow({
  userId,
  isSpeaking,
  isMuted,
}: {
  userId: string;
  isSpeaking: boolean;
  isMuted: boolean;
}) {
  const { data: user } = useUser(userId);
  const label = user?.name || user?.username || userId.slice(0, 8);
  const initial = (label[0] || 'U').toUpperCase();

  return (
    <div className="flex items-center gap-2 pl-6 pr-2 py-0.5 text-xs text-muted-foreground">
      <Avatar
        className={cn(
          'w-4 h-4 border transition-all',
          isSpeaking ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-border/60'
        )}
      >
        {user?.avatarUrl && (
          <AvatarImage src={normalizeStorageUrl(user.avatarUrl)} alt={label} />
        )}
        <AvatarFallback className="text-[8px]">{initial}</AvatarFallback>
      </Avatar>
      <span className={cn('truncate flex-1', isSpeaking && 'text-foreground font-medium')}>
        {label}
      </span>
      {isMuted && <span className="text-[10px] text-muted-foreground/70">muted</span>}
    </div>
  );
}

interface ChannelItemProps {
  channel: SpaceChannel;
  isActive: boolean;
  canManage: boolean;
  unreadCount?: number;
  onSelect: (channel: SpaceChannel) => void;
  onOpenSettings: (channel: SpaceChannel) => void;
}

export function ChannelItem({
  channel,
  isActive,
  canManage,
  unreadCount = 0,
  onSelect,
  onOpenSettings,
}: ChannelItemProps) {
  const activeVoice = useSpacesStore((s) => s.activeVoice);
  const participants = useSpacesStore((s) => s.participantsByChannel[channel.id] || []);
  const isVoiceConnectedHere = activeVoice?.channelId === channel.id;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
          isActive || isVoiceConnectedHere
            ? 'bg-accent text-accent-foreground font-medium'
            : unreadCount > 0
            ? 'text-foreground font-medium hover:bg-accent/50'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(channel)}
          data-testid={`channel-item-${channel.name}`}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
        >
          {channel.kind === 'text' ? (
            <Hash className="w-4 h-4 shrink-0 text-muted-foreground" />
          ) : (
            <Volume2
              className={cn(
                'w-4 h-4 shrink-0',
                isVoiceConnectedHere ? 'text-emerald-500' : 'text-muted-foreground'
              )}
            />
          )}
          <span className="truncate">{channel.name}</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {unreadCount > 0 && (
            <span className="min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {channel.kind === 'voice' && participants.length > 0 && (
            <span className="text-[10px] text-emerald-600 font-medium px-1">
              {participants.length} connected
            </span>
          )}

          {canManage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings(channel);
              }}
              aria-label={`Channel settings for ${channel.name}`}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground transition-opacity"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Show connected voice participants cleanly beneath voice channel */}
      {channel.kind === 'voice' && participants.length > 0 && (
        <div className="space-y-0.5 py-0.5">
          {participants.map((p) => (
            <VoiceParticipantMiniRow
              key={p.identity}
              userId={p.identity}
              isSpeaking={p.isSpeaking}
              isMuted={p.isMuted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
