import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '301/501 Darts',
  description: 'Play 301 or 501 darts with checkout hints and full match history.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
