import Link from 'next/link';
import { getSession } from '../../auth/session';
import { LogoutForm } from '../client/logout-form';

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="site-header">
      <nav className="site-nav glass-nav" aria-label="주요 메뉴">
        <Link className="brand" href="/" aria-label="Survive Study 홈">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-name">SURVIVE STUDY</span>
        </Link>
        <div className="nav-links">
          <Link href="/challenges">챌린지</Link>
          {session ? (
            <>
              <Link href="/dashboard">내 학습</Link>
              <Link href="/wallet">Point</Link>
              <Link href="/profile">프로필</Link>
              <LogoutForm />
            </>
          ) : (
            <>
              <Link href="/sign-up">가입</Link>
              <Link className="button-primary" href="/login">로그인</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
