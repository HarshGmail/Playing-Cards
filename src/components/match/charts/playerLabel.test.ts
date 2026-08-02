import { describe, it, expect } from 'vitest';
import { playerLabelHtml } from './playerLabel';

const CLOUDINARY = 'https://res.cloudinary.com/demo/image/upload/v123/avatars/abc.jpg';

describe('playerLabelHtml', () => {
  describe('escaping', () => {
    // Highcharts renders these strings via innerHTML, and display names are
    // user-supplied, so unescaped output here is a stored-XSS vector.
    it('escapes angle brackets in a name', () => {
      const html = playerLabelHtml({ name: '<img src=x onerror=alert(1)>' });
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('escapes quotes so a name cannot break out of an attribute', () => {
      const html = playerLabelHtml({ name: '" onmouseover="alert(1)' });
      expect(html).toContain('&quot;');
      expect(html).not.toContain('" onmouseover="alert(1)');
    });

    it('escapes ampersands without double-encoding the escapes it adds', () => {
      expect(playerLabelHtml({ name: 'Tom & Jerry' })).toContain('Tom &amp; Jerry');
    });

    it('escapes a name used for the initials fallback', () => {
      // Initials are derived from the name, so they need escaping too.
      const html = playerLabelHtml({ name: '<b >x' });
      expect(html).not.toMatch(/<b\s/);
    });
  });

  describe('image source allow-listing', () => {
    it('renders an img for a Cloudinary https URL', () => {
      const html = playerLabelHtml({ name: 'Ada', profilePicUrl: CLOUDINARY });
      expect(html).toContain('<img src="https://res.cloudinary.com/');
      expect(html).toContain('c_fill,g_face');
    });

    it('refuses a javascript: URI and falls back to initials', () => {
      // PATCH /api/users/me used to accept any z.string().url(), and new URL()
      // treats javascript: as valid, so old rows may hold one.
      const html = playerLabelHtml({ name: 'Ada', profilePicUrl: 'javascript:alert(1)' });
      expect(html).not.toContain('javascript:');
      expect(html).not.toContain('<img');
      expect(html).toContain('A');
    });

    it('refuses a data: URI', () => {
      const html = playerLabelHtml({ name: 'Ada', profilePicUrl: 'data:text/html,<script>' });
      expect(html).not.toContain('<img');
      expect(html).not.toContain('data:');
    });

    it('refuses an off-domain host', () => {
      const html = playerLabelHtml({ name: 'Ada', profilePicUrl: 'https://evil.example/a.jpg' });
      expect(html).not.toContain('<img');
      expect(html).not.toContain('evil.example');
    });

    it('refuses plain http, even on the Cloudinary host', () => {
      const html = playerLabelHtml({
        name: 'Ada',
        profilePicUrl: 'http://res.cloudinary.com/demo/image/upload/v1/a.jpg',
      });
      expect(html).not.toContain('<img');
    });
  });

  describe('rendering', () => {
    it('falls back to two-letter initials when there is no picture', () => {
      const html = playerLabelHtml({ name: 'Ada Lovelace', profilePicUrl: null });
      expect(html).toContain('AL');
      expect(html).not.toContain('<img');
    });

    it('requests the avatar at 2x the given size for retina', () => {
      expect(playerLabelHtml({ name: 'Ada', profilePicUrl: CLOUDINARY, size: 20 })).toContain(
        'w_40,h_40'
      );
    });

    it('stacks by default and rows when asked', () => {
      expect(playerLabelHtml({ name: 'Ada' })).toContain('flex-direction:column');
      expect(playerLabelHtml({ name: 'Ada', stacked: false })).toContain('flex-direction:row');
    });
  });
});
