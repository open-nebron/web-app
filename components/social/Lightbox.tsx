'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeStorageUrl } from '@/lib/utils';

interface LightboxProps {
  src: string | null;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Lightbox({ src, alt = 'Post image', isOpen, onClose }: LightboxProps) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  const displayUrl = normalizeStorageUrl(src);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-50 h-10 w-10 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
      >
        <X className="h-6 w-6" />
        <span className="sr-only">Close</span>
      </Button>

      <div
        className="relative max-h-[90vh] max-w-[90vw] p-2 flex items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayUrl}
          alt={alt}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform"
        />
      </div>
    </div>
  );
}
