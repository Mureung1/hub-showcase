import { Button, StatusMessage } from '@/shared/ui';

import './login_page.css';

export type LoginPageProps = {
  errorMessage?: string;
  isLoading?: boolean;
  onBack: () => void;
  onLogin: () => void;
};

export function LoginPage({
  errorMessage,
  isLoading = false,
  onBack,
  onLogin,
}: LoginPageProps) {
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
        {errorMessage ? (
          <StatusMessage title="로그인하지 못했습니다" variant="error">
            <p>{errorMessage}</p>
          </StatusMessage>
        ) : null}
        <Button
          aria-label={isLoading ? 'Google 로그인 연결 중' : undefined}
          disabled={isLoading}
          fullWidth
          hierarchy="primary"
          loading={isLoading}
          onClick={onLogin}
          size="large"
          type="button"
        >
          {isLoading ? 'Google 로그인 연결 중' : 'Google로 시작하기'}
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
