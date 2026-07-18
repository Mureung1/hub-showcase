import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '../web/components/server/site-header';
export const metadata: Metadata = {
  title: { default: 'Survive Study', template: '%s · Survive Study' },
  description: '매일의 목표, 30분의 몰입, 한 번의 인증으로 만드는 생존 학습 루틴.',
  applicationName: 'Survive Study',
  keywords: ['공부 습관', '스터디 챌린지', '집중 타이머', '학습 인증', 'Survive Study'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Survive Study',
    title: 'Survive Study — 오늘을 증명하고, 끝까지 이어가세요',
    description: '의지를 시스템으로 바꾸는 30일 생존 학습 챌린지.',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body><SiteHeader />{children}{process.env.NODE_ENV !== 'production' && <span className="mock-badge">MOCK DATA</span>}</body></html> }
