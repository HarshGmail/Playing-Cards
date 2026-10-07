import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';

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
  manifest: '/manifest.json',
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
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
