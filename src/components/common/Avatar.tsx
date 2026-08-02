'use client';

import { useState } from 'react';
import { avatarUrl } from '@/lib/cloudinaryUrl';

interface AvatarProps {
  /** Used for the initials fallback and the img alt text. */
  name: string;
  profilePicUrl?: string | null;
  /** Rendered width/height in px. The image is requested at 2x for retina. */
  size: number;
  /** Classes for the fallback circle, so each site can keep its own colour. */
  fallbackClassName?: string;
  className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({
  name,
  profilePicUrl,
  size,
  fallbackClassName = 'bg-gradient-to-br from-blue-400 to-blue-600 text-white',
  className = '',
}: AvatarProps) {
  // Which URL failed to load, rather than a boolean: the edit modal swaps a
  // local blob: preview for the uploaded URL, and revoking the blob can fire
  // onError on the way out. A boolean would latch there and keep showing
  // initials even though the new URL is fine.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const shared = 'rounded-full flex-shrink-0 object-cover';
  const style = { width: size, height: size };

  if (!profilePicUrl || profilePicUrl === failedUrl) {
    return (
      <div
        className={`${shared} flex items-center justify-center font-bold ${fallbackClassName} ${className}`}
        style={{ ...style, fontSize: Math.round(size * 0.4) }}
        aria-hidden="true"
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary already
    // resizes, converts and CDN-serves these, so next/image would add a
    // remotePatterns config and consume optimization quota for no benefit.
    <img
      src={avatarUrl(profilePicUrl, size)}
      alt={`${name}'s profile picture`}
      width={size}
      height={size}
      style={style}
      className={`${shared} ${className}`}
      onError={() => setFailedUrl(profilePicUrl)}
    />
  );
}
