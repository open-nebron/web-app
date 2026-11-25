'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Shield,
  Ban,
  CheckCircle2,
  Trash2,
  Clock,
  History,
  FileText,
  AlertTriangle,
  Loader2,
  Calendar,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { adminApi, type AdminUserDetailResponse } from '@/lib/admin-api';
import { normalizeStorageUrl } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const { toast } = useToast();

  const [detail, setDetail] = React.useState<AdminUserDetailResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBusy, setIsBusy] = React.useState(false);

  const loadUser = React.useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const data = await adminApi.getUserDetail(userId);
      setDetail(data);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading user',
        description: err?.message || 'User not found',
      });
      router.push('/admin/users');
    } finally {
      setIsLoading(false);
    }
  }, [userId, router, toast]);

  React.useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleBan = async () => {
    if (!detail) return;
    const reason = prompt(`Enter ban reason for @${detail.profile.username}:`, 'Violation of community guidelines');
    if (!reason) return;

    setIsBusy(true);
    try {
      await adminApi.banUser(detail.profile.userId, reason);
      toast({ title: 'User banned', description: `@${detail.profile.username} has been suspended.` });
      loadUser();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Ban failed', description: err?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleUnban = async () => {
    if (!detail) return;
    if (!confirm(`Are you sure you want to unban @${detail.profile.username}?`)) return;

    setIsBusy(true);
    try {
      await adminApi.unbanUser(detail.profile.userId);
      toast({ title: 'User unbanned', description: `@${detail.profile.username} has been reinstated.` });
      loadUser();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Unban failed', description: err?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handlePromote = async () => {
    if (!detail) return;
    if (!confirm(`Promote @${detail.profile.username} to Administrator?`)) return;

    setIsBusy(true);
    try {
      await adminApi.promoteUser(detail.profile.userId);
      toast({ title: 'Promoted', description: `@${detail.profile.username} is now an admin.` });
      loadUser();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Promotion failed', description: err?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to remove this post?')) return;

    try {
      await adminApi.deletePost(postId);
      toast({ title: 'Post deleted' });
      loadUser();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: err?.message });
    }
  };

  if (isLoading || !detail) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-destructive" />
      </div>
    );
  }

  const { profile, reports, actions, recentPosts } = detail;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
        <Link href="/admin/users">
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </Button>

      {/* User Header Profile Card */}
      <Card className="shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-muted to-muted/50" />
        <CardContent className="relative pt-0 px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-card shadow-md">
                <AvatarImage src={normalizeStorageUrl(profile.avatarUrl || '')} />
                <AvatarFallback className="text-2xl font-bold">
                  {(profile.name || profile.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{profile.name || profile.username}</h2>
                  {profile.isAdmin && (
                    <Badge variant="destructive" className="text-xs">
                      Admin
                    </Badge>
                  )}
                  {profile.isBanned && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <Ban className="h-3 w-3" />
                      Banned
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                {profile.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {profile.email}
                  </p>
                )}
              </div>
            </div>

            {/* Admin Action Buttons */}
            <div className="flex items-center gap-2">
              {profile.isBanned ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={handleUnban}
                  className="text-emerald-500 hover:text-emerald-600 gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Unban Account
                </Button>
              ) : !profile.isAdmin ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isBusy}
                  onClick={handleBan}
                  className="gap-1.5"
                >
                  <Ban className="h-4 w-4" />
                  Ban Account
                </Button>
              ) : null}

              {!profile.isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={handlePromote}
                  className="gap-1.5"
                >
                  <Shield className="h-4 w-4" />
                  Promote to Admin
                </Button>
              )}
            </div>
          </div>

          {/* Ban Warning Box */}
          {profile.isBanned && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Account Suspended</p>
                <p className="mt-0.5">Reason: {profile.bannedReason || 'None specified'}</p>
                {profile.bannedAt && (
                  <p className="mt-0.5 opacity-80">
                    Banned on {format(new Date(profile.bannedAt), 'PPP p')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Profile metadata metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t text-xs">
            <div>
              <span className="text-muted-foreground">User ID</span>
              <p className="font-mono mt-0.5 text-[11px] truncate">{profile.userId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Joined Date</span>
              <p className="font-medium mt-0.5">{format(new Date(profile.createdAt), 'PPP')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Followers / Following</span>
              <p className="font-medium mt-0.5">
                {profile.followerCount} / {profile.followingCount}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Posts</span>
              <p className="font-medium mt-0.5">{profile.postCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Reports against user, Audit Actions, and Recent Posts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Reports Filed Against User */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Reports Filed ({reports.length})</span>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Incidents involving this user</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {reports.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No reports filed against this user.
              </p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between text-xs gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {r.reason}
                      </Badge>
                      <span className="text-muted-foreground">target: {r.targetType}</span>
                    </div>
                    {r.details && <p className="italic text-muted-foreground truncate">&ldquo;{r.details}&rdquo;</p>}
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs shrink-0">
                    <Link href={`/admin/reports/${r.id}`}>Review</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Audit Actions History */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Admin Action Log ({actions.length})</span>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Past moderation decisions for this account</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {actions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No admin actions recorded yet.
              </p>
            ) : (
              actions.map((a) => (
                <div key={a.id} className="py-2.5 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                      {a.action.replace('_', ' ')}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {a.details?.reason && (
                    <p className="text-muted-foreground italic">Reason: {a.details.reason}</p>
                  )}
                  {a.details?.note && (
                    <p className="text-muted-foreground italic">Note: {a.details.note}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Posts with Delete Buttons */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Recent Posts ({recentPosts.length})</span>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Posts published by this user with moderator deletion controls</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {recentPosts.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No recent posts found.</p>
          ) : (
            recentPosts.map((post) => (
              <div key={post.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{post.body}</p>
                  {post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={normalizeStorageUrl(post.imageUrl)}
                      alt="Post media"
                      className="h-20 w-auto rounded object-cover border"
                    />
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{format(new Date(post.createdAt), 'PP p')}</span>
                    <span>·</span>
                    <span>{post.likeCount} likes</span>
                    <span>·</span>
                    <span>{post.commentCount} comments</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePost(post.id)}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
