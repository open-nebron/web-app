'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Space } from '@/lib/spaces-api';
import { useEditSpace } from '@/hooks/useSpaces';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface SpaceSettingsDialogProps {
  space: Space;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpaceSettingsDialog({ space, open, onOpenChange }: SpaceSettingsDialogProps) {
  const editMutation = useEditSpace(space.id);
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description || '');
  const [iconKey, setIconKey] = useState(space.iconKey || '');

  useEffect(() => {
    setName(space.name);
    setDescription(space.description || '');
    setIconKey(space.iconKey || '');
  }, [space]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await editMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        iconKey: iconKey.trim() || null,
      });
      toast({ title: 'Space updated' });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update space',
        description: err instanceof Error ? err.message : 'Update failed',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Space Profile</DialogTitle>
          <DialogDescription>
            Customize your space name, description, and icon.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-space-name">Name</Label>
            <Input
              id="quick-space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-space-icon">Icon URL or Key (optional)</Label>
            <Input
              id="quick-space-icon"
              value={iconKey}
              onChange={(e) => setIconKey(e.target.value)}
              placeholder="https://... or storage key"
              maxLength={256}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-space-desc">Description</Label>
            <Textarea
              id="quick-space-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={editMutation.isPending}>
              {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
