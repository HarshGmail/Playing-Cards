/**
 * Builds Cloudinary delivery URLs from a stored `secure_url`.
 *
 * Transformations are named in the URL path, so one stored original serves every
 * size and crop we need. These helpers splice them in after `/upload/` rather
 * than rebuilding the URL from a cloud name and public id — which keeps the
 * version segment of the stored URL intact, and that segment is what busts the
 * CDN cache when a user replaces their picture.
 */

const MARKER = '/upload/';

function splice(url: string, transforms: string): string {
  const at = url.indexOf(MARKER);
  // Non-Cloudinary values pass through untouched: the profile edit modal renders
  // a local `blob:` preview while an upload is in flight.
  if (!url.includes('res.cloudinary.com') || at === -1) return url;

  const head = url.slice(0, at + MARKER.length);
  return `${head}${transforms}/${url.slice(at + MARKER.length)}`;
}

/**
 * Square face-cropped avatar at `size` CSS px, requested at 2x for retina.
 *
 * `g_face` centres the crop on a detected face and falls back to the image
 * centre when there isn't one; `f_auto`/`q_auto` let Cloudinary pick format and
 * compression per requesting browser.
 */
export function avatarUrl(url: string, size: number): string {
  const px = size * 2;
  return splice(url, `w_${px},h_${px},c_fill,g_face,f_auto,q_auto`);
}

/**
 * The whole picture as uploaded, for the expanded view — `c_limit` preserves
 * aspect ratio and never upscales, so this caps rather than crops. Uploads are
 * already limited to 1000px by MAX_STORED_DIMENSION in lib/storage/cloudinary.
 */
export function fullImageUrl(url: string): string {
  return splice(url, 'c_limit,w_1000,f_auto,q_auto');
}
