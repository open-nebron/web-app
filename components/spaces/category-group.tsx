'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { SpaceCategory, SpaceChannel } from '@/lib/spaces-api';
import { useSpacesStore } from '@/lib/spaces-store';
import { ChannelItem } from './channel-item';

interface CategoryGroupProps {
  category: SpaceCategory;
  channels: SpaceChannel[];
  activeChannelId?: string;
  canManageChannels: boolean;
  canManageRoles: boolean;
  onSelectChannel: (channel: SpaceChannel) => void;
  onAddChannel: (categoryId: string) => void;
  onOpenChannelSettings: (channel: SpaceChannel) => void;
}

export function CategoryGroup({
  category,
  channels,
  activeChannelId,
  canManageChannels,
  canManageRoles,
  onSelectChannel,
  onAddChannel,
  onOpenChannelSettings,
}: CategoryGroupProps) {
  const isCollapsed = useSpacesStore((s) => Boolean(s.collapsedCategories[category.id]));
  const toggleCategoryCollapsed = useSpacesStore((s) => s.toggleCategoryCollapsed);
  const unreadByChannel = useSpacesStore((s) => s.unreadByChannel);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <button
          type="button"
          onClick={() => toggleCategoryCollapsed(category.id)}
          className="flex items-center gap-1 hover:text-foreground transition-colors flex-1 text-left min-w-0"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 shrink-0" />
          )}
          <span className="truncate">{category.name}</span>
        </button>

        {canManageChannels && (
          <button
            type="button"
            onClick={() => onAddChannel(category.id)}
            aria-label={`Add channel to ${category.name}`}
            className="p-0.5 rounded hover:bg-accent hover:text-foreground transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="space-y-0.5 pl-1">
          {channels.map((ch) => (
            <ChannelItem
              key={ch.id}
              channel={ch}
              isActive={ch.id === activeChannelId}
              canManage={canManageChannels || canManageRoles}
              unreadCount={unreadByChannel[ch.id] || 0}
              onSelect={onSelectChannel}
              onOpenSettings={onOpenChannelSettings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
