import {
  ALL_PERMISSIONS,
  DEFAULT_EVERYONE_PERMISSIONS,
  PermissionBits,
  canConnectVoice,
  canCreateInvites,
  canManageChannels,
  canManageMessages,
  canManageRoles,
  canManageSpace,
  canSend,
  canSpeak,
  canVideo,
  canView,
  hasPermission,
  isAdministrator,
  parsePermissions,
  resolvePermissions,
} from '@nebron/permissions';
import { apiFetch } from './api';

export function canKickMembers(perms: bigint): boolean {
  return hasPermission(perms, PermissionBits.KICK_MEMBERS);
}

export function canBanMembers(perms: bigint): boolean {
  return hasPermission(perms, PermissionBits.BAN_MEMBERS);
}

export {
  ALL_PERMISSIONS,
  DEFAULT_EVERYONE_PERMISSIONS,
  PermissionBits,
  canConnectVoice,
  canCreateInvites,
  canManageChannels,
  canManageMessages,
  canManageRoles,
  canManageSpace,
  canSend,
  canSpeak,
  canVideo,
  canView,
  hasPermission,
  isAdministrator,
  parsePermissions,
  resolvePermissions,
};

export interface Space {
  id: string;
  name: string;
  iconKey: string | null;
  bannerKey: string | null;
  description: string | null;
  ownerId: string;
  memberCount: number;
  defaultRoleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceCategory {
  id: string;
  spaceId: string;
  name: string;
  position: number;
  createdAt: string;
}

export interface ChannelPermissionOverride {
  targetType: 'role' | 'member';
  targetId: string;
  allow: string;
  deny: string;
}

export interface SpaceChannel {
  id: string;
  spaceId: string;
  categoryId: string | null;
  kind: 'text' | 'voice';
  name: string;
  topic: string | null;
  position: number;
  conversationId: string | null;
  permissionOverrides: ChannelPermissionOverride[];
  createdAt: string;
  updatedAt: string;
}

export interface SpaceRole {
  id: string;
  spaceId: string;
  name: string;
  color: string | null;
  position: number;
  permissions: string;
  isDefault: boolean;
  isManaged: boolean;
  createdAt: string;
}

export interface SpaceMember {
  userId: string;
  spaceId: string;
  roles: string[];
  nickname: string | null;
  joinedAt: string;
  timeoutUntil: string | null;
  isOwner: boolean;
}

export interface SpaceInvite {
  code: string;
  spaceId: string;
  createdBy: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface SpaceBan {
  spaceId: string;
  userId: string;
  bannedBy: string;
  reason: string | null;
  createdAt: string;
}

export interface SpaceCreateResponse {
  space: Space;
  categories: SpaceCategory[];
  channels: SpaceChannel[];
  roles: SpaceRole[];
  myPermissions: string;
}

export interface SpaceDetailResponse {
  space: Space;
  categories: SpaceCategory[];
  channels: SpaceChannel[];
  roles: SpaceRole[];
  myRoles: SpaceRole[];
  myPermissions: string;
  isOwner: boolean;
}

export interface SpaceMembersResponse {
  members: SpaceMember[];
  nextCursor: string | null;
}

export interface SpacePermissionsResponse {
  userId: string;
  spaceId: string;
  channelId?: string;
  isMember: boolean;
  isOwner: boolean;
  permissions: string;
}

export interface VoiceJoinResponse {
  token: string;
  roomName: string;
  livekitUrl: string;
  canPublish: boolean;
}

export interface PermissionMetaItem {
  key: keyof typeof PermissionBits;
  bit: bigint;
  label: string;
  description: string;
}

export interface PermissionGroupMeta {
  id: string;
  title: string;
  items: PermissionMetaItem[];
}

export const PERMISSION_GROUPS: PermissionGroupMeta[] = [
  {
    id: 'general',
    title: 'General Server Permissions',
    items: [
      {
        key: 'VIEW_CHANNEL',
        bit: PermissionBits.VIEW_CHANNEL,
        label: 'View Channels',
        description: 'Allows members to view channels by default (excluding private channels).',
      },
      {
        key: 'MANAGE_CHANNELS',
        bit: PermissionBits.MANAGE_CHANNELS,
        label: 'Manage Channels',
        description: 'Allows members to create, edit, reorder, and delete categories and channels.',
      },
      {
        key: 'MANAGE_ROLES',
        bit: PermissionBits.MANAGE_ROLES,
        label: 'Manage Roles',
        description: 'Allows members to create and edit roles below their highest role.',
      },
      {
        key: 'MANAGE_SPACE',
        bit: PermissionBits.MANAGE_SPACE,
        label: 'Manage Space',
        description: 'Allows members to change space name, icon, description, and view invites.',
      },
      {
        key: 'ADMINISTRATOR',
        bit: PermissionBits.ADMINISTRATOR,
        label: 'Administrator',
        description: 'Grants every permission and bypasses channel-specific overrides.',
      },
    ],
  },
  {
    id: 'membership',
    title: 'Membership & Moderation',
    items: [
      {
        key: 'CREATE_INVITES',
        bit: PermissionBits.CREATE_INVITES,
        label: 'Create Invites',
        description: 'Allows members to invite new people to join this space.',
      },
      {
        key: 'KICK_MEMBERS',
        bit: PermissionBits.KICK_MEMBERS,
        label: 'Kick Members',
        description: 'Allows removing lower-ranked members from the space.',
      },
      {
        key: 'BAN_MEMBERS',
        bit: PermissionBits.BAN_MEMBERS,
        label: 'Ban Members',
        description: 'Allows permanently banning lower-ranked members and viewing ban list.',
      },
    ],
  },
  {
    id: 'text',
    title: 'Text Channel Permissions',
    items: [
      {
        key: 'SEND_MESSAGES',
        bit: PermissionBits.SEND_MESSAGES,
        label: 'Send Messages',
        description: 'Allows members to send messages in text channels.',
      },
      {
        key: 'READ_HISTORY',
        bit: PermissionBits.READ_HISTORY,
        label: 'Read Message History',
        description: 'Allows reading prior messages sent in text channels.',
      },
      {
        key: 'MANAGE_MESSAGES',
        bit: PermissionBits.MANAGE_MESSAGES,
        label: 'Manage Messages',
        description: 'Allows deleting or moderating messages sent by other members.',
      },
      {
        key: 'EMBED_LINKS',
        bit: PermissionBits.EMBED_LINKS,
        label: 'Embed Links',
        description: 'Links posted by this member show rich previews.',
      },
      {
        key: 'ATTACH_FILES',
        bit: PermissionBits.ATTACH_FILES,
        label: 'Attach Files',
        description: 'Allows uploading media and files in channels.',
      },
      {
        key: 'ADD_REACTIONS',
        bit: PermissionBits.ADD_REACTIONS,
        label: 'Add Reactions',
        description: 'Allows reacting with emoji on channel messages.',
      },
      {
        key: 'MENTION_EVERYONE',
        bit: PermissionBits.MENTION_EVERYONE,
        label: 'Mention Everyone',
        description: 'Allows using @everyone or @here notifications.',
      },
    ],
  },
  {
    id: 'voice',
    title: 'Voice & Stage Permissions',
    items: [
      {
        key: 'CONNECT',
        bit: PermissionBits.CONNECT,
        label: 'Connect',
        description: 'Allows joining voice channels in this space.',
      },
      {
        key: 'SPEAK',
        bit: PermissionBits.SPEAK,
        label: 'Speak',
        description: 'Allows talking with microphone enabled inside voice channels.',
      },
      {
        key: 'VIDEO',
        bit: PermissionBits.VIDEO,
        label: 'Video & Screen Share',
        description: 'Allows camera video streaming and screen sharing in voice channels.',
      },
      {
        key: 'MUTE_MEMBERS',
        bit: PermissionBits.MUTE_MEMBERS,
        label: 'Mute Members',
        description: 'Allows muting other participants in voice channels.',
      },
      {
        key: 'DEAFEN_MEMBERS',
        bit: PermissionBits.DEAFEN_MEMBERS,
        label: 'Deafen Members',
        description: 'Allows deafening other participants in voice channels.',
      },
    ],
  },
];

export function hasBit(perms: string | bigint | undefined | null, bit: bigint): boolean {
  if (perms === undefined || perms === null) return false;
  try {
    return hasPermission(parsePermissions(perms), bit);
  } catch {
    return false;
  }
}

export function togglePermissionBit(perms: string | bigint, bit: bigint): string {
  const current = parsePermissions(perms);
  const next = (current & bit) === bit ? current & ~bit : current | bit;
  return next.toString();
}

export function getOverrideState(
  override: ChannelPermissionOverride | undefined,
  bit: bigint
): 'allow' | 'deny' | 'inherit' {
  if (!override) return 'inherit';
  if (hasBit(override.allow, bit)) return 'allow';
  if (hasBit(override.deny, bit)) return 'deny';
  return 'inherit';
}

export function setOverrideBit(
  override: ChannelPermissionOverride,
  bit: bigint,
  state: 'allow' | 'deny' | 'inherit'
): ChannelPermissionOverride {
  let allow = parsePermissions(override.allow);
  let deny = parsePermissions(override.deny);

  allow &= ~bit;
  deny &= ~bit;
  if (state === 'allow') {
    allow |= bit;
  } else if (state === 'deny') {
    deny |= bit;
  }

  return {
    ...override,
    allow: allow.toString(),
    deny: deny.toString(),
  };
}

export function groupChannelsByCategory(
  categories: SpaceCategory[],
  channels: SpaceChannel[]
): {
  categorized: Array<{ category: SpaceCategory; channels: SpaceChannel[] }>;
  uncategorized: SpaceChannel[];
} {
  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);
  const sortedChannels = [...channels].sort((a, b) => a.position - b.position);

  const byCatId = new Map<string, SpaceChannel[]>();
  const uncategorized: SpaceChannel[] = [];

  for (const ch of sortedChannels) {
    if (ch.categoryId) {
      const list = byCatId.get(ch.categoryId) || [];
      list.push(ch);
      byCatId.set(ch.categoryId, list);
    } else {
      uncategorized.push(ch);
    }
  }

  return {
    categorized: sortedCategories.map((cat) => ({
      category: cat,
      channels: byCatId.get(cat.id) || [],
    })),
    uncategorized,
  };
}

export function getHighestRolePosition(roles: SpaceRole[], memberRoleIds: string[]): number {
  const memberRoleSet = new Set(memberRoleIds);
  let highest = 0;
  for (const r of roles) {
    if (r.isDefault || memberRoleSet.has(r.id)) {
      if (r.position > highest) {
        highest = r.position;
      }
    }
  }
  return highest;
}

export function getTopRoleColor(roles: SpaceRole[], memberRoleIds: string[]): string | null {
  const memberRoleSet = new Set(memberRoleIds);
  const matching = roles
    .filter((r) => !r.isDefault && memberRoleSet.has(r.id) && Boolean(r.color))
    .sort((a, b) => b.position - a.position);
  return matching[0]?.color || null;
}

export const spacesApi = {
  async listMySpaces(): Promise<Space[]> {
    const res = await apiFetch<{ spaces: Space[] }>('/api/spaces/spaces');
    return res.spaces || [];
  },

  async createSpace(input: { name: string; description?: string | null }): Promise<SpaceCreateResponse> {
    return apiFetch<SpaceCreateResponse>('/api/spaces/spaces', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getSpaceDetail(spaceId: string): Promise<SpaceDetailResponse> {
    return apiFetch<SpaceDetailResponse>(`/api/spaces/spaces/${spaceId}`);
  },

  async editSpace(
    spaceId: string,
    input: {
      name?: string;
      description?: string | null;
      iconKey?: string | null;
      bannerKey?: string | null;
    }
  ): Promise<Space> {
    const res = await apiFetch<{ space: Space }>(`/api/spaces/spaces/${spaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.space;
  },

  async deleteSpace(spaceId: string): Promise<void> {
    await apiFetch<void>(`/api/spaces/spaces/${spaceId}`, {
      method: 'DELETE',
    });
  },

  async createInvite(
    spaceId: string,
    input: { maxUses?: number | null; expiresInHours?: number | null } = {}
  ): Promise<SpaceInvite> {
    const res = await apiFetch<{ invite: SpaceInvite }>(`/api/spaces/spaces/${spaceId}/invites`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.invite;
  },

  async listInvites(spaceId: string): Promise<SpaceInvite[]> {
    const res = await apiFetch<{ invites: SpaceInvite[] }>(`/api/spaces/spaces/${spaceId}/invites`);
    return res.invites || [];
  },

  async revokeInvite(spaceId: string, code: string): Promise<void> {
    await apiFetch<void>(`/api/spaces/spaces/${spaceId}/invites/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
  },

  async joinViaInvite(code: string): Promise<{ space: Space; alreadyMember: boolean }> {
    return apiFetch<{ space: Space; alreadyMember: boolean }>(
      `/api/spaces/spaces/join/${encodeURIComponent(code)}`,
      {
        method: 'POST',
      }
    );
  },

  async listMembers(
    spaceId: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<SpaceMembersResponse> {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.before) qs.set('before', params.before);
    const query = qs.toString();
    return apiFetch<SpaceMembersResponse>(
      `/api/spaces/spaces/${spaceId}/members${query ? `?${query}` : ''}`
    );
  },

  async kickMember(spaceId: string, userId: string): Promise<void> {
    await apiFetch<void>(`/api/spaces/spaces/${spaceId}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  async banMember(spaceId: string, userId: string, reason?: string | null): Promise<void> {
    await apiFetch(`/api/spaces/spaces/${spaceId}/bans`, {
      method: 'POST',
      body: JSON.stringify({ userId, ...(reason ? { reason } : {}) }),
    });
  },

  async listBans(spaceId: string): Promise<SpaceBan[]> {
    const res = await apiFetch<{ bans: SpaceBan[] }>(`/api/spaces/spaces/${spaceId}/bans`);
    return res.bans || [];
  },

  async unbanMember(spaceId: string, userId: string): Promise<void> {
    await apiFetch<void>(`/api/spaces/spaces/${spaceId}/bans/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  async listRoles(spaceId: string): Promise<SpaceRole[]> {
    const res = await apiFetch<{ roles: SpaceRole[] }>(`/api/spaces/spaces/${spaceId}/roles`);
    return res.roles || [];
  },

  async createRole(
    spaceId: string,
    input: { name: string; color?: string | null; permissions?: string; position?: number }
  ): Promise<SpaceRole> {
    const res = await apiFetch<{ role: SpaceRole }>(`/api/spaces/spaces/${spaceId}/roles`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.role;
  },

  async editRole(
    spaceId: string,
    roleId: string,
    input: { name?: string; color?: string | null; permissions?: string; position?: number }
  ): Promise<SpaceRole> {
    const res = await apiFetch<{ role: SpaceRole }>(
      `/api/spaces/spaces/${spaceId}/roles/${roleId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
    return res.role;
  },

  async deleteRole(spaceId: string, roleId: string): Promise<void> {
    await apiFetch<void>(`/api/spaces/spaces/${spaceId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  async assignMemberRoles(
    spaceId: string,
    userId: string,
    roleIds: string[]
  ): Promise<SpaceMember> {
    const res = await apiFetch<{ member: SpaceMember }>(
      `/api/spaces/spaces/${spaceId}/members/${encodeURIComponent(userId)}/roles`,
      {
        method: 'PUT',
        body: JSON.stringify({ roleIds }),
      }
    );
    return res.member;
  },

  async createCategory(
    spaceId: string,
    input: { name: string; position?: number }
  ): Promise<SpaceCategory> {
    const res = await apiFetch<{ category: SpaceCategory }>(
      `/api/spaces/spaces/${spaceId}/categories`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    return res.category;
  },

  async editCategory(
    spaceId: string,
    catId: string,
    input: { name?: string; position?: number }
  ): Promise<SpaceCategory> {
    const res = await apiFetch<{ category: SpaceCategory }>(
      `/api/spaces/spaces/${spaceId}/categories/${catId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
    return res.category;
  },

  async deleteCategory(spaceId: string, catId: string): Promise<void> {
    await apiFetch<void>(`/api/spaces/spaces/${spaceId}/categories/${catId}`, {
      method: 'DELETE',
    });
  },

  async listChannels(spaceId: string): Promise<SpaceChannel[]> {
    const res = await apiFetch<{ channels: SpaceChannel[] }>(`/api/spaces/spaces/${spaceId}/channels`);
    return res.channels || [];
  },

  async createChannel(
    spaceId: string,
    input: {
      name: string;
      kind: 'text' | 'voice';
      categoryId?: string | null;
      topic?: string | null;
      position?: number;
      permissionOverrides?: ChannelPermissionOverride[];
    }
  ): Promise<SpaceChannel> {
    const res = await apiFetch<{ channel: SpaceChannel }>(`/api/spaces/spaces/${spaceId}/channels`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.channel;
  },

  async editChannel(
    spaceId: string,
    chId: string,
    input: {
      name?: string;
      topic?: string | null;
      categoryId?: string | null;
      position?: number;
      permissionOverrides?: ChannelPermissionOverride[];
    }
  ): Promise<SpaceChannel> {
    const res = await apiFetch<{ channel: SpaceChannel }>(
      `/api/spaces/spaces/${spaceId}/channels/${chId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
    return res.channel;
  },

  async deleteChannel(spaceId: string, chId: string): Promise<void> {
    await apiFetch<void>(`/api/spaces/spaces/${spaceId}/channels/${chId}`, {
      method: 'DELETE',
    });
  },

  async joinVoiceChannel(spaceId: string, chId: string): Promise<VoiceJoinResponse> {
    return apiFetch<VoiceJoinResponse>(
      `/api/spaces/spaces/${spaceId}/channels/${chId}/voice/join`,
      {
        method: 'POST',
      }
    );
  },

  async getSpacePermissions(spaceId: string, userId: string): Promise<SpacePermissionsResponse> {
    return apiFetch<SpacePermissionsResponse>(
      `/api/spaces/spaces/${spaceId}/permissions/${encodeURIComponent(userId)}`
    );
  },

  async getChannelPermissions(
    spaceId: string,
    chId: string,
    userId: string
  ): Promise<SpacePermissionsResponse> {
    return apiFetch<SpacePermissionsResponse>(
      `/api/spaces/spaces/${spaceId}/channels/${chId}/permissions/${encodeURIComponent(userId)}`
    );
  },
};
