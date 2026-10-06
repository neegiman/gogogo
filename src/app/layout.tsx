import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/components/AppProvider';
import Header from '@/components/Header';
import PwaManager from '@/components/PwaManager';
import { assetPath } from '@/lib/paths';
import { APP_NAME, APP_SHORT_NAME, APP_TAGLINE } from '@/lib/brand';
import './globals.css';
import './mobile.css';
export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_TAGLINE}`,
  description: '내 사진으로 만드는 우리 아이 첫 퍼즐. 사진은 이 기기에서만 사용됩니다.',
  manifest: assetPath('manifest.webmanifest'),
  icons: { icon: assetPath('icons/icon-192.png'), apple: assetPath('icons/icon-192.png') },
  appleWebApp: { capable: true, title: APP_SHORT_NAME, statusBarStyle: 'default' },
};
export const viewport: Viewport = { themeColor: '#fff6fa', width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><AppProvider><Header/>{children}<footer className="site-footer"><span className="footer-brand">{APP_TAGLINE}</span><PwaManager/></footer></AppProvider></body></html>;
}
