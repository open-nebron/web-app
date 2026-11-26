import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_EVERYONE_PERMISSIONS,
  PermissionBits,
  getHighestRolePosition,
  getOverrideState,
  getTopRoleColor,
  groupChannelsByCategory,
  hasBit,
  setOverrideBit,
  spacesApi,
  togglePermissionBit,
  type ChannelPermissionOverride,
  type SpaceCategory,
  type SpaceChannel,
  type SpaceRole,
} from './spaces-api';

describe('Spaces frontend utilities and API client (V3-6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('checks and toggles permission bits cleanly', () => {
    const base = DEFAULT_EVERYONE_PERMISSIONS;
    expect(hasBit(base, PermissionBits.SEND_MESSAGES)).toBe(true);
    expect(hasBit(base, PermissionBits.MANAGE_ROLES)).toBe(false);

    const granted = togglePermissionBit(base, PermissionBits.MANAGE_ROLES);
    expect(hasBit(granted, PermissionBits.MANAGE_ROLES)).toBe(true);
    expect(hasBit(granted, PermissionBits.SEND_MESSAGES)).toBe(true);

    const revoked = togglePermissionBit(granted, PermissionBits.SEND_MESSAGES);
    expect(hasBit(revoked, PermissionBits.SEND_MESSAGES)).toBe(false);
    expect(hasBit(revoked, PermissionBits.MANAGE_ROLES)).toBe(true);
  });

  it('transitions channel permission override states between allow, deny, and inherit', () => {
    const init: ChannelPermissionOverride = {
      targetType: 'role',
      targetId: 'r1',
      allow: '0',
      deny: '0',
    };
    expect(getOverrideState(init, PermissionBits.SEND_MESSAGES)).toBe('inherit');

    const denied = setOverrideBit(init, PermissionBits.SEND_MESSAGES, 'deny');
    expect(getOverrideState(denied, PermissionBits.SEND_MESSAGES)).toBe('deny');
    expect(hasBit(denied.allow, PermissionBits.SEND_MESSAGES)).toBe(false);

    const allowed = setOverrideBit(denied, PermissionBits.SEND_MESSAGES, 'allow');
    expect(getOverrideState(allowed, PermissionBits.SEND_MESSAGES)).toBe('allow');
    expect(hasBit(allowed.deny, PermissionBits.SEND_MESSAGES)).toBe(false);

    const inherited = setOverrideBit(allowed, PermissionBits.SEND_MESSAGES, 'inherit');
    expect(getOverrideState(inherited, PermissionBits.SEND_MESSAGES)).toBe('inherit');
    expect(inherited.allow).toBe('0');
    expect(inherited.deny).toBe('0');
  });

  it('groups channels by category ordered by position and isolates uncategorized channels', () => {
    const categories: SpaceCategory[] = [
      { id: 'c2', spaceId: 's1', name: 'Voice', position: 1, createdAt: '' },
      { id: 'c1', spaceId: 's1', name: 'Text', position: 0, createdAt: '' },
    ];
    const channels: SpaceChannel[] = [
      {
        id: 'ch3',
        spaceId: 's1',
        categoryId: null,
        kind: 'text',
        name: 'welcome',
        topic: null,
        position: 0,
        conversationId: 'conv-3',
        permissionOverrides: [],
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'ch2',
        spaceId: 's1',
        categoryId: 'c1',
        kind: 'text',
        name: 'random',
        topic: null,
        position: 2,
        conversationId: 'conv-2',
        permissionOverrides: [],
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'ch1',
        spaceId: 's1',
        categoryId: 'c1',
        kind: 'text',
        name: 'general',
        topic: null,
        position: 0,
        conversationId: 'conv-1',
        permissionOverrides: [],
        createdAt: '',
        updatedAt: '',
      },
    ];

    const grouped = groupChannelsByCategory(categories, channels);
    expect(grouped.uncategorized.map((c) => c.name)).toEqual(['welcome']);
    expect(grouped.categorized.map((g) => g.category.name)).toEqual(['Text', 'Voice']);
    expect(grouped.categorized[0].channels.map((c) => c.name)).toEqual(['general', 'random']);
    expect(grouped.categorized[1].channels).toHaveLength(0);
  });

  it('resolves member highest role position and top colored role', () => {
    const roles: SpaceRole[] = [
      {
        id: 'r0',
        spaceId: 's1',
        name: '@everyone',
        color: '#111111',
        position: 0,
        permissions: DEFAULT_EVERYONE_PERMISSIONS.toString(),
        isDefault: true,
        isManaged: false,
        createdAt: '',
      },
      {
        id: 'r1',
        spaceId: 's1',
        name: 'Helper',
        color: '#22C55E',
        position: 2,
        permissions: '0',
        isDefault: false,
        isManaged: false,
        createdAt: '',
      },
      {
        id: 'r2',
        spaceId: 's1',
        name: 'Admin',
        color: '#EF4444',
        position: 8,
        permissions: '0',
        isDefault: false,
        isManaged: false,
        createdAt: '',
      },
    ];

    expect(getHighestRolePosition(roles, ['r1'])).toBe(2);
    expect(getHighestRolePosition(roles, ['r1', 'r2'])).toBe(8);
    expect(getTopRoleColor(roles, ['r1'])).toBe('#22C55E');
    expect(getTopRoleColor(roles, ['r1', 'r2'])).toBe('#EF4444');
    expect(getTopRoleColor(roles, [])).toBeNull();
  });

  it('calls correct spaces REST proxy endpoints via apiFetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ spaces: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const list = await spacesApi.listMySpaces();
    expect(list).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/spaces/spaces',
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });
});
