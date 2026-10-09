'use client';

import { useEffect, useState } from 'react';
import { Download, Image as ImageIcon, Loader2, Share2, X } from 'lucide-react';

interface MatchRecapButtonProps {
  matchId: string;
  matchName: string;
}

type RecapImage = { file: File; url: string };

function recapFileName(matchName: string): string {
  const slug = matchName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'match'}-recap.png`;
}

async function fetchRecapImage(matchId: string, matchName: string): Promise<RecapImage> {
  const res = await fetch(`/api/matches/${matchId}/recap`);
  if (!res.ok) throw new Error('Could not create the recap. Try again.');
  const blob = await res.blob();
  const file = new File([blob], recapFileName(matchName), { type: 'image/png' });
  return { file, url: URL.createObjectURL(file) };
}

function canShareFile(file: File): boolean {
  return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
}

function isShareCancelled(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export default function MatchRecapButton({ matchId, matchName }: MatchRecapButtonProps) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<RecapImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image.url);
    };
  }, [image]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleOpen = async () => {
    setOpen(true);
    setLoadError('');
    setLoading(true);
    try {
      setImage(await fetchRecapImage(matchId, matchName));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not create the recap.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!image) return;
    try {
      await navigator.share({ files: [image.file], title: `${matchName} recap` });
    } catch (err) {
      if (!isShareCancelled(err)) setLoadError('Sharing failed. Download the image instead.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm sm:text-base transition flex items-center gap-2 shrink-0"
      >
        <ImageIcon className="w-4 h-4" />
        Recap
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Match recap"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-full flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-white">Match recap</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-gray-600 dark:text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating recap...
                </div>
              )}
              {!loading && image && (
                <img src={image.url} alt={`${matchName} recap`} className="w-full rounded-lg" />
              )}
              {loadError && <p className="text-sm text-red-600 mt-3">{loadError}</p>}
            </div>

            {image && !loading && (
              <div className="flex gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <a
                  href={image.url}
                  download={image.file.name}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                {canShareFile(image.file) && (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
