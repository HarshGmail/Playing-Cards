import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

/**
 * Largest dimension we keep on Cloudinary. Avatars are never displayed above a
 * few hundred px, so storing an untouched 8000px phone photo just burns quota —
 * `c_limit` shrinks oversized uploads and leaves smaller ones alone.
 */
const MAX_STORED_DIMENSION = 1000;

let configured = false;

/**
 * Configured on first use rather than at import time: `next build` imports every
 * route module, so throwing at import would make a missing key fail the whole
 * build instead of just the one endpoint that needs it.
 */
function getClient() {
  if (!configured) {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud_name || !api_key || !api_secret) {
      throw new Error(
        'Cloudinary is not configured: set CLOUDINARY_CLOUD_NAME, ' +
          'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. See .env.example.'
      );
    }

    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    configured = true;
  }

  return cloudinary;
}

/**
 * The stored object for a user's avatar. Deterministic in the user id, so a
 * re-upload overwrites the previous file instead of orphaning it — there is no
 * old asset to clean up, and no per-user list of dead public ids to track.
 */
function avatarPublicId(userId: string): string {
  return `avatars/${userId}`;
}

/**
 * Uploads (or replaces) a user's avatar and returns its `secure_url`.
 *
 * The returned URL carries a version segment (`/upload/v1734…/avatars/<id>`)
 * that changes on every overwrite. Persisting the whole URL is therefore what
 * busts the CDN cache when someone changes their picture — deriving the URL
 * from the public id instead would keep serving the stale image.
 */
export async function uploadAvatar(
  userId: string,
  buffer: Buffer
): Promise<string> {
  const client = getClient();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        public_id: avatarPublicId(userId),
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        transformation: [
          { width: MAX_STORED_DIMENSION, height: MAX_STORED_DIMENSION, crop: 'limit' },
        ],
      },
      (err, uploaded) => {
        if (err) return reject(err);
        if (!uploaded) return reject(new Error('Cloudinary returned no upload result'));
        resolve(uploaded);
      }
    );

    stream.end(buffer);
  });

  return result.secure_url;
}

/**
 * Removes a user's avatar from Cloudinary. Safe to call when nothing is stored —
 * `destroy` on a missing public id reports `not found` rather than throwing.
 */
export async function deleteAvatar(userId: string): Promise<void> {
  await getClient().uploader.destroy(avatarPublicId(userId), {
    resource_type: 'image',
    invalidate: true,
  });
}
