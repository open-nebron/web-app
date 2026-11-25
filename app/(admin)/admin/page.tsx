'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  FileText,
  ShieldAlert,
  MessageSquare,
  PhoneCall,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { adminApi, type AdminStatsResponse, type AdminReportItem, type AdminUserItem } from '@/lib/admin-api';
import { normalizeStorageUrl } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function AdminOverviewPage() {
  const [stats, setStats] = React.useState<AdminStatsResponse | null>(null);
  const [recentReports, setRecentReports] = React.useState<AdminReportItem[]>([]);
  const [recentUsers, setRecentUsers] = React.useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [statsData, reportsData, usersData] = await Promise.all([
          adminApi.getStats(),
          adminApi.getReports({ status: 'pending', limit: 10 }),
          adminApi.getUsers({ limit: 10 }),
        ]);

        if (mounted) {
          setStats(statsData);
          setRecentReports(reportsData.reports);
          setRecentUsers(usersData.users);
        }
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-destructive" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time platform metrics, moderation alerts, and community health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">
              <Users className="h-4 w-4 mr-1.5" />
              Manage Users
            </Link>
          </Button>
          <Button asChild variant="destructive" size="sm">
            <Link href="/admin/reports">
              <ShieldAlert className="h-4 w-4 mr-1.5" />
              Review Reports ({stats?.reports.pending ?? 0})
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Users */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total.toLocaleString() ?? 0}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="text-emerald-500 font-medium">
                {stats?.users.activeToday ?? 0} active today
              </span>
              <span>·</span>
              <span className="text-destructive font-medium">
                {stats?.users.banned ?? 0} banned
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Posts */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Posts Published</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.posts.total.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats?.posts.today ?? 0} published today
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pending Reports */}
        <Card className="shadow-sm border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-destructive">Pending Reports</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.reports.pending ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.reports.resolvedToday ?? 0} resolved today
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Daily Traffic */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Daily Engagement</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.messages.today ?? 0) + (stats?.calls.today ?? 0)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{stats?.messages.today ?? 0} messages</span>
              <span>·</span>
              <span>{stats?.calls.today ?? 0} calls</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two column grid: Recent Pending Reports and Recent Signups */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Pending Reports */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Reports</CardTitle>
              <CardDescription>Items waiting for moderator action</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link href="/admin/reports">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {recentReports.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                <span>All clear! No pending reports in queue.</span>
              </div>
            ) : (
              recentReports.map((report) => (
                <div key={report.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="capitalize text-[10px] h-5">
                        {report.targetType}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {report.reason}
                      </span>
                    </div>
                    <p className="text-xs text-foreground truncate">
                      Reported by <span className="font-medium">@{report.reporter.username}</span> against{' '}
                      <span className="font-medium">@{report.targetOwner.username}</span>
                    </p>
                    {report.details && (
                      <p className="text-xs text-muted-foreground italic truncate">
                        &ldquo;{report.details}&rdquo;
                      </p>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs shrink-0">
                    <Link href={`/admin/reports/${report.id}`}>Review</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Recent Signups */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Signups</CardTitle>
              <CardDescription>Latest users registered on the platform</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link href="/admin/users">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {recentUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No users found.
              </div>
            ) : (
              recentUsers.map((u) => (
                <div key={u.userId} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={normalizeStorageUrl(u.avatarUrl || '')} />
                      <AvatarFallback className="text-xs">
                        {(u.name || u.username || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {u.name || u.username}
                        </span>
                        {u.isAdmin && (
                          <Badge variant="destructive" className="text-[9px] px-1 h-3.5">
                            Admin
                          </Badge>
                        )}
                        {u.isBanned && (
                          <Badge variant="outline" className="text-[9px] px-1 h-3.5 text-destructive border-destructive">
                            Banned
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        @{u.username} {u.email ? `· ${u.email}` : ''}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs shrink-0">
                    <Link href={`/admin/users/${u.userId}`}>Details</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
