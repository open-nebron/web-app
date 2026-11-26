'use client';

import * as React from 'react';
import { StoryTile } from './story-tile';
import { StoryComposer } from './story-composer';
import { StoryViewer } from './story-viewer';
import { useStories } from '@/hooks/useStories';
import { useProfile } from '@/hooks/use-profile';
import { Skeleton } from '@/components/ui/skeleton';

export function StoryBar() {
  const { data: profile } = useProfile();
  const { groups, isLoading } = useStories();

  const [composerOpen, setComposerOpen] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = React.useState(0);

  const myGroupIndex = groups.findIndex((g) => g.isMine);
  const myGroup = myGroupIndex !== -1 ? groups[myGroupIndex] : null;
  const otherGroups = groups.filter((g) => !g.isMine);

  const handleOpenGroup = (groupUserId: string) => {
    const idx = groups.findIndex((g) => g.userId === groupUserId);
    if (idx !== -1) {
      setViewerGroupIndex(idx);
      setViewerOpen(true);
    }
  };

  return (
    <>
      <div
        className="w-full p-3 border rounded-xl bg-card shadow-2xs"
        data-testid="story-bar"
      >
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          {/* Own story tile always pinned left */}
          <StoryTile
            username={profile?.username || 'you'}
            name={profile?.name}
            avatarUrl={profile?.avatarUrl}
            isMine={true}
            hasStories={Boolean(myGroup && myGroup.stories.length > 0)}
            hasUnviewed={myGroup?.hasUnviewed ?? false}
            onClick={() => {
              if (myGroup && myGroup.stories.length > 0) {
                handleOpenGroup(myGroup.userId);
              } else {
                setComposerOpen(true);
              }
            }}
            onAddClick={() => setComposerOpen(true)}
          />

          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="w-12 h-3" />
                </div>
              ))}
            </>
          ) : (
            otherGroups.map((group) => (
              <StoryTile
                key={group.userId}
                username={group.username}
                name={group.name}
                avatarUrl={group.avatarUrl}
                isMine={false}
                hasStories={group.stories.length > 0}
                hasUnviewed={group.hasUnviewed}
                onClick={() => handleOpenGroup(group.userId)}
              />
            ))
          )}
        </div>
      </div>

      <StoryComposer open={composerOpen} onOpenChange={setComposerOpen} />

      {viewerOpen && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={viewerGroupIndex}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
