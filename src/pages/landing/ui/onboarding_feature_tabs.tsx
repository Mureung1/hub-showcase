import { type KeyboardEvent, useId, useRef, useState } from 'react';

type FeatureTabId = 'category' | 'retrieve' | 'save';

type FeatureTab = {
  id: FeatureTabId;
  label: string;
};

const FEATURE_TABS: readonly FeatureTab[] = [
  { id: 'save', label: '01 저장' },
  { id: 'category', label: '02 카테고리' },
  { id: 'retrieve', label: '03 꺼내보기' },
];

export function OnboardingFeatureTabs() {
  const [activeTab, setActiveTab] = useState<FeatureTabId>('save');
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = FEATURE_TABS.findIndex((tab) => tab.id === activeTab);
  const activeFeature = FEATURE_TABS[activeIndex];

  function selectTab(index: number, moveFocus = false) {
    const nextTab = FEATURE_TABS[index];

    setActiveTab(nextTab.id);

    if (moveFocus) {
      tabRefs.current[index]?.focus();
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % FEATURE_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + FEATURE_TABS.length) % FEATURE_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = FEATURE_TABS.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    selectTab(nextIndex, true);
  }

  return (
    <section className="feature-showcase" aria-labelledby={`${baseId}-title`}>
      <h2
        aria-label="발견한 링크를 인사이트로 저장하고 필요한 순간 다시 꺼내 보세요."
        id={`${baseId}-title`}
      >
        발견한 링크를 인사이트로 저장하고
        <br />
        필요한 순간 다시 꺼내 보세요.
      </h2>

      <div
        aria-label="아맞다 핵심 기능"
        className="feature-tabs"
        role="tablist"
      >
        {FEATURE_TABS.map((tab, index) => {
          const selected = tab.id === activeTab;

          return (
            <button
              aria-controls={`${baseId}-panel-${tab.id}`}
              aria-selected={selected}
              className="feature-tab"
              id={`${baseId}-tab-${tab.id}`}
              key={tab.id}
              onClick={() => selectTab(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby={`${baseId}-tab-${activeFeature.id}`}
        className="feature-panel"
        id={`${baseId}-panel-${activeFeature.id}`}
        role="tabpanel"
        tabIndex={0}
      >
        {renderFeaturePanel(activeFeature.id)}
      </div>
    </section>
  );
}

function renderFeaturePanel(activeTab: FeatureTabId) {
  if (activeTab === 'category') {
    return <CategoryFeaturePreview />;
  }

  if (activeTab === 'retrieve') {
    return <RetrieveFeaturePreview />;
  }

  return <SaveFeaturePreview />;
}

function SaveFeaturePreview() {
  return (
    <div className="feature-preview feature-preview--save">
      <PreviewToolbar index="01" title="인사이트 저장" />
      <div className="feature-save-flow">
        <div className="feature-field">
          <span>URL</span>
          <strong>https://example.com/article</strong>
        </div>
        <span className="feature-primary-action">인사이트 저장하기</span>
      </div>
      <div className="feature-status">
        <span aria-hidden="true" />
        <strong>인사이트를 저장했어요</strong>
      </div>
    </div>
  );
}

function CategoryFeaturePreview() {
  return (
    <div className="feature-preview feature-preview--category">
      <PreviewToolbar index="12개" title="보관함" />
      <div className="feature-category-filter">
        <span>카테고리</span>
        <div aria-label="카테고리 예시" className="feature-category-chips">
          <span>전체</span>
          <span className="is-selected">디자인</span>
          <span>개발</span>
          <span>프로젝트</span>
        </div>
      </div>
      <div className="feature-library-grid">
        <article>
          <span className="feature-card-accent feature-card-accent--amber" />
          <small>refero.design</small>
          <strong>브랜드 랜딩 사례</strong>
        </article>
        <article>
          <span className="feature-card-accent feature-card-accent--blue" />
          <small>developer.mozilla.org</small>
          <strong>접근 가능한 탭 패턴</strong>
        </article>
      </div>
    </div>
  );
}

function RetrieveFeaturePreview() {
  return (
    <div className="feature-preview feature-preview--retrieve">
      <PreviewToolbar index="03" title="꺼내보기" />
      <p className="feature-query">
        <span>지금 필요한 상황</span>
        <strong>포트폴리오 첫 화면 참고</strong>
      </p>
      <div className="feature-results">
        <RetrieveCard
          clue="메모의 “첫 화면”과 연결"
          domain="medium.com"
          title="모바일 온보딩 흐름"
        />
        <RetrieveCard
          clue="제목의 “랜딩”과 연결"
          domain="refero.design"
          title="브랜드 랜딩 사례"
        />
      </div>
    </div>
  );
}

function PreviewToolbar({ index, title }: { index: string; title: string }) {
  return (
    <div className="feature-preview__toolbar">
      <strong>{title}</strong>
      <span>{index}</span>
    </div>
  );
}

function RetrieveCard({
  clue,
  domain,
  title,
}: {
  clue: string;
  domain: string;
  title: string;
}) {
  return (
    <article className="feature-result-card">
      <small>{domain}</small>
      <strong>{title}</strong>
      <div className="feature-result-card__footer">
        <span>{clue}</span>
        <b>원문 열기 ↗</b>
      </div>
    </article>
  );
}
