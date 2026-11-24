'use client';

import React, { useState, useMemo } from 'react';
import type { ChatMessage, Conversation } from '@/lib/chat-types';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { useConversations } from '@/hooks/use-conversations';
import { chatApi } from '@/lib/chat-api';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Loader2, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage | null;
}

export function ForwardDialog({ open, onOpenChange, message }: ForwardDialogProps) {
  const { conversations, isLoading } = useConversations();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const name = c.name?.toLowerCase() || '';
      const peerName = c.peerProfile?.name?.toLowerCase() || '';
      const peerUsername = c.peerProfile?.username?.toLowerCase() || '';
      return name.includes(q) || peerName.includes(q) || peerUsername.includes(q);
    });
  }, [conversations, search]);

  const handleForward = async () => {
    if (!selectedConvId || !message?.id || isSending) return;

    try {
      setIsSending(true);
      await chatApi.sendMessageHttp(
        selectedConvId,
        comment.trim(),
        undefined,
        undefined,
        {
          messageId: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
        }
      );

      // Invalidate target conversation messages so it reflects immediately
      await queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });

      toast({
        title: 'Message forwarded',
      });
      onOpenChange(false);
      setSelectedConvId(null);
      setComment('');
      setSearch('');
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not forward message',
        description: err instanceof Error ? err.message : 'Action failed',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSending) {
          onOpenChange(next);
          if (!next) {
            setSelectedConvId(null);
            setComment('');
            setSearch('');
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
          <DialogDescription>
            Choose a conversation to forward this message to.
          </DialogDescription>
        </DialogHeader>

        {/* Message preview snippet */}
        {message && (
          <div className="bg-muted/40 p-2.5 rounded-lg border text-xs text-muted-foreground italic line-clamp-2">
            &ldquo;{message.body || '(empty message)'}&rdquo;
          </div>
        )}

        {/* Conversation search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Conversation list */}
        <div className="max-h-52 overflow-y-auto space-y-1 border rounded-lg p-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((c: Conversation) => {
              const isSelected = selectedConvId === c.id;
              const title =
                c.kind === 'group'
                  ? c.name || 'Group'
                  : c.peerProfile?.name || c.peerProfile?.username || 'Direct Message';

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedConvId(c.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-2 rounded-md text-left transition-colors text-sm',
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-7 h-7 shrink-0">
                      {c.kind === 'group' ? (
                        <AvatarFallback>
                          <Users className="w-3.5 h-3.5" />
                        </AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={c.peerProfile?.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(title[0] || 'U').toUpperCase()}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <span className="truncate">{title}</span>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>

        {/* Optional comment */}
        <div>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add an optional comment..."
            className="text-sm h-9"
            maxLength={4000}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleForward}
            disabled={!selectedConvId || isSending}
            className="gap-2"
          >
            {isSending && <Loader2 className="w-4 h-4 animate-spin" />}
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
