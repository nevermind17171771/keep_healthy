import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'KEEP HEALTHY · 나의 운동 기록',
  description: '오늘의 기록이 다음 운동의 기준이 되도록. 운동, 루틴, 근육 지도와 나의 성장.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'KEEP HEALTHY',
    statusBarStyle: 'black-translucent'
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png'
  }
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#121417'
};
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <html lang="ko"><body>{children}</body></html>;
}
