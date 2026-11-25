'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useUserPosts, useMyLikedPosts } from '@/hooks/usePosts';
import { AppHeader } from '@/components/layout/app-header';
import { ProfileHeader } from '@/components/profile/profile-header';
import { PostComposer } from '@/components/social/PostComposer';
import { PostList } from '@/components/social/PostList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
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

  if (isLoading || !profile) {
    return (
      <div>
        <AppHeader title="Profile" />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <div className="max-w-4xl mx-auto px-6 space-y-4">
            <Skeleton className="h-28 w-28 rounded-full -mt-16" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title="Profile"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/profile/edit">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        }
      />

      <ProfileHeader profile={profile} isOwnProfile={true} />

      <div className="max-w-4xl mx-auto px-6 py-6">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full max-w-sm grid-cols-3 mb-6">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="likes">Likes</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            <PostComposer placeholder="Share something with your followers..." />
            <PostList
              posts={posts}
              isLoading={isPostsLoading}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              emptyMessage="No posts yet"
              emptyDescription="Your posts will appear here. Publish your first post above!"
            />
          </TabsContent>

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

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About Me</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.about ? (
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                    {profile.about}
                  </p>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No bio or about section written yet.
                    </p>
                    <Button asChild variant="link" size="sm" className="mt-2">
                      <Link href="/profile/edit">Add details to your profile</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
