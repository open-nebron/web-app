'use client';

import * as React from 'react';
import { Image as ImageIcon, Video, Upload, Loader2, X, Clock } from 'lucide-react';
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
import { toast } from '@/components/ui/use-toast';
import { useCreateStory } from '@/hooks/useStories';
import type { StoryMediaType } from '@/lib/types';

interface StoryComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION_SECONDS = 15;

export function StoryComposer({ open, onOpenChange, onSuccess }: StoryComposerProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [mediaType, setMediaType] = React.useState<StoryMediaType>('image');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState<number>(5);
  const [caption, setCaption] = React.useState<string>('');
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const createStoryMutation = useCreateStory();

  const resetForm = React.useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setMediaType('image');
    setPreviewUrl(null);
    setDuration(5);
    setCaption('');
    setUploadProgress(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setValidationError(null);

    const isImage = ACCEPTED_IMAGE_TYPES.includes(selected.type);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(selected.type);

    if (!isImage && !isVideo) {
      const msg = 'Please select a JPEG, PNG, WebP image or MP4 video.';
      setValidationError(msg);
      toast({ variant: 'destructive', title: 'Unsupported file type', description: msg });
      e.target.value = '';
      return;
    }

    if (isImage && selected.size > MAX_IMAGE_BYTES) {
      const msg = 'Story images must be 10MB or smaller.';
      setValidationError(msg);
      toast({ variant: 'destructive', title: 'File too large', description: msg });
      e.target.value = '';
      return;
    }

    if (isVideo && selected.size > MAX_VIDEO_BYTES) {
      const msg = 'Story videos must be 50MB or smaller.';
      setValidationError(msg);
      toast({ variant: 'destructive', title: 'File too large', description: msg });
      e.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(selected);

    if (isVideo) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = objectUrl;
      videoEl.onloadedmetadata = () => {
        const videoDuration = videoEl.duration;
        if (Number.isFinite(videoDuration) && videoDuration > MAX_VIDEO_DURATION_SECONDS + 0.5) {
          URL.revokeObjectURL(objectUrl);
          const msg = `Videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter.`;
          setValidationError(msg);
          toast({ variant: 'destructive', title: 'Video too long', description: msg });
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(selected);
        setMediaType('video');
        setPreviewUrl(objectUrl);
        setDuration(
          Number.isFinite(videoDuration)
            ? Math.min(15, Math.max(1, Math.round(videoDuration)))
            : 15
        );
      };
      videoEl.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const msg = 'Could not read video metadata.';
        setValidationError(msg);
        toast({ variant: 'destructive', title: 'Invalid video', description: msg });
      };
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selected);
      setMediaType('image');
      setPreviewUrl(objectUrl);
      setDuration(5);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || createStoryMutation.isPending) return;

    setUploadProgress(0);
    try {
      await createStoryMutation.mutateAsync({
        file,
        mediaType,
        duration,
        caption: caption.trim() || undefined,
        onProgress: (p) => setUploadProgress(p),
      });
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
          <DialogDescription>
            Share a photo or short video (up to 15s). Visible to your followers for 24 hours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40 transition-colors space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Choose a photo or video</p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP up to 10MB · MP4 up to 50MB (max 15s)
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Photo
                </Button>
                <Button type="button" variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <Video className="w-3.5 h-3.5" />
                  Video
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-80">
              {mediaType === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="max-h-80 w-auto object-contain"
                />
              ) : (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="max-h-80 w-auto"
                />
              )}
              <button
                type="button"
                onClick={resetForm}
                disabled={createStoryMutation.isPending}
                aria-label="Remove selected media"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4"
            onChange={handleFileChange}
            className="hidden"
            data-testid="story-file-input"
          />

          {validationError && (
            <p className="text-xs text-destructive font-medium">{validationError}</p>
          )}

          {previewUrl && mediaType === 'image' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="story-duration" className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Display duration
                </Label>
                <span className="font-medium text-foreground">{duration}s</span>
              </div>
              <input
                id="story-duration"
                type="range"
                min={1}
                max={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={createStoryMutation.isPending}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          )}

          {previewUrl && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="story-caption">Caption (optional)</Label>
                <span className="text-muted-foreground">{caption.length} / 200</span>
              </div>
              <Input
                id="story-caption"
                placeholder="Add a caption..."
                value={caption}
                maxLength={200}
                onChange={(e) => setCaption(e.target.value)}
                disabled={createStoryMutation.isPending}
              />
            </div>
          )}

          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading story...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createStoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || createStoryMutation.isPending}
              className="gap-1.5"
            >
              {createStoryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Share to Story</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
