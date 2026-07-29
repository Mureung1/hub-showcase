import { type KeyboardEvent, useId, useRef, useState } from 'react';

type FeatureTabId = 'category' | 'retrieve' | 'save';

type FeatureTab = {
  id: FeatureTabId;
  label: string;
};

const FEATURE_TABS: readonly FeatureTab[] = [
  { id: 'save', label: '01 저장' },
  { id: 'category', label: '02 분류' },
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
        aria-label="발견한 링크가 필요한 순간 다시 쓰이도록, 아맞다가 저장부터 꺼내보기까지 이어드려요."
        id={`${baseId}-title`}
      >
        발견한 링크가 필요한 순간 다시 쓰이도록,
        <br />
        아맞다가 저장부터 꺼내보기까지 이어드려요.
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
      <div className="feature-scene__stage feature-scene__stage--save">
        <div className="feature-scene__heading">
          <span>저장</span>
          <strong>URL을 입력하면 바로 저장해요</strong>
          <p>먼저 저장하고 필요한 정보는 나중에 더해도 돼요.</p>
        </div>
        <div className="feature-scene__action-row">
          <div className="feature-mini-field">
            <small>URL</small>
            <span>https://example.com/article</span>
          </div>
          <span className="feature-mini-action">저장하기</span>
        </div>
      </div>
      <div className="feature-scene__body feature-scene__body--save">
        <div className="feature-save-followup">
          <strong>인사이트를 저장했어요</strong>
          <p>제목·메모·분류는 저장 후에도 더할 수 있어요</p>
          <div
            aria-label="선택 정보 예시"
            className="feature-save-options"
            role="group"
          >
            <span>제목 (선택)</span>
            <span>한 줄 메모 (선택)</span>
            <span>카테고리 (선택)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryFeaturePreview() {
  return (
    <div className="feature-preview feature-preview--category">
      <div className="feature-scene__stage feature-scene__stage--category">
        <div className="feature-scene__heading">
          <span>보관함</span>
          <strong>전체 인사이트</strong>
          <p>카테고리와 검색으로 저장한 인사이트를 찾아 보세요.</p>
        </div>
        <div className="feature-scene__action-row">
          <div className="feature-mini-field">
            <small>보관함 검색</small>
            <span>제목, 메모, 카테고리, 도메인이나 URL 검색</span>
          </div>
          <span className="feature-mini-action feature-mini-action--outline">
            인사이트 가져오기
          </span>
        </div>
      </div>
      <div className="feature-scene__body">
        <div className="feature-category-filter">
          <strong>카테고리</strong>
          <div
            aria-label="카테고리 예시"
            className="feature-category-chips"
            role="group"
          >
            <span>전체</span>
            <span className="is-selected">디자인</span>
            <span>개발</span>
            <span>프로젝트</span>
          </div>
        </div>
        <p className="feature-result-count">인사이트 12개</p>
        <div className="feature-library-grid">
          <article>
            <small>refero.design</small>
            <strong>브랜드 랜딩 사례</strong>
            <span>디자인</span>
          </article>
          <article>
            <small>developer.mozilla.org</small>
            <strong>접근 가능한 탭 패턴</strong>
            <span>개발</span>
          </article>
        </div>
      </div>
    </div>
  );
}

function RetrieveFeaturePreview() {
  return (
    <div className="feature-preview feature-preview--retrieve">
      <div className="feature-scene__stage feature-scene__stage--retrieve">
        <div className="feature-scene__heading feature-scene__heading--center">
          <span>꺼내보기</span>
          <strong>지금 필요한 인사이트를 꺼내 보세요</strong>
        </div>
        <div className="feature-scene__action-row">
          <div className="feature-mini-field">
            <small>지금 필요한 상황</small>
            <span>포트폴리오 첫 화면 참고</span>
          </div>
          <span className="feature-mini-action">꺼내보기</span>
        </div>
      </div>
      <div className="feature-scene__body">
        <div
          aria-label="추천 상황 예시"
          className="feature-suggestions"
          role="group"
        >
          <span>과제 참고자료 다시 찾기</span>
          <span>프로젝트에 쓸 자료 꺼내기</span>
          <span>디자인·개발 레퍼런스 찾기</span>
        </div>
        <p className="feature-scene__summary">
          떠오르는 단어나 지금 하는 일을 짧게 적어 보세요.
        </p>
        <div className="feature-results">
          <RetrieveCard domain="medium.com" title="모바일 온보딩 흐름" />
          <RetrieveCard domain="refero.design" title="브랜드 랜딩 사례" />
        </div>
      </div>
    </div>
  );
}

function RetrieveCard({ domain, title }: { domain: string; title: string }) {
  return (
    <article className="feature-result-card">
      <small>{domain}</small>
      <strong>{title}</strong>
      <div className="feature-result-card__footer">
        <b>원문 열기 ↗</b>
      </div>
    </article>
  );
}
