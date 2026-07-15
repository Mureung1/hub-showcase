import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '캠퍼스 버스 혼잡도 | Campus Flow',
  description: '대학 캠퍼스 정류장별 버스 혼잡도를 한눈에 보여주는 대시보드',
  openGraph: { title: '캠퍼스 버스 혼잡도 | Campus Flow', description: '캠퍼스 정류장별 혼잡도를 비교하고 24시간 패턴을 살펴보세요.', images: ['/og.png'] },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
