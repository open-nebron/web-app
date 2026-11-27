'use client';

import * as React from 'react';
import type { Post, ShareContentType } from '@/lib/types';
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
import { useShareContent } from '@/hooks/useSaved';
import { chatApi } from '@/lib/chat-api';
import { buildSocialShareUrls, getFallbackShareUrl } from '@/lib/share-utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Loader2,
  Users,
  Check,
  Share2,
  Copy,
  MessageCircle,
  Send,
  ExternalLink,
} from 'lucide-react';
import { cn, normalizeStorageUrl } from '@/lib/utils';

export interface ShareDialogProps {
  contentType: ShareContentType;
  contentId: string;
  parentId?: string;
  parentType?: 'post' | 'reel';
  previewText?: string;
  post?: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({
  contentType,
  contentId,
  parentId,
  parentType,
  previewText,
  post,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading: isLoadingConvs } = useConversations();
  const shareMutation = useShareContent();

  const [search, setSearch] = React.useState('');
  const [selectedConvId, setSelectedConvId] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [canonicalUrl, setCanonicalUrl] = React.useState(() =>
    getFallbackShareUrl(contentType, contentId, { parentId, parentType })
  );

  React.useEffect(() => {
    if (open && contentId) {
      setCanonicalUrl(getFallbackShareUrl(contentType, contentId, { parentId, parentType }));
      setCopied(false);
    }
  }, [open, contentType, contentId, parentId, parentType]);

  const filteredConversations = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = c.name?.toLowerCase() || '';
      const peerName = c.peerProfile?.name?.toLowerCase() || '';
      const peerUsername = c.peerProfile?.username?.toLowerCase() || '';
      return name.includes(q) || peerName.includes(q) || peerUsername.includes(q);
    });
  }, [conversations, search]);

  const socialUrls = React.useMemo(
    () => buildSocialShareUrls(canonicalUrl, previewText ?? post?.body),
    [canonicalUrl, previewText, post?.body]
  );

  const ensureTrackedUrl = async (): Promise<string> => {
    if (!contentId) return canonicalUrl;
    try {
      const res = await shareMutation.mutateAsync({ contentType, contentId });
      if (res?.url) {
        setCanonicalUrl(res.url);
        return res.url;
      }
    } catch {
      // Fallback safely to client canonical URL if offline/rate-limited
    }
    return canonicalUrl;
  };

  const handleCopyLink = async () => {
    if (shareMutation.isPending) return;
    const urlToCopy = await ensureTrackedUrl();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(urlToCopy);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Link ready',
        description: urlToCopy,
      });
    }
  };

  const handleSocialClick = () => {
    if (!contentId || shareMutation.isPending) return;
    shareMutation.mutate({ contentType, contentId });
  };

  const handleShareToChat = async () => {
    if (!selectedConvId || !contentId || isSending) return;

    try {
      setIsSending(true);
      const trackedUrl = await ensureTrackedUrl();
      const label =
        contentType === 'post'
          ? 'post'
          : contentType === 'reel'
          ? 'reel'
          : 'comment';
      const messageBody = `Check out this ${label}: ${trackedUrl}`;

      await chatApi.sendMessageHttp(selectedConvId, messageBody);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      toast({
        title: 'Shared to chat',
        description: `The ${label} has been sent to the conversation.`,
      });
      setSelectedConvId(null);
      setSearch('');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not share',
        description: error?.message || 'Failed to send message.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setSelectedConvId(null);
      setSearch('');
      setCopied(false);
    }
    onOpenChange(val);
  };

  const contentTitle =
    contentType === 'reel' ? 'Share Reel' : contentType === 'comment' ? 'Share Comment' : 'Share Post';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="share-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            {contentTitle}
          </DialogTitle>
          <DialogDescription>
            Copy the link, share to social apps, or send directly to a Nebron chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canonical URL & Copy */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Link</label>
            <div className="flex items-center gap-2">
              <Input
                value={canonicalUrl}
                readOnly
                data-testid="share-link-input"
                className="text-xs font-mono bg-muted/40"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant={copied ? 'secondary' : 'default'}
                size="sm"
                onClick={handleCopyLink}
                data-testid="share-copy-link-btn"
                className="shrink-0 gap-1.5"
              >
                {shareMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>

          {/* External deep links */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Share externally</label>
            <div className="grid grid-cols-3 gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <a
                  href={socialUrls.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSocialClick}
                  data-testid="share-whatsapp-link"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <a
                  href={socialUrls.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSocialClick}
                  data-testid="share-telegram-link"
                >
                  <Send className="w-3.5 h-3.5 text-sky-500" />
                  Telegram
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <a
                  href={socialUrls.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSocialClick}
                  data-testid="share-twitter-link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Twitter / X
                </a>
              </Button>
            </div>
          </div>

          {/* Share to Nebron Chat */}
          <div className="space-y-2 pt-2 border-t">
            <label className="text-xs font-medium text-muted-foreground">Send to chat</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search people or groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1.5 bg-muted/20">
              {isLoadingConvs ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No conversations found.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isGroup = conv.kind === 'group';
                  const displayName = isGroup
                    ? conv.name || 'Unnamed Group'
                    : conv.peerProfile?.name || conv.peerProfile?.username || 'Direct Message';
                  const avatarUrl = isGroup ? undefined : conv.peerProfile?.avatarUrl;
                  const initials = displayName.slice(0, 2).toUpperCase();
                  const isSelected = selectedConvId === conv.id;

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedConvId(conv.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors',
                        isSelected
                          ? 'bg-primary/15 border border-primary/40'
                          : 'hover:bg-accent/60 border border-transparent'
                      )}
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage
                          src={avatarUrl ? normalizeStorageUrl(avatarUrl) : undefined}
                          alt={displayName}
                        />
                        <AvatarFallback>
                          {isGroup ? <Users className="w-4 h-4 text-muted-foreground" /> : initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        {!isGroup && conv.peerProfile?.username && (
                          <p className="text-xs text-muted-foreground truncate">
                            @{conv.peerProfile.username}
                          </p>
                        )}
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Close
          </Button>
          <Button
            onClick={handleShareToChat}
            disabled={!selectedConvId || isSending}
            data-testid="share-send-to-chat-btn"
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send to Chat'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
