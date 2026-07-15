import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  // Kept free of the English word "Darts" — <title> can't carry a lang="en" sub-tag, so a
  // screen reader announcing it on page load would read that word with Norwegian phonetics.
  // The visible heading spells it out fully, with that word correctly marked lang="en".
  title: '301/501',
  description: 'Spill 301 eller 501 dart med utgangstips og full kamphistorikk.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '301/501'
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
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
