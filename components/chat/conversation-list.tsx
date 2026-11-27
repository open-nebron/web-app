'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConversationItem } from './conversation-item';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { MemberPicker } from '@/components/groups/member-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConversations } from '@/hooks/use-conversations';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import { useAuthStore } from '@/lib/auth-store';
import type { PublicUser } from '@/lib/chat-types';
import { MessageSquarePlus, UserPlus, Users, Search, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ConversationListProps {
  activeId?: string | null;
  onSelect?: (id: string) => void;
}

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [startDirectOpen, setStartDirectOpen] = useState(false);
  const [selectedUserForDirect, setSelectedUserForDirect] = useState<PublicUser[]>([]);
  const [isStartingDirect, setIsStartingDirect] = useState(false);

  const {
    conversations,
    isLoading,
    isError,
  } = useConversations({ kind: filter });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['conversation-requests'],
    queryFn: () => chatApi.listRequests(),
    enabled: Boolean(accessToken),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });

  // Filter conversations locally based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const peer = (c.peerProfile?.name || c.peerProfile?.username || '').toLowerCase();
      const last = (c.lastMessage?.body || '').toLowerCase();
      return name.includes(q) || peer.includes(q) || last.includes(q);
    });
  }, [conversations, searchQuery]);

  const handleSelect = (conversationId: string) => {
    if (onSelect) {
      onSelect(conversationId);
    } else {
      router.push(`/chat/${conversationId}`);
    }
  };

  const handleDirectUserSelect = async (users: PublicUser[]) => {
    if (users.length === 0) return;
    const targetUser = users[users.length - 1];

    try {
      setIsStartingDirect(true);
      const res = await chatApi.createDirect(targetUser.userId);
      if (!res.conversationId) {
        throw new Error('Could not resolve conversation ID');
      }
      setStartDirectOpen(false);
      setSelectedUserForDirect([]);
      if (res.requestState === 'pending' || res.request_state === 'pending') {
        toast({
          title: 'Message request sent',
          description: 'Message request sent — awaiting acceptance',
        });
      }
      handleSelect(res.conversationId);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not start chat',
        description: err.message || 'Failed to start direct conversation',
      });
    } finally {
      setIsStartingDirect(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header with New chat & New group buttons */}
      <div className="p-3.5 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Messages</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="New direct chat"
              onClick={() => setStartDirectOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="New group chat"
              onClick={() => setCreateGroupOpen(true)}
            >
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as 'all' | 'direct' | 'group')}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full h-7 p-0.5">
            <TabsTrigger value="all" className="text-xs py-1">
              All
            </TabsTrigger>
            <TabsTrigger value="direct" className="text-xs py-1">
              Direct
            </TabsTrigger>
            <TabsTrigger value="group" className="text-xs py-1">
              Groups
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Message Requests Banner (if any pending) */}
      {pendingRequests.length > 0 && (
        <div className="px-3 pt-2 pb-1">
          <button
            onClick={() => router.push('/chat/requests')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-xs font-semibold transition-colors border border-primary/20"
          >
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4" />
              <span>Message requests</span>
            </div>
            <Badge variant="default" className="h-5 px-2 text-[11px] rounded-full font-bold">
              {pendingRequests.length}
            </Badge>
          </button>
        </div>
      )}

      {/* Conversation List Scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="text-center py-8 px-4 text-xs text-destructive">
            Failed to load conversations. Please check your connection.
          </div>
        )}

        {!isLoading && !isError && filteredConversations.length === 0 && (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => setStartDirectOpen(true)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Start a chat
              </Button>
            )}
          </div>
        )}

        {filteredConversations.map((convo) => (
          <ConversationItem
            key={convo.id}
            conversation={convo}
            isActive={convo.id === activeId}
            onClick={() => handleSelect(convo.id)}
          />
        ))}
      </div>

      {/* New Direct Chat Dialog */}
      <Dialog open={startDirectOpen} onOpenChange={setStartDirectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a Conversation</DialogTitle>
            <DialogDescription>
              Search for a person by name or username to start chatting.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <MemberPicker
              selectedUsers={selectedUserForDirect}
              onSelectedChange={handleDirectUserSelect}
            />
          </div>
          {isStartingDirect && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Opening conversation...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
      />
    </div>
  );
}
