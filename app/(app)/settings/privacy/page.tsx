'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsSection } from '@/components/settings/settings-section';
import { PolicyRadioGroup } from '@/components/settings/policy-radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import { UserX, Sparkles, ChevronRight, Check } from 'lucide-react';

export default function PrivacySettingsPage() {
  const { data: blockedData } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => chatApi.getBlockedUsers(),
    staleTime: 60 * 1000,
  });

  const blockedCount = blockedData?.blocked?.length ?? 0;

  return (
    <SettingsSection
      title="Privacy & Safety"
      description="Manage direct message requests, safety policies, and visibility settings."
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

      {/* Read Receipts (v2 Placeholder) */}
      <Card className="opacity-80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Read Receipts</CardTitle>
              <CardDescription>
                Let contacts see when you have read their messages.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
              <Sparkles className="w-3 h-3 text-primary" /> Coming in v2
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
            <div>
              <p className="text-sm font-medium text-foreground">Send Read Receipts</p>
              <p className="text-xs text-muted-foreground">Always active in v1 for 1:1 chats</p>
            </div>
            <div className="w-11 h-6 bg-primary/40 rounded-full flex items-center px-1 cursor-not-allowed">
              <div className="w-4 h-4 rounded-full bg-white ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Online Visibility & Last Seen (v2 Placeholders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="opacity-80">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Online Status</h4>
              <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
                <Sparkles className="w-3 h-3 text-primary" /> v2
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Control who can see your active green presence dot across conversation lists.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-80">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Last Seen</h4>
              <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
                <Sparkles className="w-3 h-3 text-primary" /> v2
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hide your last active timestamp from non-contacts or specific users.
            </p>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
