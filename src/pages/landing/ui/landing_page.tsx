import { BrandLogo, Button, InlineLabel } from '@/shared/ui';

import { OnboardingMotionPreview } from './onboarding_motion_preview';
import './landing_page.css';

type LandingPageProps = {
  onStart: () => void;
};

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="landing-page" aria-labelledby="onboarding-title">
      <HeroSection onStart={onStart} />
      <SaveSection />
      <OnboardingMotionPreview />
      <FinalCallToAction onStart={onStart} />
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
          <nav aria-label="온보딩 섹션">
            <a href="#save-flow">저장</a>
            <a href="#retrieve-flow">꺼내보기</a>
          </nav>
        </div>
      </header>

      <div className="landing-hero__content">
        <div className="landing-hero__copy">
          <h1
            id="onboarding-title"
            aria-label="저장한 링크를 필요한 순간 다시 꺼내보세요"
          >
            저장한 <InlineLabel tone="blue">링크</InlineLabel>를
            <br />
            필요한 순간 <InlineLabel tone="amber">다시</InlineLabel> 꺼내보세요
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

function SaveSection() {
  return (
    <section
      className="landing-section landing-save-section"
      id="save-flow"
      aria-labelledby="onboarding-save-title"
    >
      <h2 id="onboarding-save-title">링크를 저장하고</h2>

      <div className="save-example" aria-label="링크 저장 예시">
        <div className="save-example__field">
          <span>링크 URL</span>
          <strong>https://example.com/article</strong>
        </div>
        <div className="save-example__result">
          <span aria-hidden="true" />
          <strong>저장 완료</strong>
        </div>
      </div>
    </section>
  );
}

function FinalCallToAction({ onStart }: LandingPageProps) {
  return (
    <section
      className="landing-final-cta"
      aria-labelledby="onboarding-final-title"
    >
      <div className="landing-final-cta__inner">
        <h2 id="onboarding-final-title">아맞다로 시작해보세요</h2>
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
    </section>
  );
}
