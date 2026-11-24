'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { coreApi } from '@/lib/api';
import { useProfile, PROFILE_QUERY_KEY } from '@/hooks/use-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { normalizeStorageUrl } from '@/lib/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export function AvatarUploader() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const userInitial = profile?.name
    ? profile.name[0].toUpperCase()
    : profile?.username
    ? profile.username[0].toUpperCase()
    : 'U';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be selected again
    e.target.value = '';

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Please select a JPEG, PNG, or WebP image.',
      });
      return;
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Avatar image must be 5MB or smaller.',
      });
      return;
    }

    // Immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    try {
      // 1. Get presigned upload slot
      const slot = await coreApi.requestAvatarUpload(file.type, file.size);

      // 2. Upload directly to storage
      const formData = new FormData();
      if (slot.fields) {
        Object.entries(slot.fields).forEach(([k, v]) => {
          formData.append(k, v);
        });
      }
      formData.append('file', file);

      const uploadUrl = normalizeStorageUrl(slot.uploadUrl);
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload to storage service failed');
      }

      // 3. Confirm with core-backend
      await coreApi.confirmAvatar(slot.objectKey);

      // 4. Invalidate profile query to get new URL
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });

      toast({
        title: 'Avatar updated',
        description: 'Your new avatar has been uploaded.',
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setPreviewUrl(null);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Could not upload avatar image.',
      });
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleDelete = async () => {
    if (!profile?.avatarUrl) return;
    setIsDeleting(true);
    try {
      await coreApi.deleteAvatar();
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      setPreviewUrl(null);
      setShowConfirmDelete(false);
      toast({
        title: 'Avatar removed',
        description: 'Your profile avatar has been reset.',
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not remove avatar',
        description: error.message || 'Error deleting avatar.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const displayUrl = previewUrl || (profile?.avatarUrl ? normalizeStorageUrl(profile.avatarUrl) : null);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative group">
        <Avatar className="h-24 w-24 border-2 border-border shadow-md">
          {displayUrl && (
            <AvatarImage src={displayUrl} alt={profile?.name || 'Avatar'} />
          )}
          <AvatarFallback className="text-2xl font-bold bg-muted">
            {userInitial}
          </AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      <div className="space-y-2 text-center sm:text-left">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading || isDeleting}
        />
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            loading={isUploading}
            disabled={isUploading || isDeleting}
          >
            <Camera className="mr-2 h-4 w-4" />
            {profile?.avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
          </Button>

          {profile?.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmDelete(true)}
              loading={isDeleting}
              disabled={isUploading || isDeleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPEG, or WebP. Max 5MB.
        </p>
      </div>

      {/* Confirmation Dialog for Avatar Removal */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove avatar?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove your profile avatar? It will be replaced with your default initial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Remove Avatar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

