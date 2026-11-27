'use client';

import * as React from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/use-profile';
import { useCreatePost } from '@/hooks/usePosts';
import { socialApi } from '@/lib/social-api';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import {
  TokenAutocompleteDropdown,
  useTokenComposerInput,
} from './token-autocomplete';
import { Image as ImageIcon, Loader2, Send, X } from 'lucide-react';

interface PostComposerProps {
  placeholder?: string;
  className?: string;
  onSuccess?: () => void;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export function PostComposer({
  placeholder = "What's on your mind?",
  className,
  onSuccess,
}: PostComposerProps) {
  const { data: profile } = useProfile();
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const createPostMutation = useCreatePost();

  const maxChars = 500;
  const remainingChars = maxChars - body.length;
  const isOverLimit = remainingChars < 0;
  const isEmpty = body.trim().length === 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Please select a JPEG, PNG, or WebP image.',
      });
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast({
        variant: 'destructive',
        title: 'Image too large',
        description: 'Image must be 10MB or less.',
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const res = await socialApi.uploadPostImageFile(file, (percent) => {
        setUploadProgress(percent);
      });
      setImageKey(res.objectKey);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Image upload failed';
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: message,
      });
      setImageFile(null);
      setImagePreview(null);
      setImageKey(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveImage = async () => {
    if (imageKey) {
      socialApi.deletePostImage(imageKey).catch(() => {});
    }
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setImageKey(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || isOverLimit || createPostMutation.isPending || isUploading) return;

    createPostMutation.mutate(
      {
        body: body.trim(),
        imageKey: imageKey || undefined,
      },
      {
        onSuccess: () => {
          setBody('');
          setImageFile(null);
          setImagePreview(null);
          setImageKey(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (onSuccess) onSuccess();
        },
      }
    );
  };

  const autocomplete = useTokenComposerInput({
    value: body,
    setValue: setBody,
    inputRef: textareaRef,
  });

  const authorInitials = (profile?.name || profile?.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn('p-4 border rounded-xl bg-card shadow-sm', className)}>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage
              src={profile?.avatarUrl ? normalizeStorageUrl(profile.avatarUrl) : undefined}
              alt={profile?.username || 'User'}
            />
            <AvatarFallback>{authorInitials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3 relative">
            <TokenAutocompleteDropdown
              activeToken={autocomplete.activeToken}
              options={autocomplete.options}
              isLoading={autocomplete.isLoading}
              highlightedIndex={autocomplete.highlightedIndex}
              onSelect={autocomplete.handleSelectOption}
            />
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={autocomplete.handleInputChange}
              onClick={autocomplete.handleCursorEvent}
              onKeyUp={autocomplete.handleCursorEvent}
              onBlur={autocomplete.clearAutocomplete}
              onKeyDown={autocomplete.handleKeyDown}
              placeholder={placeholder}
              rows={3}
              className="resize-none border-none focus-visible:ring-0 p-0 text-base shadow-none bg-transparent placeholder:text-muted-foreground"
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block max-w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Post preview"
                  className={cn(
                    'max-h-56 max-w-full object-contain rounded-lg',
                    isUploading && 'opacity-60'
                  )}
                />

                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-1.5 p-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs font-medium">
                      Uploading {uploadProgress !== null ? `${uploadProgress}%` : ''}
                    </span>
                  </div>
                )}

                {!isUploading && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Remove image</span>
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading || Boolean(imagePreview)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || Boolean(imagePreview)}
                  className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2.5"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-xs font-normal">Add image</span>
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-xs font-medium',
                    isOverLimit
                      ? 'text-destructive font-bold'
                      : remainingChars <= 50
                      ? 'text-amber-500'
                      : 'text-muted-foreground'
                  )}
                >
                  {body.length} / {maxChars}
                </span>

                <Button
                  type="submit"
                  disabled={
                    isEmpty || isOverLimit || createPostMutation.isPending || isUploading
                  }
                  size="sm"
                  className="gap-1.5"
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
