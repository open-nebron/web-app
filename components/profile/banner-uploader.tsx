'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { coreApi } from '@/lib/api';
import { useProfile, PROFILE_QUERY_KEY } from '@/hooks/use-profile';
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
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export function BannerUploader() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Please select a JPEG, PNG, or WebP banner image.',
      });
      return;
    }

    if (file.size > MAX_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Banner image must be 10MB or smaller.',
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    try {
      // 1. Presigned upload slot
      const slot = await coreApi.requestBannerUpload(file.type, file.size);

      // 2. Direct upload to storage
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

      // 3. Confirm
      await coreApi.confirmBanner(slot.objectKey);

      // 4. Invalidate
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });

      toast({
        title: 'Banner updated',
        description: 'Your new banner has been uploaded.',
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setPreviewUrl(null);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Could not upload banner image.',
      });
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleDelete = async () => {
    if (!profile?.bannerUrl) return;
    setIsDeleting(true);
    try {
      await coreApi.deleteBanner();
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      setPreviewUrl(null);
      setShowConfirmDelete(false);
      toast({
        title: 'Banner removed',
        description: 'Your profile banner has been reset.',
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not remove banner',
        description: error.message || 'Error deleting banner.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const displayUrl = previewUrl || (profile?.bannerUrl ? normalizeStorageUrl(profile.bannerUrl) : null);

  return (
    <div className="space-y-3">
      <div className="relative w-full h-36 sm:h-48 rounded-xl overflow-hidden border border-border bg-gradient-to-r from-muted/60 via-muted to-muted/80 flex items-center justify-center">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="Profile Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-4">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/60 mb-1" />
            <p className="text-xs text-muted-foreground">No banner set</p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading || isDeleting}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            loading={isUploading}
            disabled={isUploading || isDeleting}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            {profile?.bannerUrl ? 'Change Banner' : 'Upload Banner'}
          </Button>

          {profile?.bannerUrl && (
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
          PNG, JPEG, or WebP. Max 10MB.
        </p>
      </div>

      {/* Confirmation Dialog for Banner Removal */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove banner?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove your profile banner? It will be replaced with the default gradient.
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
              Remove Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

