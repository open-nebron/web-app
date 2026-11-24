'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { chatApi } from '@/lib/chat-api';
import type { PublicUser } from '@/lib/chat-types';
import { Search, X, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface MemberPickerProps {
  selectedUsers: PublicUser[];
  onSelectedChange: (users: PublicUser[]) => void;
  excludeUserIds?: string[];
}

export function MemberPicker({
  selectedUsers,
  onSelectedChange,
  excludeUserIds = [],
}: MemberPickerProps) {
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const users = await chatApi.searchUsers(query.trim());
        const filtered = users.filter(
          (u) =>
            u.userId !== currentUserId &&
            !excludeUserIds.includes(u.userId)
        );
        setResults(filtered);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, currentUserId, excludeUserIds]);

  const toggleUser = (user: PublicUser) => {
    const isSelected = selectedUsers.some((u) => u.userId === user.userId);
    if (isSelected) {
      onSelectedChange(selectedUsers.filter((u) => u.userId !== user.userId));
    } else {
      onSelectedChange([...selectedUsers, user]);
    }
  };

  const removeUser = (userId: string) => {
    onSelectedChange(selectedUsers.filter((u) => u.userId !== userId));
  };

  return (
    <div className="space-y-3">
      {/* Selected badges */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-md border min-h-[40px]">
          {selectedUsers.map((u) => (
            <Badge
              key={u.userId}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1 flex items-center text-xs"
            >
              <span>{u.name || u.username}</span>
              <button
                type="button"
                onClick={() => removeUser(u.userId)}
                className="hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                <span className="sr-only">Remove</span>
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 text-sm"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Results list */}
      <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border p-1 bg-background">
        {results.length === 0 && !isSearching && query.trim() !== '' && (
          <p className="text-xs text-center py-4 text-muted-foreground">
            No users found matching &quot;{query}&quot;
          </p>
        )}
        {results.length === 0 && query.trim() === '' && (
          <p className="text-xs text-center py-4 text-muted-foreground">
            Type to search for users to add
          </p>
        )}
        {results.map((user) => {
          const isSelected = selectedUsers.some((u) => u.userId === user.userId);
          const name = user.name || user.username;
          return (
            <div
              key={user.userId}
              onClick={() => toggleUser(user)}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {(name[0] || 'U').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium leading-none">{name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    @{user.username}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
