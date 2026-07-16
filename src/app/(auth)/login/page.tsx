import Link from 'next/link';
import { safeReturnTo } from '../../../web/auth/return-to';
import { LoginForm } from '../../../web/components/client/auth-forms';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) { const { returnTo } = await searchParams; return <main><section className="glass glass-strong plane form-panel"><p className="eyebrow">Welcome back</p><h1>다시 집중할 시간이에요</h1><p className="muted">로그인하면 원래 하던 화면으로 안전하게 돌아갑니다.</p><LoginForm returnTo={safeReturnTo(returnTo)} /><p>처음이신가요? <Link href="/sign-up"><strong>가입하기</strong></Link></p></section></main> }
