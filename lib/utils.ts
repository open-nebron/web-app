import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Normalizes MinIO/storage URLs in local development if pointing to docker container hostname 'minio'
 */
export function normalizeStorageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (typeof window !== 'undefined' && url.includes('//minio:9000')) {
    const host = window.location.hostname || 'localhost';
    return url.replace('//minio:9000', `//${host}:9000`);
  }
  return url;
}

