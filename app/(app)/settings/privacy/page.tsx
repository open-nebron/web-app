'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsSection } from '@/components/settings/settings-section';
import { PolicyRadioGroup } from '@/components/settings/policy-radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import { coreApi } from '@/lib/api';
import type { PrivacyVisibility, UserPrivacy } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';
import { UserX, ChevronRight, Check, Eye, Clock, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VISIBILITY_OPTIONS: { value: PrivacyVisibility; title: string; description: string }[] = [
  {
    value: 'everyone',
    title: 'Everyone',
    description: 'Visible to everyone on Nebron.',
  },
  {
    value: 'contacts',
    title: 'Contacts',
    description: 'Visible only to users you have ongoing conversations with.',
  },
  {
    value: 'nobody',
    title: 'Nobody',
    description: 'Hidden from everyone. Nobody can see this status.',
  },
];

export default function PrivacySettingsPage() {
  const queryClient = useQueryClient();

  const { data: blockedData } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => chatApi.getBlockedUsers(),
    staleTime: 60 * 1000,
  });

  const { data: privacy, isLoading: isPrivacyLoading } = useQuery<UserPrivacy>({
    queryKey: ['privacy-settings'],
    queryFn: () => coreApi.getPrivacy(),
    staleTime: 60 * 1000,
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: (patch: Partial<UserPrivacy>) => coreApi.updatePrivacy(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['privacy-settings'], updated);
      toast({
        title: 'Privacy settings updated',
        description: 'Your privacy preferences have been saved.',
      });
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Failed to update settings';
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: errMsg,
      });
    },
  });

  const blockedCount = blockedData?.blocked?.length ?? 0;

  const currentOnline = privacy?.showOnlineStatus || 'everyone';
  const currentLastSeen = privacy?.showLastSeen || 'contacts';
  const currentReadReceipts = privacy?.sendReadReceipts ?? true;

  const handleOnlineChange = (value: PrivacyVisibility) => {
    if (value === currentOnline) return;
    updatePrivacyMutation.mutate({ showOnlineStatus: value });
  };

  const handleLastSeenChange = (value: PrivacyVisibility) => {
    if (value === currentLastSeen) return;
    updatePrivacyMutation.mutate({ showLastSeen: value });
  };

  const handleReadReceiptsToggle = () => {
    updatePrivacyMutation.mutate({ sendReadReceipts: !currentReadReceipts });
  };

  return (
    <SettingsSection
      title="Privacy & Safety"
      description="Manage direct message requests, visibility, and activity indicators."
    >
      {/* Message Requests Policy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Direct Message Requests</CardTitle>
          <CardDescription>
            Choose who can reach out to you directly in chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PolicyRadioGroup />
        </CardContent>
      </Card>

      {/* Blocked Users Link Card */}
      <Card>
        <CardContent className="p-5">
          <Link
            href="/settings/blocked"
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  Blocked Users
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {blockedCount > 0
                    ? `${blockedCount} user${blockedCount === 1 ? '' : 's'} currently blocked`
                    : 'Manage contacts you have blocked'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {blockedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {blockedCount}
                </Badge>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Online Status Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Online Status
              </CardTitle>
              <CardDescription>
                Control who can see your active presence status across conversations.
              </CardDescription>
            </div>
            {isPrivacyLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const isSelected = currentOnline === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleOnlineChange(opt.value)}
                disabled={updatePrivacyMutation.isPending}
                className={cn(
                  'w-full flex items-start justify-between p-3.5 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/60 hover:bg-muted/40 hover:border-border'
                )}
              >
                <div className="pr-3">
                  <p className="text-sm font-medium text-foreground">{opt.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Last Seen Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Last Seen
              </CardTitle>
              <CardDescription>
                Choose who can see when you were last active on Nebron.
              </CardDescription>
            </div>
            {isPrivacyLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const isSelected = currentLastSeen === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleLastSeenChange(opt.value)}
                disabled={updatePrivacyMutation.isPending}
                className={cn(
                  'w-full flex items-start justify-between p-3.5 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/60 hover:bg-muted/40 hover:border-border'
                )}
              >
                <div className="pr-3">
                  <p className="text-sm font-medium text-foreground">{opt.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Read Receipts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-primary" /> Read Receipts
              </CardTitle>
              <CardDescription>
                Let others know when you have read their messages.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
            <div className="pr-4">
              <p className="text-sm font-medium text-foreground">Send Read Receipts</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                If disabled, contacts will not see blue double-ticks when you read their messages.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={currentReadReceipts}
              onClick={handleReadReceiptsToggle}
              disabled={updatePrivacyMutation.isPending}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0',
                currentReadReceipts ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            >
              <span
                className={cn(
                  'block w-4 h-4 rounded-full bg-white transition-transform absolute top-1',
                  currentReadReceipts ? 'right-1' : 'left-1'
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Product Analytics & Telemetry Privacy Notice */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Product Analytics & Telemetry
          </CardTitle>
          <CardDescription>
            Transparency regarding client telemetry and analytics collection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold bg-background">
                PostHog Analytics
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">Privacy Guaranteed</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use PostHog for product analytics to improve the app, detect crashes, and monitor platform performance.
              Nebron strictly respects your privacy: <strong>no message bodies, post bodies, or comment contents are ever collected or transmitted</strong>.
              Only high-level feature engagement metadata (such as timestamps, error codes, and session interactions) is tracked.
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
