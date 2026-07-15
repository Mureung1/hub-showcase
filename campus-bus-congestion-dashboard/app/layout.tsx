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
    title: '우리 학교 가는 길, 정류장부터 한눈에 | Campus Flow',
    description: '전국 10개 거점국립대의 실제 캠퍼스 경계와 주요 접근 정류장 30곳을 학교별로 둘러보세요.',
    openGraph: {
      title: '우리 학교 가는 길, 정류장부터 한눈에 | Campus Flow',
      description: '전국 10개 거점국립대의 실제 캠퍼스 경계와 주요 접근 정류장을 한곳에서 둘러보세요.',
      images: [new URL('/og.png', metadataBase)],
    },
    twitter: { card: 'summary_large_image', images: [new URL('/og.png', metadataBase)] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
