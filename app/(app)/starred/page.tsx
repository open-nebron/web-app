'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquare, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { chatApi } from '@/lib/chat-api';
import { useChatStore } from '@/lib/chat-store';
import type { StarredMessage } from '@/lib/chat-types';
import { MessageReactions } from '@/components/chat/message-reactions';

export default function StarredMessagesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { unstarMessageId } = useChatStore();
  const [unstarringId, setUnstarringId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['starred-messages'],
    queryFn: () => chatApi.listStarred({ limit: 100 }),
  });

  const starredList = data?.data || [];

  const handleUnstar = async (e: React.MouseEvent, item: StarredMessage) => {
    e.stopPropagation();
    try {
      setUnstarringId(item.messageId);
      unstarMessageId(item.messageId);
      await chatApi.unstarMessage(item.conversationId, item.messageId);

      // Optimistically update query cache
      queryClient.setQueryData<{ data: StarredMessage[]; hasMore: boolean }>(
        ['starred-messages'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((s) => s.messageId !== item.messageId),
          };
        }
      );

      toast({
        title: 'Message unstarred',
      });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not unstar message',
        description: err instanceof Error ? err.message : 'Action failed',
      });
    } finally {
      setUnstarringId(null);
    }
  };

  const handleJumpToMessage = (item: StarredMessage) => {
    router.push(`/chat/${item.conversationId}?messageId=${item.messageId}`);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 sm:p-6 overflow-y-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3 pb-6 border-b mb-6">
        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          <Star className="h-5 w-5 fill-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Starred messages</h1>
          <p className="text-xs text-muted-foreground">
            Messages you have starred across all conversations
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-16">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p className="text-sm">Loading starred messages...</p>
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-16">
          <p className="text-destructive font-medium mb-1">Failed to load starred messages</p>
          <p className="text-xs">{(error instanceof Error ? error.message : 'Something went wrong')}</p>
        </div>
      ) : starredList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-2xl bg-muted/20 my-auto">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
            <Star className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold mb-1">No starred messages yet</h2>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            Hover over any message in your chats and click the star icon to bookmark it here for quick reference.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/chat')}
            className="text-xs"
          >
            Go to messages
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {starredList.map((item) => {
            const timeStr = item.starredAt
              ? format(new Date(item.starredAt), 'MMM d, yyyy h:mm a')
              : '';
            const msg = item.message;
            const isDeleted = msg?.deleted;

            return (
              <div
                key={`${item.conversationId}-${item.messageId}`}
                onClick={() => handleJumpToMessage(item)}
                className="group relative flex flex-col p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Conversation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{timeStr}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={unstarringId === item.messageId}
                      onClick={(e) => handleUnstar(e, item)}
                      className="h-7 w-7 text-amber-500 hover:text-destructive hover:bg-destructive/10 rounded-full"
                      aria-label="Unstar message"
                    >
                      {unstarringId === item.messageId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-foreground break-words whitespace-pre-wrap leading-relaxed">
                  {isDeleted ? (
                    <span className="italic text-muted-foreground text-xs">
                      Message deleted
                    </span>
                  ) : msg?.body ? (
                    <>
                      <div>{msg.body}</div>
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <MessageReactions
                            conversationId={item.conversationId}
                            messageId={item.messageId}
                            reactions={msg.reactions}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="italic text-muted-foreground text-xs">
                      Message preview unavailable
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-end text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Go to message</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
