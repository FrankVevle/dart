import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '301/501 Darts',
  description: 'Play 301 or 501 darts with checkout hints and full match history.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '301/501 Darts'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d1117'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
