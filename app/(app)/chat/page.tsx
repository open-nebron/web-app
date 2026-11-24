'use client';

import React from 'react';
import { ConversationList } from '@/components/chat/conversation-list';
import { EmptyChatState } from '@/components/chat/empty-state';

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen w-full overflow-hidden bg-background">
      {/* Sidebar: Full width on mobile, 340px-380px on desktop */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 h-full">
        <ConversationList />
      </div>

      {/* Desktop empty placeholder */}
      <div className="hidden md:flex flex-1 h-full">
        <EmptyChatState
          title="Select a conversation"
          description="Choose a conversation from the list to start messaging, or create a new chat."
        />
      </div>
    </div>
  );
}
