import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef } from 'react';

import { BrandLogo, Button, InlineLabel } from '@/shared/ui';

import { OnboardingFeatureTabs } from './onboarding_feature_tabs';
import './landing_page.css';

gsap.registerPlugin(useGSAP);

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
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          const timeline = gsap.timeline({
            defaults: {
              duration: 0.28,
              ease: 'power2.out',
            },
          });

          timeline
            .fromTo(
              '.landing-hero__plain--saved, .landing-hero__plain--object',
              { autoAlpha: 0, y: 12 },
              { autoAlpha: 1, y: 0 },
              0.04
            )
            .fromTo(
              '.landing-hero__highlight--blue',
              { clipPath: 'inset(0 100% 0 0)', y: -14 },
              {
                clipPath: 'inset(0 0% 0 0)',
                duration: 0.38,
                y: 0,
              },
              0.12
            )
            .fromTo(
              ".landing-hero__highlight--blue .inline-label > [aria-hidden='true']",
              { rotate: -12, scale: 0.82 },
              { rotate: 0, scale: 1 },
              0.24
            )
            .fromTo(
              '.landing-hero__plain--moment, .landing-hero__plain--retrieve',
              { autoAlpha: 0, y: 12 },
              { autoAlpha: 1, y: 0 },
              0.38
            )
            .fromTo(
              '.landing-hero__highlight--amber',
              { clipPath: 'inset(100% 0 0 0)', y: 18 },
              {
                clipPath: 'inset(0% 0 0 0)',
                duration: 0.4,
                ease: 'back.out(1.35)',
                y: 0,
              },
              0.46
            )
            .fromTo(
              ".landing-hero__highlight--amber .inline-label > [aria-hidden='true']",
              { rotate: -10, scale: 0.82 },
              { rotate: 0, scale: 1 },
              0.58
            )
            .fromTo(
              '.landing-hero__spark',
              { autoAlpha: 0, scale: 0.65, y: 4 },
              {
                autoAlpha: 1,
                duration: 0.18,
                scale: 1,
                stagger: 0.04,
                y: 0,
                yoyo: true,
                repeat: 1,
              },
              0.67
            )
            .fromTo(
              '.landing-primary-action',
              { autoAlpha: 0, y: 10 },
              { autoAlpha: 1, duration: 0.28, y: 0 },
              0.82
            );
        }
      );

      return () => media.revert();
    },
    { scope: heroRef }
  );

  return (
    <section className="landing-hero" id="top" ref={heroRef}>
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
            aria-label="저장한 인사이트를 필요한 순간 다시 꺼내 보세요"
          >
            <span className="landing-hero__line">
              <span className="landing-hero__plain landing-hero__plain--saved">
                저장한
              </span>
              <span className="landing-hero__highlight landing-hero__highlight--blue">
                <InlineLabel emoji="🔖" tone="blue">
                  인사이트
                </InlineLabel>
              </span>
              <span className="landing-hero__plain landing-hero__plain--object">
                를
              </span>
            </span>
            <span className="landing-hero__line">
              <span className="landing-hero__plain landing-hero__plain--moment">
                필요한 순간
              </span>
              <span className="landing-hero__highlight landing-hero__highlight--amber">
                <InlineLabel emoji="🪄" tone="amber">
                  다시
                </InlineLabel>
                <span
                  aria-hidden="true"
                  className="landing-hero__spark landing-hero__spark--one"
                >
                  ✦
                </span>
                <span
                  aria-hidden="true"
                  className="landing-hero__spark landing-hero__spark--two"
                >
                  ✦
                </span>
              </span>
              <span className="landing-hero__plain landing-hero__plain--retrieve">
                꺼내 보세요
              </span>
            </span>
          </h1>
          <Button
            className="landing-primary-action"
            hierarchy="primary"
            onClick={onStart}
            size="large"
            type="button"
          >
            아맞다 시작하기
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
          버그와 개선 의견을 남겨 주세요. 직접 확인하고 다음 개선에 반영할게요.
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
