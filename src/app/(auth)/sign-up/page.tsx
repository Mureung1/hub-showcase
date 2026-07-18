import Link from 'next/link';
import { SignUpForm } from '../../../web/components/client/auth-forms';
export default function SignUpPage() { return <main><section className="glass glass-strong plane form-panel"><p className="eyebrow">Create account</p><h1>작게 시작해 끝까지</h1><p className="muted">계정을 만들고 첫 생존 루틴을 선택하세요.</p><SignUpForm /><p>이미 계정이 있나요? <Link href="/login"><strong>로그인</strong></Link></p></section></main> }
