'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  UserX,
  ArrowLeft,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  VolumeX,
  Volume2,
  Flag,
  Loader2,
} from 'lucide-react';
import { usePublicProfile, useProfile } from '@/hooks/use-profile';
import { useUserPosts, useMyLikedPosts } from '@/hooks/usePosts';
import { useAuthStore } from '@/lib/auth-store';
import { AppHeader } from '@/components/layout/app-header';
import { ProfileHeader } from '@/components/profile/profile-header';
import { FollowButton } from '@/components/social/FollowButton';
import { PostList } from '@/components/social/PostList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { chatApi } from '@/lib/chat-api';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const username = typeof params?.username === 'string' ? params.username : '';

  const currentUser = useAuthStore((s) => s.user);
  const { data: myProfile } = useProfile();
  const { data: profile, isLoading, isError } = usePublicProfile(username);
  const {
    posts,
    isLoading: isPostsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useUserPosts(profile?.userId);

  const {
    posts: likedPosts,
    isLoading: isLikedPostsLoading,
    hasNextPage: hasNextLikedPage,
    isFetchingNextPage: isFetchingNextLikedPage,
    fetchNextPage: fetchNextLikedPage,
  } = useMyLikedPosts();

  const [isStartingChat, setIsStartingChat] = React.useState(false);
  const [showBlockDialog, setShowBlockDialog] = React.useState(false);

  // Self profile redirect
  React.useEffect(() => {
    if (
      (myProfile?.username && username && myProfile.username.toLowerCase() === username.toLowerCase()) ||
      (currentUser?.userId && profile?.userId && currentUser.userId === profile.userId)
    ) {
      router.replace('/profile');
    }
  }, [myProfile, currentUser, username, profile, router]);

  // Relationship query
  const { data: relationship } = useQuery({
    queryKey: ['relationship', profile?.userId],
    queryFn: () => chatApi.getRelationship(profile!.userId),
    enabled: Boolean(profile?.userId && currentUser?.userId !== profile?.userId),
    staleTime: 60 * 1000,
  });

  const isBlocked = relationship?.blocked ?? false;
  const muteState = relationship?.mute || relationship?.muted;
  const isMuted = Boolean(muteState?.messages || muteState?.calls);

  const toggleBlockMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      if (isBlocked) {
        await chatApi.unblockUser(profile.userId);
      } else {
        await chatApi.blockUser(profile.userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship', profile?.userId] });
      setShowBlockDialog(false);
      toast({
        title: isBlocked ? 'User unblocked' : 'User blocked',
        description: isBlocked
          ? `@${profile?.username} has been unblocked.`
          : `@${profile?.username} has been blocked.`,
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err.message || 'Could not update block status',
      });
    },
  });

  const toggleMuteMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      if (isMuted) {
        await chatApi.unmuteUser(profile.userId);
      } else {
        await chatApi.muteUser(profile.userId, { calls: true, messages: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship', profile?.userId] });
      toast({
        title: isMuted ? 'User unmuted' : 'User muted',
        description: isMuted
          ? `Notifications from @${profile?.username} are now unmuted.`
          : `Notifications from @${profile?.username} are now muted.`,
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err.message || 'Could not update mute status',
      });
    },
  });

  const handleStartChat = async () => {
    if (!profile) return;
    try {
      setIsStartingChat(true);
      const res = await chatApi.createDirect(profile.userId);
      router.push(`/chat/${res.conversationId}`);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not open chat',
        description: err.message || 'Failed to start conversation',
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleReport = () => {
    toast({
      title: 'Report submitted',
      description: `Thank you. Our safety team will review @${profile?.username || username}.`,
    });
  };

  if (isLoading) {
    return (
      <div>
        <AppHeader title={`@${username}`} />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <div className="max-w-4xl mx-auto px-6 space-y-4">
            <Skeleton className="h-28 w-28 rounded-full -mt-16" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div>
        <AppHeader title="Profile Not Found" />
        <div className="max-w-md mx-auto py-24 px-6 text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <UserX className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Profile not found</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            The user @{username} doesn&apos;t exist on nebron.
          </p>
          <Button asChild variant="outline">
            <Link href="/profile">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to your profile
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isSelf = currentUser?.userId === profile.userId;

  return (
    <div>
      <AppHeader title={`@${profile.username}`} />
      <ProfileHeader profile={profile} isOwnProfile={false} />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Actions bar for other users */}
        {!isSelf && (
          <div className="flex flex-wrap items-center gap-2.5">
            <FollowButton
              userId={profile.userId}
              initialIsFollowing={profile.isFollowedByViewer}
              initialFollowerCount={profile.followerCount}
              size="sm"
            />

            <Button
              onClick={handleStartChat}
              disabled={isStartingChat || isBlocked}
              size="sm"
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {isStartingChat ? 'Opening...' : 'Send Message'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleMuteMutation.mutate()}
              disabled={toggleMuteMutation.isPending}
              className="gap-2"
            >
              {isMuted ? (
                <>
                  <Volume2 className="h-4 w-4" />
                  Unmute
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" />
                  Mute
                </>
              )}
            </Button>

            {isBlocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleBlockMutation.mutate()}
                disabled={toggleBlockMutation.isPending}
                className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <UserCheck className="h-4 w-4" />
                Unblock
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBlockDialog(true)}
                className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <ShieldAlert className="h-4 w-4" />
                Block
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleReport}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Flag className="h-4 w-4" />
              Report
            </Button>
          </div>
        )}

        {/* Profile Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className={cn("grid w-full mb-6", isSelf ? "max-w-sm grid-cols-3" : "max-w-xs grid-cols-2")}>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            {isSelf && <TabsTrigger value="likes">Likes</TabsTrigger>}
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            <PostList
              posts={posts}
              isLoading={isPostsLoading}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              emptyMessage="No posts yet"
              emptyDescription={`@${profile.username} hasn't posted anything yet.`}
            />
          </TabsContent>

          {isSelf && (
            <TabsContent value="likes" className="space-y-6">
              <PostList
                posts={likedPosts}
                isLoading={isLikedPostsLoading}
                hasNextPage={hasNextLikedPage}
                isFetchingNextPage={isFetchingNextLikedPage}
                fetchNextPage={fetchNextLikedPage}
                emptyMessage="No liked posts yet"
                emptyDescription="Posts you like on Nebron will appear here."
              />
            </TabsContent>
          )}

          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.about ? (
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                    {profile.about}
                  </p>
                ) : profile.bio ? (
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No bio or about section provided.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog for Blocking */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Block @{profile.username}?</DialogTitle>
            <DialogDescription>
              They will no longer be able to message you or call you on nebron. You can unblock them at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBlockDialog(false)}
              disabled={toggleBlockMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => toggleBlockMutation.mutate()}
              disabled={toggleBlockMutation.isPending}
              className="gap-2"
            >
              {toggleBlockMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
