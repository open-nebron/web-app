'use client';

import * as React from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Calendar, Globe, Pencil, Sparkles, Flag, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FollowButton } from '@/components/social/FollowButton';
import { ReportDialog } from '@/components/reports/ReportDialog';
import { StoryComposer } from '@/components/stories/story-composer';
import { StoryViewer } from '@/components/stories/story-viewer';
import { useUserStories } from '@/hooks/useStories';
import type { UserProfile } from '@/lib/types';
import { cn, normalizeStorageUrl } from '@/lib/utils';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
}

export function ProfileHeader({ profile, isOwnProfile = false }: ProfileHeaderProps) {
  const [reportOpen, setReportOpen] = React.useState(false);
  const [storyComposerOpen, setStoryComposerOpen] = React.useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = React.useState(false);
  const { data: userStoryGroup } = useUserStories(profile.userId);
  const hasActiveStories = Boolean(userStoryGroup && userStoryGroup.stories.length > 0);
  const userInitial = profile.name
    ? profile.name[0].toUpperCase()
    : profile.username
    ? profile.username[0].toUpperCase()
    : 'U';

  const memberSinceFormatted = React.useMemo(() => {
    try {
      return format(parseISO(profile.createdAt), 'MMMM yyyy');
    } catch {
      return 'Recently';
    }
  }, [profile.createdAt]);

  const dobFormatted = React.useMemo(() => {
    if (!profile.dateOfBirth) return null;
    try {
      return format(parseISO(profile.dateOfBirth), 'MMMM d, yyyy');
    } catch {
      return profile.dateOfBirth;
    }
  }, [profile.dateOfBirth]);

  return (
    <div className="relative border-b bg-card pb-6">
      {/* Banner */}
      <div className="relative h-48 sm:h-64 w-full bg-gradient-to-r from-muted/80 via-muted to-muted/60 overflow-hidden">
        {profile.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={normalizeStorageUrl(profile.bannerUrl)}
            alt="Profile Banner"
            className="w-full h-full object-cover"
          />
        )}
        {isOwnProfile && (
          <Link
            href="/profile/edit"
            className="absolute top-4 right-4 bg-background/80 hover:bg-background/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Cover
          </Link>
        )}
      </div>

      {/* Profile info section */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
          <div className="relative inline-block">
            <div
              role={hasActiveStories ? 'button' : undefined}
              tabIndex={hasActiveStories ? 0 : undefined}
              onClick={() => {
                if (hasActiveStories) setStoryViewerOpen(true);
              }}
              onKeyDown={(e) => {
                if (hasActiveStories && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setStoryViewerOpen(true);
                }
              }}
              aria-label={hasActiveStories ? `View @${profile.username}'s story` : undefined}
              data-testid="profile-avatar-story-ring"
              data-ring={hasActiveStories ? (userStoryGroup?.hasUnviewed ? 'unviewed' : 'viewed') : 'none'}
              className={cn(
                'rounded-full transition-transform',
                hasActiveStories && 'cursor-pointer hover:scale-[1.02] p-1',
                hasActiveStories && userStoryGroup?.hasUnviewed && 'bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400',
                hasActiveStories && !userStoryGroup?.hasUnviewed && 'bg-muted-foreground/40'
              )}
            >
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-card shadow-lg">
                {profile.avatarUrl && (
                  <AvatarImage src={normalizeStorageUrl(profile.avatarUrl)} alt={profile.name || profile.username} />
                )}
                <AvatarFallback className="text-3xl font-bold bg-muted">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </div>
            {isOwnProfile && (
              <Link
                href="/profile/edit"
                className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full shadow hover:bg-primary/90 transition-colors"
                aria-label="Edit avatar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {isOwnProfile ? (
            <div className="sm:self-end flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setStoryComposerOpen(true)}
                data-testid="add-to-story-btn"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add to story
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/profile/edit">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          ) : (
            <div className="sm:self-end flex items-center gap-2">
              <FollowButton
                userId={profile.userId}
                initialIsFollowing={profile.isFollowedByViewer}
                initialFollowerCount={profile.followerCount}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportOpen(true)}
                className="text-muted-foreground hover:text-destructive gap-1.5"
                title="Report user"
              >
                <Flag className="h-4 w-4" />
                Report
              </Button>
            </div>
          )}
        </div>

        {/* Name and Handle */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {profile.name || profile.username}
            </h2>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            @{profile.username}
          </p>
        </div>

        {/* Stats: Posts, Followers, Following */}
        <div className="flex items-center gap-6 mt-3 text-sm">
          <div>
            <span className="font-semibold text-foreground">{profile.postCount ?? 0}</span>{' '}
            <span className="text-muted-foreground">Posts</span>
          </div>
          <div>
            <span className="font-semibold text-foreground">{profile.followerCount ?? 0}</span>{' '}
            <span className="text-muted-foreground">Followers</span>
          </div>
          <div>
            <span className="font-semibold text-foreground">{profile.followingCount ?? 0}</span>{' '}
            <span className="text-muted-foreground">Following</span>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-sm text-foreground/90 max-w-2xl leading-relaxed whitespace-pre-line">
            {profile.bio}
          </p>
        )}

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            <span>Joined {memberSinceFormatted}</span>
          </div>

          {dobFormatted && (
            <div className="flex items-center">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              <span>Born {dobFormatted}</span>
            </div>
          )}

          <div className="flex items-center">
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            <span className="uppercase">{profile.language}</span>
          </div>
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="user"
        targetId={profile.userId}
        targetTitle={`@${profile.username}`}
      />

      <StoryComposer
        open={storyComposerOpen}
        onOpenChange={setStoryComposerOpen}
      />

      {storyViewerOpen && userStoryGroup && userStoryGroup.stories.length > 0 && (
        <StoryViewer
          groups={[userStoryGroup]}
          initialGroupIndex={0}
          open={storyViewerOpen}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}
    </div>
  );
}

