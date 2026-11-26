'use client';

import React, { useMemo, useState } from 'react';
import {
  Ban,
  Check,
  Crown,
  Loader2,
  Plus,
  Search,
  UserMinus,
} from 'lucide-react';
import {
  getHighestRolePosition,
  getTopRoleColor,
  type SpaceMember,
  type SpaceRole,
} from '@/lib/spaces-api';
import {
  useAssignMemberRoles,
  useBanMember,
  useKickMember,
  useSpaceMembers,
  useSpaceRoles,
} from '@/hooks/useSpaces';
import { useUser } from '@/hooks/use-user';
import { useProfile } from '@/hooks/use-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/use-toast';
import { normalizeStorageUrl } from '@/lib/utils';

function MemberRow({
  member,
  roles,
  searchQuery,
  currentUserId,
  isCurrentOwner,
  actorHighestPos,
  canManageRoles,
  canKick,
  canBan,
  onToggleRole,
  onKick,
  onOpenBan,
}: {
  member: SpaceMember;
  roles: SpaceRole[];
  searchQuery: string;
  currentUserId?: string;
  isCurrentOwner: boolean;
  actorHighestPos: number;
  canManageRoles: boolean;
  canKick: boolean;
  canBan: boolean;
  onToggleRole: (userId: string, roleId: string, currentRoleIds: string[]) => void;
  onKick: (userId: string) => void;
  onOpenBan: (member: SpaceMember, displayName: string) => void;
}) {
  const { data: user } = useUser(member.userId);
  const displayName = user?.name || user?.username || member.userId.slice(0, 8);
  const username = user?.username || member.userId.slice(0, 8);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    const match =
      displayName.toLowerCase().includes(q) ||
      username.toLowerCase().includes(q) ||
      member.userId.toLowerCase().includes(q);
    if (!match) return null;
  }

  const customRoles = roles.filter((r) => !r.isDefault);
  const memberRoleObjs = customRoles.filter((r) => member.roles.includes(r.id));
  const topColor = getTopRoleColor(roles, member.roles);
  const targetHighestPos = getHighestRolePosition(roles, member.roles);
  const canActOnTarget =
    member.userId !== currentUserId &&
    !member.isOwner &&
    (isCurrentOwner || actorHighestPos > targetHighestPos);

  return (
    <div
      data-testid={`member-row-${username}`}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-9 h-9 border shrink-0">
          {user?.avatarUrl && (
            <AvatarImage src={normalizeStorageUrl(user.avatarUrl)} alt={displayName} />
          )}
          <AvatarFallback>{(displayName[0] || 'U').toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-sm font-semibold truncate"
              style={topColor ? { color: topColor } : undefined}
            >
              {displayName}
            </span>
            {member.isOwner && (
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                <Crown className="w-3 h-3 text-amber-500" /> Owner
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{username}</p>
        </div>
      </div>

      {/* Roles & Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {memberRoleObjs.map((r) => (
          <Badge
            key={r.id}
            variant="outline"
            className="text-[11px] font-medium"
            style={
              r.color
                ? { borderColor: r.color, color: r.color }
                : undefined
            }
          >
            {r.name}
          </Badge>
        ))}

        {canManageRoles && customRoles.length > 0 && (!member.isOwner || isCurrentOwner) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                aria-label={`Assign roles to ${username}`}
                data-testid={`assign-roles-btn-${username}`}
              >
                <Plus className="w-3 h-3" /> Roles
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                Toggle Roles
              </p>
              {customRoles.map((role) => {
                const assigned = member.roles.includes(role.id);
                const hierarchyAllowed = isCurrentOwner || role.position < actorHighestPos;
                return (
                  <button
                    key={role.id}
                    type="button"
                    data-testid={`role-option-${role.name}`}
                    disabled={!hierarchyAllowed}
                    onClick={() => onToggleRole(member.userId, role.id, member.roles)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-accent disabled:opacity-40"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: role.color || '#94A3B8' }}
                      />
                      <span className="truncate">{role.name}</span>
                    </span>
                    {assigned && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        )}

        {canKick && canActOnTarget && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onKick(member.userId)}
            aria-label={`Kick ${username}`}
            data-testid={`kick-member-btn-${username}`}
          >
            <UserMinus className="w-3.5 h-3.5 mr-1" /> Kick
          </Button>
        )}

        {canBan && canActOnTarget && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => onOpenBan(member, displayName)}
            aria-label={`Ban ${username}`}
            data-testid={`ban-member-btn-${username}`}
          >
            <Ban className="w-3.5 h-3.5 mr-1" /> Ban
          </Button>
        )}
      </div>
    </div>
  );
}

interface MemberManagerProps {
  spaceId: string;
  isOwner: boolean;
  canManageRoles: boolean;
  canKick: boolean;
  canBan: boolean;
}

export function MemberManager({
  spaceId,
  isOwner,
  canManageRoles,
  canKick,
  canBan,
}: MemberManagerProps) {
  const { data: profile } = useProfile();
  const { data: membersData, isLoading } = useSpaceMembers(spaceId);
  const { data: roles = [] } = useSpaceRoles(spaceId);

  const assignMutation = useAssignMemberRoles(spaceId);
  const kickMutation = useKickMember(spaceId);
  const banMutation = useBanMember(spaceId);

  const [searchQuery, setSearchQuery] = useState('');
  const [banTarget, setBanTarget] = useState<{ member: SpaceMember; name: string } | null>(null);
  const [banReason, setBanReason] = useState('');

  const members = useMemo(() => membersData?.members || [], [membersData?.members]);
  const actorMember = useMemo(
    () => members.find((m) => m.userId === profile?.userId),
    [members, profile?.userId]
  );
  const actorHighestPos = actorMember
    ? getHighestRolePosition(roles, actorMember.roles)
    : 0;

  const handleToggleRole = async (
    userId: string,
    roleId: string,
    currentRoleIds: string[]
  ) => {
    const nextRoleIds = currentRoleIds.includes(roleId)
      ? currentRoleIds.filter((id) => id !== roleId)
      : [...currentRoleIds, roleId];
    try {
      await assignMutation.mutateAsync({ userId, roleIds: nextRoleIds });
      toast({ title: 'Member roles updated' });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not assign role',
        description: err instanceof Error ? err.message : 'Role update failed',
      });
    }
  };

  const handleKick = async (userId: string) => {
    try {
      await kickMutation.mutateAsync(userId);
      toast({ title: 'Member removed from space' });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not kick member',
        description: err instanceof Error ? err.message : 'Kick failed',
      });
    }
  };

  const handleConfirmBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banTarget) return;
    try {
      await banMutation.mutateAsync({
        userId: banTarget.member.userId,
        reason: banReason.trim() || undefined,
      });
      toast({ title: 'Member banned', description: `${banTarget.name} was banned.` });
      setBanTarget(null);
      setBanReason('');
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not ban member',
        description: err instanceof Error ? err.message : 'Ban failed',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">{members.length} members loaded</span>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading members...
        </div>
      ) : (
        <div className="border rounded-xl divide-y bg-card overflow-hidden">
          {members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              roles={roles}
              searchQuery={searchQuery}
              currentUserId={profile?.userId}
              isCurrentOwner={isOwner}
              actorHighestPos={actorHighestPos}
              canManageRoles={canManageRoles}
              canKick={canKick}
              canBan={canBan}
              onToggleRole={handleToggleRole}
              onKick={handleKick}
              onOpenBan={(member, name) => setBanTarget({ member, name })}
            />
          ))}
        </div>
      )}

      {/* Ban Confirmation Modal */}
      <Dialog open={Boolean(banTarget)} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ban {banTarget?.name}</DialogTitle>
            <DialogDescription>
              This user will be removed immediately and blocked from rejoining via invites.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmBan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="space-ban-reason">Reason (optional)</Label>
              <Textarea
                id="space-ban-reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for ban..."
                maxLength={500}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBanTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={banMutation.isPending}>
                {banMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Ban
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
