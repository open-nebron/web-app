'use client';

import * as React from 'react';
import { SettingsSection } from '@/components/settings/settings-section';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Sparkles, Volume2, MessageSquare, PhoneCall, Users } from 'lucide-react';

export default function NotificationsSettingsPage() {
  const notificationOptions = [
    {
      title: 'Message Notifications',
      description: 'Receive audio and visual alerts when new direct messages arrive',
      icon: MessageSquare,
      defaultChecked: true,
    },
    {
      title: 'Incoming Call Ringtone',
      description: 'Play ringtone audio through speakers for incoming voice calls',
      icon: PhoneCall,
      defaultChecked: true,
    },
    {
      title: 'Group Chat Mentions',
      description: 'Only play notification sounds when explicitly mentioned in groups',
      icon: Users,
      defaultChecked: false,
    },
    {
      title: 'In-App Sound Effects',
      description: 'Play subtle sounds on sending messages and call state changes',
      icon: Volume2,
      defaultChecked: true,
    },
  ];

  return (
    <SettingsSection
      title="Notifications"
      description="Manage how and when nebron alerts you to incoming messages and calls."
    >
      {/* Coming in v2 Banner */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              Notification Preferences
            </h4>
            <Badge variant="outline" className="text-[10px] gap-1 bg-background text-primary border-primary/30">
              <Sparkles className="w-3 h-3 text-primary" /> Coming in v2
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In Nebron Web v1, incoming calls ring automatically in the browser while connected. Granular push notification and sound toggles will activate in v2 with the notifications service.
          </p>
        </div>
      </div>

      {/* Notification Options (Disabled) */}
      <Card className="opacity-75">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alerts & Sounds</CardTitle>
          <CardDescription>
            These preferences will sync across your devices in v2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <div
                key={opt.title}
                className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/10 cursor-not-allowed select-none"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-8 h-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-sm font-medium text-foreground">{opt.title}</h5>
                    <p className="text-xs text-muted-foreground truncate">{opt.description}</p>
                  </div>
                </div>

                <div className="w-11 h-6 bg-muted rounded-full flex items-center px-1 shrink-0 opacity-60">
                  <div className={`w-4 h-4 rounded-full bg-muted-foreground/60 ${opt.defaultChecked ? 'ml-auto' : ''}`} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
