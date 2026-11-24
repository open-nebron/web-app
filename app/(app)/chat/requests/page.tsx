'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { chatApi } from '@/lib/chat-api';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Inbox, Loader2, MessageSquare } from 'lucide-react';
import type { Conversation } from '@/lib/chat-types';

function MessageRequestRow({
  request,
  onClick,
}: {
  request: Conversation;
  onClick: () => void;
}) {
  const senderId = request.senderId || request.peerUserId;
  const { data: user } = useUser(senderId);

  const title = user?.name || user?.username || 'Unknown User';
  const username = user?.username ? `@${user.username}` : '';
  const initial = (title[0] || 'U').toUpperCase();

  let relativeTime = '';
  if (request.lastMessageAt || request.createdAt) {
    try {
      const d = new Date(request.lastMessageAt || request.createdAt!);
      relativeTime = formatDistanceToNowStrict(d, { addSuffix: true });
    } catch {
      relativeTime = '';
    }
  }

  const snippet = request.lastMessage?.body || 'Sent you a message request';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/40 hover:border-border hover:bg-muted/40 cursor-pointer transition-all bg-card"
    >
      <Avatar className="w-12 h-12 border border-border/40 shrink-0">
        <AvatarImage src={user?.avatarUrl || undefined} alt={title} />
        <AvatarFallback className="text-sm font-semibold">{initial}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">{title}</span>
            {username && (
              <span className="text-xs text-muted-foreground truncate">{username}</span>
            )}
          </div>
          {relativeTime && (
            <span className="text-[11px] text-muted-foreground shrink-0">{relativeTime}</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground truncate line-clamp-1">{snippet}</p>
      </div>
    </div>
  );
}

export default function MessageRequestsPage() {
  const router = useRouter();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['conversation-requests'],
    queryFn: () => chatApi.listRequests(),
    staleTime: 10 * 1000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b px-4 sm:px-6 flex items-center justify-between bg-background/95 backdrop-blur shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/chat')}
            aria-label="Back to messages"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              Message requests
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              People you don&apos;t know who want to message you
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        {isLoading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!isLoading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-sm mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60 border border-border/50">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">No message requests</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You don&apos;t have any pending message requests right now. When people you don&apos;t already have conversations with message you, they will appear here.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => router.push('/chat')}
            >
              Back to messages
            </Button>
          </div>
        )}

        {!isLoading && requests.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{requests.length} pending {requests.length === 1 ? 'request' : 'requests'}</span>
              <span>Select a request to review</span>
            </div>

            <div className="space-y-2">
              {requests.map((req) => (
                <MessageRequestRow
                  key={req.id}
                  request={req}
                  onClick={() => router.push(`/chat/${req.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
