'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';
import Avatar from '@/components/common/Avatar';

/** Kept in step with MAX_UPLOAD_BYTES in the avatar route. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

interface ProfileEditModalProps {
  user: {
    id: string;
    name: string;
    phone?: string;
    dob?: string;
    profilePicUrl?: string | null;
  };
  onClose: () => void;
  onSave: (data: { name: string; phone: string; dob: string }) => Promise<void>;
  /** Called after the picture is uploaded or removed, with the new stored URL. */
  onAvatarChange: (file: File | null) => Promise<string | null>;
}

export default function ProfileEditModal({
  user,
  onClose,
  onSave,
  onAvatarChange,
}: ProfileEditModalProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [dob, setDob] = useState(user.dob || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [picUrl, setPicUrl] = useState<string | null>(user.profilePicUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Tracked separately from picUrl so it can be revoked: an object URL stays
  // alive for the document's lifetime otherwise, holding the file in memory.
  const previewUrlRef = useRef<string | null>(null);

  const releasePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => releasePreview, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-picking the same file fires change again.
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image must be 4MB or smaller');
      return;
    }

    const previous = picUrl;
    releasePreview();
    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;

    setError('');
    setUploading(true);
    setPicUrl(preview);

    try {
      const uploadedUrl = await onAvatarChange(file);
      // Swap the src first, then drop the blob — revoking while it is still the
      // rendered src makes the browser fire onError on the outgoing image.
      setPicUrl(uploadedUrl);
      setTimeout(releasePreview, 0);
    } catch (err) {
      setPicUrl(previous);
      setTimeout(releasePreview, 0);
      setError(err instanceof Error ? err.message : 'Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    const previous = picUrl;
    setError('');
    setUploading(true);
    releasePreview();
    setPicUrl(null);

    try {
      await onAvatarChange(null);
    } catch (err) {
      setPicUrl(previous);
      setError(err instanceof Error ? err.message : 'Failed to remove picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    try {
      await onSave({ name, phone, dob });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 pb-2">
          <div className="relative">
            <Avatar name={name || user.name} profilePicUrl={picUrl} size={80} />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <span className="text-xs text-white font-medium">...</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {picUrl ? 'Change picture' : 'Add picture'}
            </button>
            {picUrl && (
              <button
                type="button"
                onClick={handleRemovePicture}
                disabled={uploading || loading}
                className="block text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                Remove picture
              </button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">JPEG, PNG or WebP · max 4MB</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(optional)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
