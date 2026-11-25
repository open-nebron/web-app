'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, AlertCircle } from 'lucide-react';
import { usePost } from '@/hooks/usePost';
import { AppHeader } from '@/components/layout/app-header';
import { PostCard } from '@/components/social/PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = typeof params?.id === 'string' ? params.id : '';

  const { data: post, isLoading, isError, error } = usePost(postId);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div>
      <AppHeader
        title="Post"
        leading={
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8 mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Go back</span>
          </Button>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="p-4 border rounded-xl bg-card space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-48" />
          </div>
        ) : isError || !post ? (
          <div className="text-center py-16 border rounded-xl bg-card p-6">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-semibold text-foreground">Post not found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {(error as any)?.message ||
                'This post may have been deleted, or is not accessible.'}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Return to home feed
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <PostCard post={post} />

            {/* Comments placeholder (Stage 7c) */}
            <div className="p-8 border rounded-xl bg-card text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <h4 className="text-sm font-medium text-foreground">Comments coming soon</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Comment threads will be available in an upcoming update.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
