import { Button, InlineLabel } from '@/shared/ui';

import { OnboardingMotionPreview } from './onboarding_motion_preview';
import './landing_page.css';

type LandingPageProps = {
  onStart: () => void;
};

const heroPreviewItems = [
  {
    category: '디자인',
    title: '모바일 온보딩 흐름',
    description: '첫 화면의 선택 부담 줄이기',
  },
  {
    category: '개발',
    title: 'React 폼 구현 글',
    description: '로그인 이후 입력 상태 관리',
  },
  {
    category: '프로젝트',
    title: '팀 프로젝트 기획서',
    description: '데모 시나리오와 사용자 흐름',
  },
] as const;

const problemItems = [
  {
    number: '01',
    title: '어디에 저장했는지 잊어요',
    description:
      '북마크, 메신저, 메모 앱에 흩어진 자료가 다시 찾기를 어렵게 합니다.',
  },
  {
    number: '02',
    title: '검색어가 기억나지 않아요',
    description:
      '필요한 건 떠오르지만, 저장 당시의 제목이나 키워드는 자주 사라집니다.',
  },
  {
    number: '03',
    title: '쓸 순간과 저장 순간이 달라요',
    description:
      '저장할 때의 분류보다, 나중에 하려는 일이 더 중요한 단서가 됩니다.',
  },
] as const;

const benefitItems = [
  {
    index: 'A',
    title: '키워드보다 상황',
    description: '정확한 제목을 몰라도 지금 하는 일로 자료를 다시 찾습니다.',
  },
  {
    index: 'B',
    title: '정리 부담 감소',
    description:
      '처음부터 완벽히 분류하지 않아도 저장과 재활용 흐름이 이어집니다.',
  },
  {
    index: 'C',
    title: '작업으로 연결',
    description:
      '과제, 팀 프로젝트, 공부, 포트폴리오 자료를 다시 실제 작업에 씁니다.',
  },
] as const;

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="landing-page" aria-labelledby="onboarding-title">
      <HeroSection onStart={onStart} />
      <ProblemSection />
      <SaveSection />
      <OnboardingMotionPreview />
      <BenefitSection />
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
            <span className="landing-brand__mark" aria-hidden="true" />
            <span>아맞다</span>
          </a>
          <nav aria-label="온보딩 섹션">
            <a href="#problem">문제</a>
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
            저장한{' '}
            <InlineLabel emoji="🔖" tone="blue">
              링크
            </InlineLabel>
            를
            <br />
            필요한 순간{' '}
            <InlineLabel emoji="✨" tone="green">
              다시 꺼내보세요
            </InlineLabel>
          </h1>
          <p className="landing-hero__description">
            흩어진 링크와 메모가 지금의 일에 다시 연결되는 개인 인사이트
            보관함입니다.
          </p>
          <div className="landing-hero__actions">
            <Button
              className="landing-primary-action"
              hierarchy="primary"
              onClick={onStart}
              size="large"
              type="button"
            >
              서비스 경험하기
            </Button>
            <p>로그인 후 나만의 보관함과 꺼내보기를 사용할 수 있어요.</p>
          </div>
          <p className="landing-principle">
            기억에는 온기를, 다시 찾는 과정에는 질서를.
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="hero-preview" aria-label="상황에 맞게 다시 꺼낸 링크 예시">
      <p className="hero-preview__situation">
        <span>지금 필요한 상황</span>
        <strong>팀 프로젝트 앱 첫 화면 참고</strong>
      </p>
      <div className="hero-preview__cards">
        {heroPreviewItems.map((item) => (
          <article className="hero-preview-card" key={item.category}>
            <span>{item.category}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProblemSection() {
  return (
    <section
      className="landing-section"
      id="problem"
      aria-labelledby="onboarding-problem-title"
    >
      <SectionHeading
        eyebrow="문제"
        id="onboarding-problem-title"
        title="저장해도 다시 찾기 어려웠던 이유"
      >
        유용한 링크는 많이 저장하지만, 필요한 순간에는 제목과 저장 위치, 정확한
        키워드가 잘 떠오르지 않습니다.
      </SectionHeading>

      <div className="landing-card-grid">
        {problemItems.map((item) => (
          <article className="landing-info-card" key={item.number}>
            <span className="landing-info-card__index" aria-hidden="true">
              {item.number}
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
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
      <SectionHeading
        eyebrow="저장"
        id="onboarding-save-title"
        title="저장은 빠르게, 정리는 나중에"
      >
        좋은 자료를 발견했을 때는 URL과 짧은 메모만 먼저 남깁니다. 카테고리와
        정리는 필요해지는 순간에 해도 충분합니다.
      </SectionHeading>

      <div className="save-example" aria-label="빠른 저장 흐름 예시">
        <div className="save-example__field">
          <span>링크 URL</span>
          <strong>https://example.com/article</strong>
        </div>
        <div className="save-example__field">
          <span>메모</span>
          <strong>나중에 팀 프로젝트 첫 화면 만들 때 다시 보기</strong>
        </div>
        <div className="save-example__result">
          <span aria-hidden="true" />
          <div>
            <strong>저장 완료</strong>
            <p>카테고리와 메모는 나중에 조정할 수 있어요.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitSection() {
  return (
    <section
      className="landing-section"
      aria-labelledby="onboarding-benefit-title"
    >
      <SectionHeading
        eyebrow="장점"
        id="onboarding-benefit-title"
        title="필요한 순간에 다시 꺼내는 방식"
      >
        저장은 끝이 아니라, 다음 작업을 위한 기억의 시작입니다.
      </SectionHeading>

      <div className="landing-card-grid">
        {benefitItems.map((item) => (
          <article className="landing-info-card" key={item.index}>
            <span className="landing-info-card__index" aria-hidden="true">
              {item.index}
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({
  children,
  eyebrow,
  id,
  title,
}: {
  children: string;
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <div className="landing-section__heading">
      <p className="landing-section__eyebrow">{eyebrow}</p>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}

function FinalCallToAction({ onStart }: LandingPageProps) {
  return (
    <section
      className="landing-final-cta"
      aria-labelledby="onboarding-final-title"
    >
      <div className="landing-final-cta__inner">
        <p className="landing-section__eyebrow">시작하기</p>
        <h2 id="onboarding-final-title">아맞다로 시작해보세요</h2>
        <p>
          저장한 링크가 나중의 나에게 다시 쓸모 있어지도록, 먼저 보관함을
          만들어보세요.
        </p>
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
