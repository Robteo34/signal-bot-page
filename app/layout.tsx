import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signal Bot',
  description: 'Market Intelligence Bot — UK Daily Trader',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Signal Bot',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050505',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" style={{ background: '#050505' }}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ background: '#050505', height: '100dvh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
