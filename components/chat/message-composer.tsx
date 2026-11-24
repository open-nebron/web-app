'use client';

import React, { useState, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, Paperclip, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatStore } from '@/lib/chat-store';
import { useStartTyping } from '@/hooks/use-typing';
import { chatApi } from '@/lib/chat-api';
import { toast } from '@/components/ui/use-toast';

interface MessageComposerProps {
  conversationId: string;
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageComposer({
  conversationId,
  onSend,
  disabled = false,
  placeholder,
}: MessageComposerProps) {
  const { drafts, setDraft, clearDraft, editingMessage, clearEditingMessage } = useChatStore();
  const initialDraft = drafts[conversationId] || '';
  const [text, setText] = useState(initialDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { reportTyping, stopTypingImmediately } = useStartTyping(conversationId);

  const isEditing = Boolean(editingMessage && editingMessage.conversationId === conversationId);

  // Sync draft or editing message when conversationId or editingMessage changes
  useEffect(() => {
    if (editingMessage && editingMessage.conversationId === conversationId) {
      setText(editingMessage.body || '');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } else {
      setText(drafts[conversationId] || '');
    }
  }, [conversationId, drafts, editingMessage]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (!isEditing) {
      setDraft(conversationId, val);
      reportTyping();
    }
  };

  const handleCancelEdit = () => {
    clearEditingMessage();
    setText(drafts[conversationId] || '');
  };

  const handleSend = async () => {
    if (!text.trim() || disabled) return;
    const bodyToSend = text.trim();

    if (isEditing && editingMessage) {
      const msgId = editingMessage.id;
      clearEditingMessage();
      setText('');
      clearDraft(conversationId);
      stopTypingImmediately();

      try {
        await chatApi.editMessage(conversationId, msgId, bodyToSend);
      } catch (err: unknown) {
        toast({
          variant: 'destructive',
          title: 'Could not edit message',
          description: err instanceof Error ? err.message : 'Failed to edit message',
        });
      }
      return;
    }

    setText('');
    clearDraft(conversationId);
    stopTypingImmediately();
    onSend(bodyToSend);

    // Keep focus
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      handleCancelEdit();
      return;
    }

    // Enter without Shift sends
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 bg-background border-t">
      {isEditing && (
        <div className="flex items-center justify-between pb-1.5 px-2 text-xs text-muted-foreground mb-1">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Pencil className="w-3.5 h-3.5 text-primary" />
            <span>Editing message</span>
          </div>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="hover:text-foreground text-muted-foreground p-0.5 rounded transition-colors"
            aria-label="Cancel edit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-muted/50 rounded-2xl border px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        {/* Attachment placeholder button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled
                className="text-muted-foreground/60 hover:text-muted-foreground p-1.5 rounded-full cursor-not-allowed mb-0.5 shrink-0"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>File attachments coming in v2</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Textarea */}
        <TextareaAutosize
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (disabled
              ? 'You blocked this contact. Unblock to send messages.'
              : 'Type a message...')
          }
          disabled={disabled}
          minRows={1}
          maxRows={6}
          className="flex-1 bg-transparent border-0 resize-none text-sm placeholder:text-muted-foreground focus:outline-none py-1.5 max-h-32 overflow-y-auto leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
        />

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          disabled={!text.trim() || disabled}
          onClick={handleSend}
          className="h-8 w-8 rounded-full shrink-0 mb-0.5"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
