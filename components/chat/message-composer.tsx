'use client';

import React, { useState, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatStore } from '@/lib/chat-store';
import { useStartTyping } from '@/hooks/use-typing';

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
  const { drafts, setDraft, clearDraft } = useChatStore();
  const initialDraft = drafts[conversationId] || '';
  const [text, setText] = useState(initialDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { reportTyping, stopTypingImmediately } = useStartTyping(conversationId);

  // Sync draft when conversationId changes
  useEffect(() => {
    setText(drafts[conversationId] || '');
  }, [conversationId, drafts]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setDraft(conversationId, val);
    reportTyping();
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    const bodyToSend = text.trim();
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
    // Enter without Shift sends
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 bg-background border-t">
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
