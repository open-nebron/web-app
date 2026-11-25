'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Ban,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Loader2,
  ExternalLink,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { adminApi, type AdminUserItem } from '@/lib/admin-api';
import { normalizeStorageUrl } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = React.useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const data = await adminApi.getUsers({ q: q || undefined, limit: 50 });
      setUsers(data.users);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchUsers]);

  const handleBan = async (user: AdminUserItem) => {
    const reason = prompt(`Enter ban reason for @${user.username}:`, 'Violation of terms of service');
    if (!reason) return;

    setActionInProgress(user.userId);
    try {
      await adminApi.banUser(user.userId, reason);
      toast({ title: 'User banned', description: `@${user.username} has been suspended.` });
      fetchUsers(searchQuery);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Ban failed',
        description: err?.message || 'Could not ban user',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnban = async (user: AdminUserItem) => {
    if (!confirm(`Are you sure you want to reinstate @${user.username}?`)) return;

    setActionInProgress(user.userId);
    try {
      await adminApi.unbanUser(user.userId);
      toast({ title: 'User unbanned', description: `@${user.username} account reinstated.` });
      fetchUsers(searchQuery);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Unban failed',
        description: err?.message || 'Could not unban user',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePromote = async (user: AdminUserItem) => {
    if (!confirm(`Are you sure you want to promote @${user.username} to Administrator?`)) return;

    setActionInProgress(user.userId);
    try {
      await adminApi.promoteUser(user.userId);
      toast({ title: 'User promoted', description: `@${user.username} is now an Administrator.` });
      fetchUsers(searchQuery);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Promotion failed',
        description: err?.message || 'Only the super admin can promote administrators.',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDemote = async (user: AdminUserItem) => {
    if (!confirm(`Are you sure you want to remove administrator role from @${user.username}?`)) return;

    setActionInProgress(user.userId);
    try {
      await adminApi.demoteUser(user.userId);
      toast({ title: 'User demoted', description: `@${user.username} is no longer an Administrator.` });
      fetchUsers(searchQuery);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Demotion failed',
        description: err?.message || 'Only the super admin can demote administrators.',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Search, inspect, promote, and moderate user accounts across the platform.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username, name, or email..."
          className="pl-9 text-sm"
        />
      </div>

      {/* Users Table */}
      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-destructive" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No users found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isBusy = actionInProgress === u.userId;
                  return (
                    <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={normalizeStorageUrl(u.avatarUrl || '')} />
                            <AvatarFallback className="text-xs">
                              {(u.name || u.username || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-xs truncate">{u.name || u.username}</span>
                              {u.isAdmin && (
                                <Badge variant="destructive" className="text-[9px] px-1 h-3.5">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.email || '—'}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>

                      <td className="px-4 py-3">
                        {u.reportCount > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            {u.reportCount} reports
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {u.isBanned ? (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <Ban className="h-3 w-3" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                            <Link href={`/admin/users/${u.userId}`}>Profile</Link>
                          </Button>

                          {u.isBanned ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleUnban(u)}
                              className="h-7 text-xs px-2 text-emerald-500 hover:text-emerald-600"
                            >
                              Unban
                            </Button>
                          ) : !u.isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleBan(u)}
                              className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              Ban
                            </Button>
                          ) : null}

                          {u.isAdmin ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleDemote(u)}
                              className="h-7 text-xs px-2 text-muted-foreground"
                              title="Demote from admin"
                            >
                              Demote
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handlePromote(u)}
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-primary"
                              title="Promote to admin"
                            >
                              Promote
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
