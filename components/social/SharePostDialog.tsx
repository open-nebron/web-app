'use client';

import React, { useState, useMemo } from 'react';
import type { Post } from '@/lib/types';
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
import { Search, Loader2, Users, Check, Share2 } from 'lucide-react';
import { cn, normalizeStorageUrl } from '@/lib/utils';

interface SharePostDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharePostDialog({ post, open, onOpenChange }: SharePostDialogProps) {
  const { conversations, isLoading } = useConversations();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
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

  const handleShare = async () => {
    if (!selectedConvId || !post?.id || isSending) return;

    try {
      setIsSending(true);
      const postUrl = `${window.location.origin}/posts/${post.id}`;
      const messageBody = `Check out this post: ${postUrl}`;

      await chatApi.sendMessageHttp(selectedConvId, messageBody);

      await queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });

      toast({
        title: 'Post shared to chat',
        description: 'Message sent successfully.',
      });
      onOpenChange(false);
      setSelectedConvId(null);
      setSearch('');
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not share post',
        description: err instanceof Error ? err.message : 'Action failed',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!post) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSending) {
          onOpenChange(next);
          if (!next) {
            setSelectedConvId(null);
            setSearch('');
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Post
          </DialogTitle>
          <DialogDescription>
            Choose a conversation to send this post to.
          </DialogDescription>
        </DialogHeader>

        {/* Post Preview */}
        <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-1">
          <div className="font-semibold text-foreground">@{post.author.username}</div>
          <p className="text-muted-foreground line-clamp-2">{post.body}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Conversation List */}
        <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-border/30">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading chats...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = selectedConvId === c.id;
              const isGroup = c.kind === 'group';
              const displayName = isGroup
                ? c.name || 'Group Chat'
                : c.peerProfile?.name || c.peerProfile?.username || 'Direct Message';
              const avatar = isGroup ? null : c.peerProfile?.avatarUrl;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedConvId(c.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9 shrink-0">
                      {avatar ? (
                        <AvatarImage src={normalizeStorageUrl(avatar)} />
                      ) : null}
                      <AvatarFallback>
                        {isGroup ? (
                          <Users className="w-4 h-4" />
                        ) : (
                          displayName.slice(0, 2).toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {isGroup ? 'Group' : `@${c.peerProfile?.username || 'user'}`}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={!selectedConvId || isSending}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
