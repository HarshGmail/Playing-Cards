import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import InstallBanner from '@/components/pwa/InstallBanner';
import { INSTALL_CAPTURE_SCRIPT } from '@/lib/install/capture';
import { THEME_INIT_SCRIPT } from '@/lib/theme/theme';

const THEME_COLOR = '#4c1d95';

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  applicationName: 'Playing Cards',
  title: 'Playing Cards',
  description: 'Score tracker for card games',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Playing Cards',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: INSTALL_CAPTURE_SCRIPT }} />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <InstallBanner />
            {children}
          </ThemeProvider>
        </QueryProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
