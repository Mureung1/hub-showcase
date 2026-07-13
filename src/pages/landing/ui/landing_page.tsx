import { Button } from '@wanteddev/wds';

import { OnboardingMotionPreview } from './onboarding_motion_preview';
import './landing_page.css';

type LandingPageProps = {
  onStart: () => void;
};

const problemItems = [
  {
    number: '01',
    title: '어디에 저장했는지 잊어요',
    description:
      '북마크, 메신저, 메모 앱에 흩어진 자료가 다시 찾기를 어렵게 합니다.',
    tone: 'coral',
  },
  {
    number: '02',
    title: '검색어가 기억나지 않아요',
    description:
      '필요한 건 떠오르지만, 저장 당시의 제목이나 키워드는 자주 사라집니다.',
    tone: 'yellow',
  },
  {
    number: '03',
    title: '쓸 순간과 저장 순간이 달라요',
    description:
      '저장할 때의 분류보다, 나중에 하려는 일이 더 중요한 단서가 됩니다.',
    tone: 'leaf',
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
      <header className="landing-nav" aria-label="서비스 소개">
        <a className="landing-brand" href="#top" aria-label="아맞다 처음으로">
          <span>아맞다</span>
          <span className="landing-brand__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </a>
        <nav aria-label="온보딩 섹션">
          <a href="#problem">01 문제</a>
          <a href="#save-flow">02 저장</a>
          <a href="#retrieve-flow">03 꺼내보기</a>
        </nav>
      </header>

      <div className="landing-hero__grid">
        <div className="landing-hero__copy">
          <span className="archive-index">ARCHIVE 001</span>
          <h1 id="onboarding-title">
            저장한 링크를 필요한 순간 다시 꺼내보세요
          </h1>
          <p className="landing-hero__description">
            흩어진 링크와 메모가 지금의 일에 다시 연결되는 개인 인사이트
            보관함입니다.
          </p>
          <div className="landing-hero__actions">
            <Button
              className="landing-primary-action"
              color="primary"
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

        <HeroArchiveCards />
      </div>
    </section>
  );
}

function HeroArchiveCards() {
  return (
    <div className="hero-archive" aria-hidden="true">
      <div className="hero-archive__caption">
        <span>YOUR SAVED MEMORY</span>
        <span>12 ITEMS</span>
      </div>
      <article className="archive-note archive-note--design">
        <span>DESIGN / 02</span>
        <strong>첫 화면의 선택 부담 줄이기</strong>
        <small>팀 프로젝트 만들 때 다시 보기</small>
      </article>
      <article className="archive-note archive-note--memo">
        <span>MEMO / 08</span>
        <strong>필요한 순간 다시 연결</strong>
        <small>저장보다 꺼내는 장면에 집중</small>
      </article>
      <article className="archive-note archive-note--dev">
        <span>DEV / 14</span>
        <strong>폼 상태 관리 참고</strong>
        <small>로그인 흐름 구현할 때</small>
      </article>
      <span className="hero-archive__stamp">다시 쓰는 기억</span>
    </div>
  );
}

function ProblemSection() {
  return (
    <section
      className="landing-section landing-problem-section"
      id="problem"
      aria-labelledby="onboarding-problem-title"
    >
      <div className="landing-section__heading">
        <span className="archive-index">01 / PROBLEM</span>
        <div>
          <h2 id="onboarding-problem-title">
            저장해도 다시 찾기 어려웠던 이유
          </h2>
          <p>
            유용한 링크는 많이 저장하지만, 필요한 순간에는 제목과 저장 위치,
            정확한 키워드가 잘 떠오르지 않습니다.
          </p>
        </div>
      </div>

      <div className="problem-index">
        {problemItems.map((item) => (
          <article className="problem-index__item" key={item.number}>
            <span className={`problem-number problem-number--${item.tone}`}>
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
      className="landing-save-section"
      id="save-flow"
      aria-labelledby="onboarding-save-title"
    >
      <div className="landing-save-section__inner">
        <div className="landing-save-section__copy">
          <span className="archive-index archive-index--light">02 / SAVE</span>
          <h2 id="onboarding-save-title">저장은 빠르게, 정리는 나중에</h2>
          <p>
            좋은 자료를 발견했을 때는 URL과 짧은 메모만 먼저 남깁니다.
            카테고리와 정리는 필요해지는 순간에 해도 충분합니다.
          </p>
          <span className="save-section-note">SAVE FIRST · SORT LATER</span>
        </div>

        <div className="save-paper" aria-label="저장 흐름 예시">
          <div className="save-paper__topline">
            <span>NEW ARCHIVE</span>
            <span>2026.07.10</span>
          </div>
          <div className="save-paper__field">
            <span>LINK URL</span>
            <strong>https://example.com/article</strong>
          </div>
          <div className="save-paper__field save-paper__field--memo">
            <span>MEMO</span>
            <strong>나중에 팀 프로젝트 첫 화면 만들 때 다시 보기</strong>
          </div>
          <div className="save-paper__result">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>저장 완료</strong>
              <small>카테고리와 메모는 나중에 조정할 수 있어요.</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitSection() {
  return (
    <section
      className="landing-section landing-benefit-section"
      aria-labelledby="onboarding-benefit-title"
    >
      <div className="landing-section__heading">
        <span className="archive-index">WHY IT MATTERS</span>
        <div>
          <h2 id="onboarding-benefit-title">필요한 순간에 다시 꺼내는 방식</h2>
          <p>저장은 끝이 아니라, 다음 작업을 위한 기억의 시작입니다.</p>
        </div>
      </div>

      <div className="benefit-index">
        {benefitItems.map((item) => (
          <article key={item.index}>
            <span>{item.index}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
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
      <span className="archive-index archive-index--light">START / 001</span>
      <h2 id="onboarding-final-title">아맞다로 시작해보세요</h2>
      <p>
        저장한 링크가 나중의 나에게 다시 쓸모 있어지도록, 먼저 보관함을
        만들어보세요.
      </p>
      <Button
        className="landing-primary-action landing-primary-action--final"
        color="primary"
        onClick={onStart}
        size="large"
        type="button"
      >
        서비스 경험하기
      </Button>
      <div className="landing-final-cta__palette" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </section>
  );
}
