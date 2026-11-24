'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isToday, isYesterday, format } from 'date-fns';
import { voiceApi } from '@/lib/voice-api';
import { useAuthStore } from '@/lib/auth-store';
import { CallHistoryRow } from '@/components/call/call-history-row';
import { Phone, PhoneCall, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { CallRecord } from '@/lib/call-types';

interface DayGroup {
  dateLabel: string;
  calls: CallRecord[];
}

export default function CallsPage() {
  const currentUserId = useAuthStore((s) => s.user?.userId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['call-history'],
    queryFn: () => voiceApi.getCallHistory({ limit: 30 }),
  });

  const calls = useMemo(() => data?.data || [], [data?.data]);

  // Group calls by day
  const groupedCalls = useMemo<DayGroup[]>(() => {
    if (!calls.length) return [];

    const groups: Map<string, CallRecord[]> = new Map();

    for (const call of calls) {
      let label = 'Earlier';
      try {
        const d = new Date(call.startedAt);
        if (isToday(d)) {
          label = 'Today';
        } else if (isYesterday(d)) {
          label = 'Yesterday';
        } else {
          label = format(d, 'MMMM d, yyyy');
        }
      } catch {
        label = 'Earlier';
      }

      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)!.push(call);
    }

    return Array.from(groups.entries()).map(([dateLabel, callsInGroup]) => ({
      dateLabel,
      calls: callsInGroup,
    }));
  }, [calls]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Calls</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View your recent incoming and outgoing voice calls on nebron.
          </p>
        </div>
        <Link href="/chat">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Open Chat</span>
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {isError && (
        <div className="p-8 text-center space-y-3 border rounded-xl bg-destructive/5 text-destructive">
          <p className="text-sm font-medium">Failed to load call history.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && calls.length === 0 && (
        <div className="text-center py-24 px-4 space-y-4 border rounded-2xl bg-card">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Phone className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base">No calls yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start a real-time voice call with any contact directly from their 1:1 conversation.
            </p>
          </div>
          <Link href="/chat">
            <Button size="sm" className="gap-1.5 text-xs">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Start a conversation</span>
            </Button>
          </Link>
        </div>
      )}

      {!isLoading && !isError && groupedCalls.length > 0 && (
        <div className="space-y-6">
          {groupedCalls.map((group) => (
            <div key={group.dateLabel} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {group.dateLabel}
              </h3>
              <div className="space-y-2">
                {group.calls.map((call) => (
                  <CallHistoryRow
                    key={call.id}
                    call={call}
                    currentUserId={currentUserId || ''}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
