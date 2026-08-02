import { avatarUrl } from '@/lib/cloudinaryUrl';

/**
 * Builds the avatar+name markup Highcharts renders for axis and legend labels.
 *
 * Highcharts inserts these strings as innerHTML (`useHTML: true`), and player
 * names come from user input, so everything interpolated here MUST be escaped —
 * a name containing `<img onerror=...>` would otherwise execute. React's usual
 * automatic escaping does not apply on this path.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only emit an <img> for URLs we actually serve pictures from.
 *
 * Defence in depth: `profilePicUrl` is written by the avatar upload route, but
 * older rows may predate that and PATCH /api/users/me used to accept any string
 * `z.string().url()` allowed — which includes `javascript:` URIs. Anything that
 * isn't a Cloudinary HTTPS URL falls back to initials rather than reaching the
 * DOM as a src.
 */
function isDeliverableImage(url: string): boolean {
  return url.startsWith('https://res.cloudinary.com/');
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

interface PlayerLabelOptions {
  name: string;
  profilePicUrl?: string | null;
  /** Rendered avatar size in px. */
  size?: number;
  /** Stack the face above the name (axis labels) or beside it (legend items). */
  stacked?: boolean;
}

export function playerLabelHtml({
  name,
  profilePicUrl,
  size = 26,
  stacked = true,
}: PlayerLabelOptions): string {
  const safeName = escapeHtml(name);
  const box = `width:${size}px;height:${size}px;border-radius:9999px;flex-shrink:0;`;

  const face =
    profilePicUrl && isDeliverableImage(profilePicUrl)
      ? `<img src="${escapeHtml(avatarUrl(profilePicUrl, size))}" alt="" style="${box}object-fit:cover;" />`
      : `<span style="${box}display:flex;align-items:center;justify-content:center;` +
        `background:#2563eb;color:#fff;font-size:${Math.round(size * 0.4)}px;font-weight:700;">` +
        `${escapeHtml(initialsOf(name))}</span>`;

  const layout = stacked
    ? 'flex-direction:column;gap:2px;'
    : 'flex-direction:row;gap:6px;';

  return (
    `<span style="display:inline-flex;align-items:center;${layout}">` +
    `${face}<span>${safeName}</span>` +
    `</span>`
  );
}
