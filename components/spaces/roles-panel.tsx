'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
  Plus,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  PERMISSION_GROUPS,
  hasBit,
  togglePermissionBit,
  type SpaceRole,
} from '@/lib/spaces-api';
import {
  useCreateRole,
  useDeleteRole,
  useEditRole,
  useSpaceRoles,
} from '@/hooks/useSpaces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#EC4899',
  '#06B6D4',
];

interface RolesPanelProps {
  spaceId: string;
  isOwner: boolean;
  canManageRoles: boolean;
}

export function RolesPanel({ spaceId, isOwner, canManageRoles }: RolesPanelProps) {
  const { data: roles = [], isLoading } = useSpaceRoles(spaceId);
  const createRoleMutation = useCreateRole(spaceId);
  const editRoleMutation = useEditRole(spaceId);
  const deleteRoleMutation = useDeleteRole(spaceId);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => b.position - a.position),
    [roles]
  );

  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const [draftPerms, setDraftPerms] = useState('0');
  const [dragRoleId, setDragRoleId] = useState<string | null>(null);

  const selectedRole: SpaceRole | undefined = useMemo(
    () => sortedRoles.find((r) => r.id === selectedRoleId) || sortedRoles[0],
    [sortedRoles, selectedRoleId]
  );

  useEffect(() => {
    if (!selectedRole) return;
    setSelectedRoleId(selectedRole.id);
    setDraftName(selectedRole.name);
    setDraftColor(selectedRole.color ?? null);
    setDraftPerms(selectedRole.permissions || '0');
  }, [selectedRole]);

  const isDirty = Boolean(
    selectedRole &&
      (draftName !== selectedRole.name ||
        (draftColor ?? null) !== (selectedRole.color ?? null) ||
        draftPerms !== selectedRole.permissions)
  );

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newRoleName.trim();
    if (!cleaned) return;
    try {
      const created = await createRoleMutation.mutateAsync({
        name: cleaned,
        color: '#3B82F6',
        permissions: '0',
      });
      setNewRoleName('');
      setSelectedRoleId(created.id);
      toast({ title: 'Role created', description: created.name });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not create role',
        description: err instanceof Error ? err.message : 'Failed to create role',
      });
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;
    try {
      await editRoleMutation.mutateAsync({
        roleId: selectedRole.id,
        ...(selectedRole.isDefault ? {} : { name: draftName.trim() || selectedRole.name }),
        color: draftColor,
        permissions: draftPerms,
      });
      toast({ title: 'Role updated', description: selectedRole.name });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update role',
        description: err instanceof Error ? err.message : 'Update failed',
      });
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || selectedRole.isDefault) return;
    try {
      await deleteRoleMutation.mutateAsync(selectedRole.id);
      setSelectedRoleId('');
      toast({ title: 'Role deleted' });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not delete role',
        description: err instanceof Error ? err.message : 'Delete failed',
      });
    }
  };

  const handleSwapPosition = async (roleA: SpaceRole, roleB: SpaceRole) => {
    if (roleA.isDefault || roleB.isDefault || roleA.id === roleB.id) return;
    try {
      const posA = roleA.position;
      const posB = roleB.position;
      const targetPosA = posB === posA ? posA + 1 : posB;
      await editRoleMutation.mutateAsync({ roleId: roleA.id, position: targetPosA });
      await editRoleMutation.mutateAsync({ roleId: roleB.id, position: posA });
      toast({ title: 'Role order updated' });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not reorder roles',
        description: err instanceof Error ? err.message : 'Hierarchy check prevented reordering',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading roles...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Roles List + Hierarchy */}
      <div className="lg:col-span-4 space-y-4">
        {canManageRoles && (
          <form onSubmit={handleCreateRole} className="flex gap-2">
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="New role name (e.g. Moderator)"
              maxLength={50}
              data-testid="new-role-name-input"
            />
            <Button
              type="submit"
              size="sm"
              disabled={createRoleMutation.isPending || !newRoleName.trim()}
              data-testid="create-role-btn"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </form>
        )}

        <div className="border rounded-xl divide-y bg-card overflow-hidden">
          {sortedRoles.map((role, index) => {
            const customRolesAbove = sortedRoles[index - 1];
            const customRolesBelow = sortedRoles[index + 1];
            const isSelected = selectedRole?.id === role.id;

            return (
              <div
                key={role.id}
                draggable={canManageRoles && !role.isDefault}
                onDragStart={() => setDragRoleId(role.id)}
                onDragOver={(e) => {
                  if (canManageRoles && !role.isDefault && dragRoleId && dragRoleId !== role.id) {
                    e.preventDefault();
                  }
                }}
                onDrop={() => {
                  if (!dragRoleId || dragRoleId === role.id) return;
                  const source = sortedRoles.find((r) => r.id === dragRoleId);
                  setDragRoleId(null);
                  if (source) {
                    handleSwapPosition(source, role);
                  }
                }}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors',
                  isSelected ? 'bg-accent font-medium' : 'hover:bg-accent/40'
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  {canManageRoles && !role.isDefault && (
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-grab" />
                  )}
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border"
                    style={{ backgroundColor: role.color || '#94A3B8' }}
                  />
                  <span className="truncate">{role.name}</span>
                  {role.isDefault && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      default
                    </Badge>
                  )}
                </button>

                {canManageRoles && !role.isDefault && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={!customRolesAbove || customRolesAbove.isDefault}
                      onClick={() =>
                        customRolesAbove && handleSwapPosition(role, customRolesAbove)
                      }
                      aria-label={`Move ${role.name} up`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={!customRolesBelow || customRolesBelow.isDefault}
                      onClick={() =>
                        customRolesBelow && handleSwapPosition(role, customRolesBelow)
                      }
                      aria-label={`Move ${role.name} down`}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Editor & Permission Matrix */}
      <div className="lg:col-span-8">
        {!selectedRole ? (
          <div className="p-8 border rounded-xl text-center text-sm text-muted-foreground">
            Select a role to view and configure its permissions.
          </div>
        ) : (
          <div className="border rounded-xl bg-card p-5 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-base">
                    Editing Role: {selectedRole.name}
                  </h3>
                  <Badge variant="outline" className="text-[11px]">
                    Position {selectedRole.position}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure role color, display name, and bitfield capabilities.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {canManageRoles && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isDirty}
                      onClick={() => {
                        setDraftName(selectedRole.name);
                        setDraftColor(selectedRole.color ?? null);
                        setDraftPerms(selectedRole.permissions);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!isDirty || editRoleMutation.isPending}
                      onClick={handleSaveRole}
                      data-testid="save-role-btn"
                    >
                      {editRoleMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      Save Role Changes
                    </Button>
                  </>
                )}

                {canManageRoles && !selectedRole.isDefault && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteRole}
                    disabled={deleteRoleMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Role
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role-edit-name">Role Name</Label>
                <Input
                  id="role-edit-name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  disabled={!canManageRoles || selectedRole.isDefault}
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label>Role Color</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="color"
                    aria-label="Custom role color"
                    value={draftColor || '#3B82F6'}
                    onChange={(e) => setDraftColor(e.target.value.toUpperCase())}
                    disabled={!canManageRoles}
                    className="h-9 w-10 rounded border bg-background p-0.5 cursor-pointer"
                  />
                  {PRESET_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      disabled={!canManageRoles}
                      aria-label={`Color ${hex}`}
                      onClick={() => setDraftColor(hex)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-transform',
                        draftColor?.toUpperCase() === hex ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                  {draftColor && canManageRoles && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setDraftColor(null)}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Grouped Permission Matrix */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Permissions Matrix</h4>
                {canManageRoles && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDraftPerms('0')}
                  >
                    Clear Permissions
                  </Button>
                )}
              </div>

              {PERMISSION_GROUPS.map((group) => (
                <div key={group.id} className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </h5>
                  <div className="border rounded-lg divide-y">
                    {group.items.map((item) => {
                      const enabled = hasBit(draftPerms, item.bit);
                      const disabledToggle =
                        !canManageRoles || (item.key === 'ADMINISTRATOR' && !isOwner);
                      return (
                        <div
                          key={item.key}
                          className="flex items-center justify-between gap-4 px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            aria-label={item.label}
                            data-testid={`perm-toggle-${item.key}`}
                            disabled={disabledToggle}
                            onClick={() =>
                              setDraftPerms((prev) => togglePermissionBit(prev, item.bit))
                            }
                            className={cn(
                              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed',
                              enabled ? 'bg-primary' : 'bg-muted'
                            )}
                          >
                            <span
                              className={cn(
                                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow transition',
                                enabled ? 'translate-x-5' : 'translate-x-0'
                              )}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
