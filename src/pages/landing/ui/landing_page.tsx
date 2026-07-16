import { BrandLogo, Button, InlineLabel } from '@/shared/ui';

import { OnboardingFeatureTabs } from './onboarding_feature_tabs';
import './landing_page.css';

type LandingPageProps = {
  onStart: () => void;
};

const CONTACT_URL = 'https://github.com/ppre1ude/hub/issues/new';

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="landing-page" aria-labelledby="onboarding-title">
      <HeroSection onStart={onStart} />
      <OnboardingFeatureTabs />
      <ContactSection />
    </main>
  );
}

function HeroSection({ onStart }: LandingPageProps) {
  return (
    <section className="landing-hero" id="top">
      <header className="landing-header">
        <div className="landing-header__inner">
          <a className="landing-brand" href="#top" aria-label="아맞다 처음으로">
            <BrandLogo className="landing-brand__mark" />
            <span>아맞다</span>
          </a>
          <Button
            className="landing-login-action"
            hierarchy="secondary"
            onClick={onStart}
            size="medium"
            type="button"
          >
            로그인
          </Button>
        </div>
      </header>

      <div className="landing-hero__content">
        <div className="landing-hero__copy">
          <h1
            id="onboarding-title"
            aria-label="저장한 링크를 필요한 순간 다시 꺼내보세요"
          >
            저장한{' '}
            <InlineLabel emoji="🔖" tone="blue">
              링크
            </InlineLabel>
            를
            <br />
            필요한 순간{' '}
            <InlineLabel emoji="🪄" tone="amber">
              다시
            </InlineLabel>{' '}
            꺼내보세요
          </h1>
          <Button
            className="landing-primary-action"
            hierarchy="primary"
            onClick={onStart}
            size="large"
            type="button"
          >
            서비스 경험하기
          </Button>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section
      className="landing-contact"
      aria-labelledby="onboarding-contact-title"
    >
      <div className="landing-contact__art" aria-hidden="true">
        <span className="landing-contact__bookmark landing-contact__bookmark--amber" />
        <span className="landing-contact__bookmark landing-contact__bookmark--coral" />
        <span className="landing-contact__bookmark landing-contact__bookmark--pale-blue" />
      </div>

      <div className="landing-contact__inner">
        <h2 id="onboarding-contact-title">
          쓰다가 막히거나, 더 좋은 방법이 떠올랐나요?
        </h2>
        <p>
          버그와 개선 의견을 남겨주세요. 직접 확인하고 다음 개선에 반영할게요.
        </p>
        <a
          className="landing-contact__action"
          href={CONTACT_URL}
          rel="noreferrer"
          target="_blank"
        >
          문제·의견 남기기
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
