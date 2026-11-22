'use client';

import * as React from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Calendar, Globe, Pencil, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/lib/types';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
}

export function ProfileHeader({ profile, isOwnProfile = false }: ProfileHeaderProps) {
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
            src={profile.bannerUrl}
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
            <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-card shadow-lg">
              {profile.avatarUrl && (
                <AvatarImage src={profile.avatarUrl} alt={profile.name || profile.username} />
              )}
              <AvatarFallback className="text-3xl font-bold bg-muted">
                {userInitial}
              </AvatarFallback>
            </Avatar>
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

          {isOwnProfile && (
            <div className="sm:self-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/profile/edit">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
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
    </div>
  );
}

