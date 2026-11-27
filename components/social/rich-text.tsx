'use client';

import * as React from 'react';
import Link from 'next/link';
import { tokenizeSocialText } from '@/lib/social-tokens';

export { tokenizeSocialText, type TextSegment } from '@/lib/social-tokens';

export interface RichTextProps {
  text: string;
  stopPropagation?: boolean;
}

export function RichText({ text, stopPropagation = true }: RichTextProps) {
  const segments = React.useMemo(() => tokenizeSocialText(text), [text]);

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === 'mention') {
          return (
            <Link
              key={`m-${idx}-${seg.username}`}
              href={`/${seg.username}`}
              onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
              className="text-primary font-medium hover:underline"
            >
              {seg.text}
            </Link>
          );
        }
        if (seg.type === 'hashtag') {
          return (
            <Link
              key={`h-${idx}-${seg.tag}`}
              href={`/hashtag/${encodeURIComponent(seg.tag)}`}
              onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
              className="text-primary font-medium hover:underline"
            >
              {seg.text}
            </Link>
          );
        }
        return <React.Fragment key={`t-${idx}`}>{seg.text}</React.Fragment>;
      })}
    </>
  );
}
