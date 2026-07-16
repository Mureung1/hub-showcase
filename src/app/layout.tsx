import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '../web/components/server/site-header';
export const metadata: Metadata = { title: { default: 'Survive Study', template: '%s · Survive Study' }, description: '매일 30분의 목표와 인증으로 만드는 생존 학습 루틴' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body><SiteHeader />{children}{process.env.NODE_ENV !== 'production' && <span className="mock-badge">MOCK DATA</span>}</body></html> }
