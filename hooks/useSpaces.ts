'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  spacesApi,
  type ChannelPermissionOverride,
} from '@/lib/spaces-api';
import { useAuthStore } from '@/lib/auth-store';

export const spacesQueryKeys = {
  mySpaces: ['spaces', 'mine'] as const,
  detail: (spaceId: string) => ['spaces', 'detail', spaceId] as const,
  members: (spaceId: string) => ['spaces', 'members', spaceId] as const,
  roles: (spaceId: string) => ['spaces', 'roles', spaceId] as const,
  invites: (spaceId: string) => ['spaces', 'invites', spaceId] as const,
  bans: (spaceId: string) => ['spaces', 'bans', spaceId] as const,
  channelPermissions: (spaceId: string, chId: string, userId: string) =>
    ['spaces', 'channel-perms', spaceId, chId, userId] as const,
};

export function useMySpaces() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: spacesQueryKeys.mySpaces,
    queryFn: () => spacesApi.listMySpaces(),
    enabled: status === 'authenticated',
    staleTime: 15 * 1000,
  });
}

export function useSpaceDetail(spaceId: string | undefined) {
  return useQuery({
    queryKey: spacesQueryKeys.detail(spaceId || ''),
    queryFn: () => spacesApi.getSpaceDetail(spaceId!),
    enabled: Boolean(spaceId),
    staleTime: 10 * 1000,
  });
}

export function useSpaceMembers(spaceId: string | undefined) {
  return useQuery({
    queryKey: spacesQueryKeys.members(spaceId || ''),
    queryFn: () => spacesApi.listMembers(spaceId!, { limit: 100 }),
    enabled: Boolean(spaceId),
    staleTime: 10 * 1000,
  });
}

export function useSpaceRoles(spaceId: string | undefined) {
  return useQuery({
    queryKey: spacesQueryKeys.roles(spaceId || ''),
    queryFn: () => spacesApi.listRoles(spaceId!),
    enabled: Boolean(spaceId),
    staleTime: 10 * 1000,
  });
}

export function useSpaceInvites(spaceId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: spacesQueryKeys.invites(spaceId || ''),
    queryFn: () => spacesApi.listInvites(spaceId!),
    enabled: Boolean(spaceId) && enabled,
    staleTime: 10 * 1000,
  });
}

export function useSpaceBans(spaceId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: spacesQueryKeys.bans(spaceId || ''),
    queryFn: () => spacesApi.listBans(spaceId!),
    enabled: Boolean(spaceId) && enabled,
    staleTime: 10 * 1000,
  });
}

export function useChannelPermissions(
  spaceId: string | undefined,
  channelId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: spacesQueryKeys.channelPermissions(spaceId || '', channelId || '', userId || ''),
    queryFn: () => spacesApi.getChannelPermissions(spaceId!, channelId!, userId!),
    enabled: Boolean(spaceId && channelId && userId),
    staleTime: 5 * 1000,
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      spacesApi.createSpace(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.mySpaces });
    },
  });
}

export function useEditSpace(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name?: string;
      description?: string | null;
      iconKey?: string | null;
      bannerKey?: string | null;
    }) => spacesApi.editSpace(spaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.mySpaces });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) => spacesApi.deleteSpace(spaceId),
    onSuccess: (_data, spaceId) => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.mySpaces });
      queryClient.removeQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
    },
  });
}

export function useJoinInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => spacesApi.joinViaInvite(code),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.mySpaces });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(res.space.id) });
    },
  });
}

export function useCreateCategory(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; position?: number }) =>
      spacesApi.createCategory(spaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
    },
  });
}

export function useEditCategory(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ catId, ...input }: { catId: string; name?: string; position?: number }) =>
      spacesApi.editCategory(spaceId, catId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
    },
  });
}

export function useDeleteCategory(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (catId: string) => spacesApi.deleteCategory(spaceId, catId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
    },
  });
}

export function useCreateChannel(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      kind: 'text' | 'voice';
      categoryId?: string | null;
      topic?: string | null;
      position?: number;
      permissionOverrides?: ChannelPermissionOverride[];
    }) => spacesApi.createChannel(spaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
    },
  });
}

export function useEditChannel(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      chId,
      ...input
    }: {
      chId: string;
      name?: string;
      topic?: string | null;
      categoryId?: string | null;
      position?: number;
      permissionOverrides?: ChannelPermissionOverride[];
    }) => spacesApi.editChannel(spaceId, chId, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
      queryClient.invalidateQueries({
        queryKey: ['spaces', 'channel-perms', spaceId, vars.chId],
      });
    },
  });
}

export function useDeleteChannel(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chId: string) => spacesApi.deleteChannel(spaceId, chId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
    },
  });
}

export function useCreateRole(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      color?: string | null;
      permissions?: string;
      position?: number;
    }) => spacesApi.createRole(spaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.roles(spaceId) });
    },
  });
}

export function useEditRole(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      ...input
    }: {
      roleId: string;
      name?: string;
      color?: string | null;
      permissions?: string;
      position?: number;
    }) => spacesApi.editRole(spaceId, roleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.roles(spaceId) });
      queryClient.invalidateQueries({ queryKey: ['spaces', 'channel-perms', spaceId] });
    },
  });
}

export function useDeleteRole(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => spacesApi.deleteRole(spaceId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.roles(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.members(spaceId) });
      queryClient.invalidateQueries({ queryKey: ['spaces', 'channel-perms', spaceId] });
    },
  });
}

export function useAssignMemberRoles(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      spacesApi.assignMemberRoles(spaceId, userId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.members(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
      queryClient.invalidateQueries({ queryKey: ['spaces', 'channel-perms', spaceId] });
    },
  });
}

export function useKickMember(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => spacesApi.kickMember(spaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.members(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.mySpaces });
    },
  });
}

export function useBanMember(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string | null }) =>
      spacesApi.banMember(spaceId, userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.members(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.bans(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.detail(spaceId) });
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.mySpaces });
    },
  });
}

export function useUnbanMember(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => spacesApi.unbanMember(spaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spacesQueryKeys.bans(spaceId) });
    },
  });
}
