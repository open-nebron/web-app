'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Laptop,
  Smartphone,
  Tablet,
  LogOut,
  RefreshCw,
  Loader2,
  Shield,
  ShieldAlert,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';
import { SettingsSection } from '@/components/settings/settings-section';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api';
import type { SessionItem } from '@/lib/types';
import { cn } from '@/lib/utils';

function getDeviceDetails(session: SessionItem) {
  const ua = session.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let deviceType = 'desktop';

  if (typeof ua === 'object' && ua !== null) {
    browser = ua.browser || browser;
    os = ua.os || os;
    deviceType = (ua.deviceType || 'desktop').toLowerCase();
  } else if (typeof ua === 'string' && ua.length > 0) {
    browser = ua;
  }

  let Icon = Laptop;
  if (deviceType === 'mobile' || deviceType === 'smartphone') {
    Icon = Smartphone;
  } else if (deviceType === 'tablet') {
    Icon = Tablet;
  }

  return { browser, os, deviceType, Icon };
}

function formatRelativeTime(isoDate?: string | null, isCurrent?: boolean): string {
  if (isCurrent) return 'Active now';
  if (!isoDate) return 'Active recently';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'Active recently';
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Active now';
    return `Last active ${formatDistanceToNow(date, { addSuffix: true })}`;
  } catch {
    return 'Active recently';
  }
}

export default function SessionsSettingsPage() {
  const queryClient = useQueryClient();
  const [sessionToRevoke, setSessionToRevoke] = React.useState<SessionItem | null>(null);
  const [isRevokeAllOpen, setIsRevokeAllOpen] = React.useState(false);

  // Auto-refresh sessions every 30 seconds while page is visible
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: () => authApi.getSessions(),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const revokeSingleMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      toast({
        title: 'Session logged out',
        description: 'The selected device has been signed out.',
      });
      setSessionToRevoke(null);
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to revoke session';
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: message,
      });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: () => {
      toast({
        title: 'All other sessions logged out',
        description: 'All other devices have been signed out of your account.',
      });
      setIsRevokeAllOpen(false);
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to revoke sessions';
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: message,
      });
    },
  });

  const sessions = data?.sessions ?? [];
  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <SettingsSection
      title="Sessions"
      description="Manage active devices and sign-in locations. You can sign out of individual sessions or revoke all other devices."
    >
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-muted/40 font-normal">
            {isLoading ? 'Checking...' : `${sessions.length} active ${sessions.length === 1 ? 'session' : 'sessions'}`}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Auto-refreshes every 30s
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefetching && 'animate-spin')} />
          <span>Refresh</span>
        </Button>
      </div>

      {isLoading && (
        <Card className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading active sessions...</p>
        </Card>
      )}

      {isError && !isLoading && (
        <Card className="p-6 border-destructive/20 bg-destructive/5 text-destructive space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Could not load sessions</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs mt-2">
            Try Again
          </Button>
        </Card>
      )}

      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* Current Session */}
          <Card className="border-primary/30 bg-primary/[0.02] shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Current Session</span>
                </CardTitle>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium gap-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active now
                </Badge>
              </div>
              <CardDescription>
                This is the browser and device you are currently using.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentSession ? (
                (() => {
                  const details = getDeviceDetails(currentSession);
                  const DeviceIcon = details.Icon;
                  return (
                    <div className="flex items-start gap-4 p-4 rounded-xl border bg-card">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <DeviceIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">
                            {details.browser} on {details.os}
                          </h4>
                          <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                            This device
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            {currentSession.ip || 'Unknown IP'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Signed in {formatDistanceToNow(new Date(currentSession.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-muted-foreground p-3">
                  Current session information unavailable.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Other Sessions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-muted-foreground" />
                    <span>Other Active Sessions ({otherSessions.length})</span>
                  </CardTitle>
                  <CardDescription>
                    Devices that are signed in to your account from other browsers or locations.
                  </CardDescription>
                </div>
                {otherSessions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRevokeAllOpen(true)}
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Log Out Other Sessions
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {otherSessions.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed bg-muted/20 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Shield className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No other active sessions</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You are only signed in on this device. When you log in on another phone, tablet, or browser, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y rounded-xl border bg-card overflow-hidden">
                  {otherSessions.map((session) => {
                    const details = getDeviceDetails(session);
                    const DeviceIcon = details.Icon;
                    return (
                      <div
                        key={session.sessionId}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5">
                            <DeviceIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium text-foreground truncate">
                              {details.browser} on {details.os}
                            </p>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-muted-foreground">
                              <span>IP: {session.ip || 'Unknown'}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(session.lastActiveAt, false)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSessionToRevoke(session)}
                          className="self-end sm:self-center text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-3"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1.5" />
                          Log out
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Modal: Single Session Logout */}
      <Dialog
        open={Boolean(sessionToRevoke)}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log out this session?</DialogTitle>
            <DialogDescription>
              {sessionToRevoke && (
                <>
                  Are you sure you want to sign out{' '}
                  <span className="font-semibold text-foreground">
                    {getDeviceDetails(sessionToRevoke).browser} on{' '}
                    {getDeviceDetails(sessionToRevoke).os}
                  </span>
                  ? This device will immediately lose access and must sign in again.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionToRevoke(null)}
              disabled={revokeSingleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (sessionToRevoke) {
                  revokeSingleMutation.mutate(sessionToRevoke.sessionId);
                }
              }}
              disabled={revokeSingleMutation.isPending}
              className="gap-1.5"
            >
              {revokeSingleMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Log Out Device</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal: Revoke All Other Sessions */}
      <Dialog
        open={isRevokeAllOpen}
        onOpenChange={(open) => !open && setIsRevokeAllOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log out of all other sessions?</DialogTitle>
            <DialogDescription>
              This will immediately terminate all active sessions across any other phones, tablets, or computers where you are currently signed in. Your current session will remain active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRevokeAllOpen(false)}
              disabled={revokeAllMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => revokeAllMutation.mutate()}
              disabled={revokeAllMutation.isPending}
              className="gap-1.5"
            >
              {revokeAllMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Log Out All Others</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
