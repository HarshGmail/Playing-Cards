'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { fullImageUrl } from '@/lib/cloudinaryUrl';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * Full-size view of a picture. Uses `fullImageUrl` rather than the avatar
 * transform, so this shows the whole photo as uploaded instead of the square
 * face crop the thumbnail uses.
 *
 * Plain fixed overlay, matching ProfileEditModal and EditRoundModal, rather than
 * pulling in a dialog library for one view.
 */
export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // Without this the page scrolls behind the overlay.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus in so Escape and Tab act on the dialog, not the page behind it.
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
      >
        <X className="w-6 h-6" />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary already
          resizes and CDN-serves this; next/image would add remotePatterns config
          and consume optimization quota for no benefit. */}
      <img
        src={fullImageUrl(src)}
        alt={alt}
        // Stops a click on the picture itself from closing, so only the backdrop
        // and the X button dismiss.
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl cursor-default"
      />
    </div>
  );
}
