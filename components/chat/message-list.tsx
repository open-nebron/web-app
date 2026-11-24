'use client';

import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import type { ChatMessage } from '@/lib/chat-types';
import { MessageGroup } from './message-group';
import { DayDivider } from './day-divider';
import { NewMessageButton } from './new-message-button';
import { Loader2 } from 'lucide-react';
import { isSameDay } from 'date-fns';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string | null;
  isGroupChat?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRetry?: (message: ChatMessage) => void;
  onMarkRead?: (messageId: string) => void;
  onDelete?: (messageId: string) => Promise<void> | void;
}

interface ClusteredGroup {
  date: Date;
  senderId: string;
  isSelf: boolean;
  messages: ChatMessage[];
}

export function MessageList({
  messages,
  currentUserId,
  isGroupChat = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onRetry,
  onMarkRead,
  onDelete,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);
  const prevMessagesLengthRef = useRef(messages.length);
  const previousScrollHeightRef = useRef<number>(0);

  // Group messages by Day and consecutive sender (< 5 min)
  const clusters: Array<
    | { type: 'day'; date: Date; key: string }
    | { type: 'group'; group: ClusteredGroup; key: string }
  > = [];

  let currentCluster: ClusteredGroup | null = null;
  let lastDate: Date | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.createdAt);
    const isSelf = Boolean(currentUserId && msg.senderId === currentUserId);

    // Check if new day
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      if (currentCluster) {
        clusters.push({
          type: 'group',
          group: currentCluster,
          key: `group-${currentCluster.messages[0].id || i}`,
        });
        currentCluster = null;
      }
      clusters.push({
        type: 'day',
        date: msgDate,
        key: `day-${msgDate.toISOString()}`,
      });
      lastDate = msgDate;
    }

    // Check if continuing same group: same sender and within 5 min
    const canGroup =
      currentCluster &&
      currentCluster.senderId === msg.senderId &&
      Math.abs(
        msgDate.getTime() -
          new Date(
            currentCluster.messages[currentCluster.messages.length - 1].createdAt
          ).getTime()
      ) <
        5 * 60 * 1000;

    if (canGroup && currentCluster) {
      currentCluster.messages.push(msg);
    } else {
      if (currentCluster) {
        clusters.push({
          type: 'group',
          group: currentCluster,
          key: `group-${currentCluster.messages[0].id || i}`,
        });
      }
      currentCluster = {
        date: msgDate,
        senderId: msg.senderId,
        isSelf,
        messages: [msg],
      };
    }
  }

  if (currentCluster) {
    clusters.push({
      type: 'group',
      group: currentCluster,
      key: `group-${currentCluster.messages[0].id || 'last'}`,
    });
  }

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
    setShowScrollBottom(false);
    setUnreadWhileScrolled(0);
  };

  // Initial scroll to bottom on mount
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  // Handle new incoming messages
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const container = containerRef.current;
      if (!container) return;

      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 200;

      if (isNearBottom) {
        scrollToBottom('smooth');
        const latest = messages[messages.length - 1];
        if (latest && latest.senderId !== currentUserId && onMarkRead) {
          onMarkRead(latest.id);
        }
      } else {
        setShowScrollBottom(true);
        setUnreadWhileScrolled((prev) => prev + 1);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUserId, onMarkRead]);

  // Maintain scroll position when older messages load at top
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !previousScrollHeightRef.current) return;

    if (container.scrollHeight > previousScrollHeightRef.current) {
      const heightDiff = container.scrollHeight - previousScrollHeightRef.current;
      container.scrollTop += heightDiff;
    }
    previousScrollHeightRef.current = 0;
  }, [messages.length]);

  // Handle scroll events (fetch older messages and update scroll button)
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (distanceFromBottom > 200) {
      setShowScrollBottom(true);
    } else {
      setShowScrollBottom(false);
      setUnreadWhileScrolled(0);
    }

    // Scroll near top: load more
    if (container.scrollTop < 80 && hasMore && !isLoadingMore && onLoadMore) {
      previousScrollHeightRef.current = container.scrollHeight;
      onLoadMore();
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col bg-background/50">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-4 space-y-2 select-text"
      >
        {/* Loading older indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Message clusters */}
        {clusters.map((item) => {
          if (item.type === 'day') {
            return <DayDivider key={item.key} date={item.date} />;
          }
          return (
            <MessageGroup
              key={item.key}
              messages={item.group.messages}
              isSelf={item.group.isSelf}
              isGroupChat={isGroupChat}
              onRetry={onRetry}
              onDelete={onDelete}
            />
          );
        })}

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Floating scroll to bottom button */}
      {showScrollBottom && (
        <NewMessageButton
          onClick={() => scrollToBottom('smooth')}
          unreadCount={unreadWhileScrolled}
        />
      )}
    </div>
  );
}
