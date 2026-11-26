'use client';

import * as React from 'react';
import { Upload, X, Film, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  validateReelDuration,
  validateReelVideoFile,
  MIN_REEL_DURATION_SECONDS,
  MAX_REEL_DURATION_SECONDS,
} from '@/lib/reels-api';
import { useCreateReel } from '@/hooks/useReels';
import type { ReelItem } from '@/lib/types';

interface ReelUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (reel: ReelItem) => void;
}

export function ReelUploader({ open, onOpenChange, onUploaded }: ReelUploaderProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState<number | null>(null);
  const [caption, setCaption] = React.useState('');
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [validating, setValidating] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const createReelMutation = useCreateReel();

  const resetForm = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setDuration(null);
    setCaption('');
    setProgress(null);
    setError(null);
    setValidating(false);
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

    setError(null);
    const fileError = validateReelVideoFile(selected);
    if (fileError) {
      setError(fileError);
      toast({ variant: 'destructive', title: 'Invalid video file', description: fileError });
      e.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(selected);
    setValidating(true);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      setValidating(false);
      const vidDuration = video.duration;
      const durErr = validateReelDuration(vidDuration);
      if (durErr) {
        URL.revokeObjectURL(objectUrl);
        setError(durErr);
        toast({ variant: 'destructive', title: 'Invalid duration', description: durErr });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selected);
      setPreviewUrl(objectUrl);
      setDuration(vidDuration);
    };

    video.onerror = () => {
      setValidating(false);
      URL.revokeObjectURL(objectUrl);
      const msg = 'Could not read MP4 metadata from selected video.';
      setError(msg);
      toast({ variant: 'destructive', title: 'Invalid MP4 file', description: msg });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || duration === null || error || validating) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProgress(0);

    try {
      const created = await createReelMutation.mutateAsync({
        file,
        duration,
        caption,
        onProgress: setProgress,
        signal: controller.signal,
      });
      abortControllerRef.current = null;
      onOpenChange(false);
      if (onUploaded) {
        onUploaded(created);
      }
    } catch {
      abortControllerRef.current = null;
      setProgress(null);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setProgress(null);
    toast({ title: 'Upload cancelled' });
  };

  const isUploading = createReelMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !isUploading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Upload Reel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handlePublish} className="space-y-4">
          {!previewUrl ? (
            <div
              onClick={() => !validating && fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors"
            >
              {validating ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Validating MP4 video...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Select MP4 Video</p>
                  <p className="text-xs text-muted-foreground">
                    MP4 only, {MIN_REEL_DURATION_SECONDS}-{MAX_REEL_DURATION_SECONDS} seconds, up to 50 MB
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-72 mx-auto">
              <video
                src={previewUrl}
                muted
                playsInline
                loop
                controls
                className="w-full h-full object-contain"
              />
              {!isUploading && (
                <button
                  type="button"
                  onClick={resetForm}
                  aria-label="Remove selected video"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {duration !== null && (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs">
                  {Math.round(duration)}s
                </span>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4"
            onChange={handleFileChange}
            data-testid="reel-file-input"
            className="hidden"
          />

          {error && (
            <p className="text-sm text-destructive font-medium" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reel-caption">Caption (optional)</Label>
              <span className="text-xs text-muted-foreground">{caption.length}/300</span>
            </div>
            <Textarea
              id="reel-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Write a caption for your reel..."
              data-testid="reel-caption-input"
              disabled={isUploading}
            />
          </div>

          {progress !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading reel...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {isUploading ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelUpload}
                data-testid="reel-cancel-upload-btn"
              >
                Cancel Upload
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
            <Button
              type="submit"
              disabled={!file || duration === null || Boolean(error) || validating || isUploading}
              data-testid="reel-publish-btn"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Reel'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
