'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import type { ChatMessage } from '@/lib/chat-types';
import { MessageStatusIcon } from './message-status';
import { UserPopover } from '@/components/users/user-popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { RotateCcw, Trash2, Pencil, Star, Copy, Loader2 } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';
import { chatApi } from '@/lib/chat-api';

interface MessageRowProps {
  message: ChatMessage;
  isSelf: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  onRetry?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => Promise<void> | void;
}

export function MessageRow({
  message,
  isSelf,
  showAvatar = true,
  showSenderName = false,
  onRetry,
  onDelete,
}: MessageRowProps) {
  const { data: sender } = useUser(!isSelf ? message.senderId : undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setEditingMessage, starredMessageIds, starMessageId, unstarMessageId } = useChatStore();
  const isStarred = Boolean(message.id && starredMessageIds.has(message.id));

  const time = message.createdAt ? format(new Date(message.createdAt), 'h:mm a') : '';
  const senderName = sender?.name || sender?.username || 'User';

  const handleCopy = async () => {
    if (!message.body) return;
    try {
      await navigator.clipboard.writeText(message.body);
      toast({
        title: 'Copied to clipboard',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not copy to clipboard',
      });
    }
  };

  const handleToggleStar = async () => {
    if (!message.id || !message.conversationId) return;
    try {
      if (isStarred) {
        unstarMessageId(message.id);
        await chatApi.unstarMessage(message.conversationId, message.id);
      } else {
        starMessageId(message.id);
        await chatApi.starMessage(message.conversationId, message.id);
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update star',
        description: err instanceof Error ? err.message : 'Action failed',
      });
    }
  };

  const handleEdit = () => {
    setEditingMessage(message);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || !message.id) return;
    try {
      setIsDeleting(true);
      await onDelete(message.id);
      setShowDeleteDialog(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not delete message',
        description: err.message || 'Failed to delete message',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group flex gap-2 px-4 py-0.5 items-end max-w-full',
          isSelf ? 'justify-end' : 'justify-start'
        )}
      >
        {/* Incoming message avatar */}
        {!isSelf && (
          <div className="w-8 shrink-0">
            {showAvatar ? (
              <UserPopover userId={message.senderId}>
                <Avatar className="w-8 h-8 cursor-pointer hover:opacity-85 transition-opacity">
                  <AvatarImage src={sender?.avatarUrl || undefined} />
                  <AvatarFallback className="text-[11px] font-semibold">
                    {(senderName[0] || 'U').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </UserPopover>
            ) : (
              <div className="w-8" />
            )}
          </div>
        )}

        {/* Hover action bar (for own messages: copy, star, edit, delete; for peer: copy, star) */}
        {!message.deleted && message.id && (
          <div
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 self-center shrink-0',
              isSelf ? 'order-first mr-1' : 'order-last ml-1'
            )}
          >
            {/* Copy button */}
            {message.body && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
                onClick={handleCopy}
                aria-label="Copy message"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Star toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded-full',
                isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={handleToggleStar}
              aria-label={isStarred ? 'Unstar message' : 'Star message'}
            >
              <Star className={cn('w-3.5 h-3.5', isStarred && 'fill-amber-400')} />
            </Button>

            {/* Edit (own messages only) */}
            {isSelf && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
                onClick={handleEdit}
                aria-label="Edit message"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Delete (own messages only) */}
            {isSelf && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                onClick={() => setShowDeleteDialog(true)}
                aria-label="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Message content + meta */}
        <div
          className={cn(
            'flex flex-col max-w-[75%] sm:max-w-[65%]',
            isSelf ? 'items-end' : 'items-start'
          )}
        >
          {/* Sender name for group chats */}
          {!isSelf && showSenderName && (
            <UserPopover userId={message.senderId}>
              <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1 cursor-pointer hover:underline">
                {senderName}
              </span>
            </UserPopover>
          )}

          {message.deleted ? (
            <div
              className={cn(
                'relative px-3.5 py-1.5 rounded-2xl text-xs italic text-muted-foreground bg-muted/40 border border-dashed border-border/70 select-none flex items-center gap-1.5',
                isSelf ? 'rounded-br-xs' : 'rounded-bl-xs'
              )}
            >
              <span>Message deleted</span>
              <span className="text-[10px] not-italic text-muted-foreground/60">{time}</span>
            </div>
          ) : (
            <div
              className={cn(
                'relative px-3.5 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap leading-relaxed shadow-sm',
                isSelf
                  ? 'bg-primary text-primary-foreground rounded-br-xs'
                  : 'bg-muted text-foreground rounded-bl-xs'
              )}
            >
              {message.body}

              {/* Timestamp & Status footer */}
              <div
                className={cn(
                  'flex items-center gap-1 justify-end mt-1 text-[10px] select-none',
                  isSelf ? 'text-primary-foreground/75' : 'text-muted-foreground'
                )}
              >
                {isStarred && (
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" aria-label="Starred" />
                )}
                {message.editedAt && (
                  <span className="text-[10px] opacity-80">(edited)</span>
                )}
                <span>{time}</span>
                {isSelf && <MessageStatusIcon status={message.status} />}
              </div>
            </div>
          )}

          {/* Retry button for failed messages */}
          {message.status === 'failed' && onRetry && (
            <button
              onClick={() => onRetry(message)}
              className="flex items-center gap-1 text-[11px] text-destructive hover:underline mt-1 mr-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Failed. Tap to retry</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>
              This message will be deleted for everyone in this conversation. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
