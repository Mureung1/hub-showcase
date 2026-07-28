import { BrandLogo, Button, StatusMessage } from '@/shared/ui';

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
      <div className="login-brand">
        <div className="login-brand-lockup">
          <BrandLogo className="login-brand-logo" />
          <span className="login-brand-name">아맞다</span>
        </div>

        <p className="visually-hidden">
          저장한 인사이트를 내 보관함에서 이어 보세요.
        </p>
        <p className="login-brand-message" aria-hidden="true">
          <span className="login-brand-line">
            <span>저장한</span>
            <span className="login-brand-highlight login-brand-highlight-blue">
              인사이트
            </span>
            <span className="login-brand-particle">를</span>
          </span>
          <span className="login-brand-line">내 보관함에서</span>
          <span className="login-brand-line">
            <span className="login-brand-highlight login-brand-highlight-amber">
              이어
            </span>
            <span>보세요.</span>
          </span>
        </p>
      </div>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-content">
          <h1 id="login-title">내 보관함으로 들어가기</h1>
          <p className="login-description">
            Google 계정으로 로그인하면 저장한 인사이트를 바로 볼 수 있어요.
          </p>

          {errorMessage ? (
            <StatusMessage title="로그인하지 못했어요" variant="error">
              <p>{errorMessage}</p>
            </StatusMessage>
          ) : null}

          <Button
            aria-label={isLoading ? 'Google에 연결하고 있어요.' : undefined}
            disabled={isLoading}
            fullWidth
            hierarchy="primary"
            loading={isLoading}
            onClick={onLogin}
            size="large"
            type="button"
          >
            {isLoading ? 'Google에 연결하고 있어요.' : 'Google로 로그인하기'}
          </Button>

          <p className="terms-notice">
            로그인하면 이용약관과 개인정보처리방침에 동의해요.
          </p>

          <Button
            className="login-back-action"
            hierarchy="ghost"
            onClick={onBack}
            type="button"
          >
            서비스 소개로 돌아가기
          </Button>
        </div>
      </section>
    </main>
  );
}
