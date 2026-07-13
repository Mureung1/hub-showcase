import { Button } from '@/shared/ui';

import './login_page.css';

export type LoginPageProps = {
  onBack: () => void;
  onLogin: () => void;
};

export function LoginPage({ onBack, onLogin }: LoginPageProps) {
  return (
    <main className="login-shell" aria-labelledby="login-title">
      <section className="login-panel">
        <Button
          className="login-back-action"
          hierarchy="ghost"
          onClick={onBack}
          type="button"
        >
          서비스 소개로
        </Button>
        <p className="login-eyebrow">로그인</p>
        <h1 id="login-title">환영합니다!</h1>
        <p className="login-description">
          로그인 후 나만의 보관함과 꺼내보기를 사용할 수 있어요.
        </p>
        <Button
          fullWidth
          hierarchy="primary"
          onClick={onLogin}
          size="large"
          type="button"
        >
          Google로 시작하기
        </Button>
        <div className="login-divider">
          <span>간편 로그인</span>
        </div>
        <p className="terms-notice">
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </section>
    </main>
  );
}
