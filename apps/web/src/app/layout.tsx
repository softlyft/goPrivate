import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Sora } from 'next/font/google';
import { APP_NAME, DESCRIPTION, COLOR, brandCssVars } from '@goprivate/config';
import './globals.css';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: COLOR.background,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={brandCssVars() as CSSProperties}>
      <body className={`${sora.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
