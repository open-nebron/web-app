import type { ShareContentType } from './types';

/**
 * Computes a local fallback deep link prior to API response.
 */
export function getFallbackShareUrl(
  contentType: ShareContentType,
  contentId: string,
  options?: { parentId?: string; parentType?: 'post' | 'reel'; origin?: string }
): string {
  const origin =
    options?.origin ??
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
  const base = origin.replace(/\/+$/, '');

  if (contentType === 'post') {
    return `${base}/posts/${contentId}`;
  }
  if (contentType === 'reel') {
    return `${base}/reels/${contentId}`;
  }
  const targetPrefix = options?.parentType === 'reel' ? 'reels' : 'posts';
  if (options?.parentId) {
    return `${base}/${targetPrefix}/${options.parentId}#comment-${contentId}`;
  }
  return `${base}/posts/${contentId}`;
}

/**
 * Builds outbound share URLs for WhatsApp, Telegram, and Twitter/X.
 */
export function buildSocialShareUrls(
  canonicalUrl: string,
  previewText?: string
): { whatsapp: string; telegram: string; twitter: string } {
  const snippet = (previewText ?? '').trim().slice(0, 140);
  const waText = snippet ? `${snippet}\n${canonicalUrl}` : canonicalUrl;

  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(waText)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}${
      snippet ? `&text=${encodeURIComponent(snippet)}` : ''
    }`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(canonicalUrl)}${
      snippet ? `&text=${encodeURIComponent(snippet)}` : ''
    }`,
  };
}
