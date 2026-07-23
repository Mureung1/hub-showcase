import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: '정류장 이용 집중도 | Campus Flow',
    description: '전국 10개 거점국립대의 실제 정류장 지도와 공공데이터 기반 시간대별 이용 집중도를 확인하세요.',
    openGraph: {
      title: '정류장 이용 집중도 | Campus Flow',
      description: '월별 승·하차 통계로 캠퍼스 정류장의 시간대별 이용 흐름을 살펴보세요.',
      images: [new URL('/og.png', metadataBase)],
    },
    twitter: { card: 'summary_large_image', images: [new URL('/og.png', metadataBase)] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
