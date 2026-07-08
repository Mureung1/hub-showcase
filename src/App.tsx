import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

type Tab = 'library' | 'home' | 'save';

type CategoryTone = 'blue' | 'green' | 'amber' | 'rose' | 'slate';

type Insight = {
  id: number;
  title: string;
  domain: string;
  memo?: string;
  categories: Array<{ name: string; tone: CategoryTone }>;
  thumbnail: string;
  url: string;
};

const initialInsights: Insight[] = [
  {
    id: 1,
    title: '모바일 온보딩에서 선택 부담을 줄이는 패턴',
    domain: 'uxplanet.org',
    memo: '관심 분야 선택 화면 만들 때 참고하기',
    categories: [
      { name: '디자인', tone: 'blue' },
      { name: '온보딩', tone: 'green' },
    ],
    thumbnail: 'UX',
    url: '#',
  },
  {
    id: 2,
    title: 'Supabase RLS 정책을 프론트에서 검증하는 방법',
    domain: 'supabase.com',
    memo: '사용자별 보관함 분리 확인 체크리스트',
    categories: [
      { name: '개발', tone: 'green' },
      { name: '보안', tone: 'rose' },
    ],
    thumbnail: 'DB',
    url: '#',
  },
  {
    id: 3,
    title: '팀 프로젝트 앱 기획서 구조와 데모 시나리오',
    domain: 'brunch.co.kr',
    memo: '데모데이 발표 흐름 정리할 때 다시 보기',
    categories: [
      { name: '팀프로젝트', tone: 'amber' },
      { name: '기획', tone: 'slate' },
    ],
    thumbnail: 'PM',
    url: '#',
  },
  {
    id: 4,
    title: '카드 UI에서 메타 정보와 CTA를 분리하는 법',
    domain: 'refero.design',
    memo: '인사이트 카드의 원문 열기 위치 결정',
    categories: [{ name: '디자인', tone: 'blue' }],
    thumbnail: 'UI',
    url: '#',
  },
  {
    id: 5,
    title: 'Fuse.js 검색 가중치 설정 예시',
    domain: 'fusejs.io',
    categories: [{ name: '개발', tone: 'green' }],
    thumbnail: 'JS',
    url: '#',
  },
  {
    id: 6,
    title: '포트폴리오 프로젝트 회고 작성 가이드',
    domain: 'medium.com',
    memo: '취업 준비 자료로 분리해두기',
    categories: [{ name: '취업', tone: 'rose' }],
    thumbnail: 'CV',
    url: '#',
  },
];

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'library', label: '보관함' },
  { id: 'home', label: '홈' },
  { id: 'save', label: '저장' },
];

const categoryFilters = ['All', '개발', '디자인', '팀프로젝트', '미분류'];
const suggestedSituations = [
  '팀 프로젝트 앱 디자인 참고',
  '개발 공부 정리',
  '온보딩 화면 만들기',
  '취업 포트폴리오 준비',
];
const suggestedCategories: Array<{ name: string; tone: CategoryTone }> = [
  { name: '개발', tone: 'green' },
  { name: '디자인', tone: 'blue' },
  { name: '공부', tone: 'amber' },
  { name: '팀프로젝트', tone: 'slate' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [insights, setInsights] = useState(initialInsights);
  const [retrieveQuery, setRetrieveQuery] =
    useState('팀 프로젝트 앱 디자인 참고');
  const [selectedSituation, setSelectedSituation] = useState(
    suggestedSituations[0]
  );
  const [hasRetrieved, setHasRetrieved] = useState(true);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [saveUrl, setSaveUrl] = useState('');
  const [saveComplete, setSaveComplete] = useState(false);

  const retrieveResults = useMemo(() => {
    const normalized = `${retrieveQuery} ${selectedSituation}`
      .trim()
      .toLowerCase();
    if (!normalized) {
      return insights.slice(0, 3);
    }

    return insights
      .filter((insight) => {
        const haystack = [
          insight.title,
          insight.domain,
          insight.memo ?? '',
          ...insight.categories.map((category) => category.name),
        ]
          .join(' ')
          .toLowerCase();

        return normalized
          .split(/\s+/)
          .filter(Boolean)
          .some((token) => haystack.includes(token));
      })
      .slice(0, 6);
  }, [insights, retrieveQuery, selectedSituation]);

  const libraryInsights = useMemo(() => {
    const normalized = libraryQuery.trim().toLowerCase();

    return insights.filter((insight) => {
      const matchesCategory =
        activeCategory === 'All' ||
        (activeCategory === '미분류' && insight.categories.length === 0) ||
        insight.categories.some((category) => category.name === activeCategory);

      const haystack = [
        insight.title,
        insight.domain,
        insight.memo ?? '',
        ...insight.categories.map((category) => category.name),
      ]
        .join(' ')
        .toLowerCase();

      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [activeCategory, insights, libraryQuery]);

  function handleRetrieve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasRetrieved(true);
  }

  function handleSituationClick(situation: string) {
    setSelectedSituation(situation);
    setRetrieveQuery(situation);
    setHasRetrieved(true);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!saveUrl.trim()) {
      return;
    }

    setInsights((current) => [
      {
        id: Date.now(),
        title: '저장한 링크의 제목을 불러오는 중',
        domain: new URL(saveUrl).hostname.replace(/^www\./, ''),
        memo: '카테고리와 메모는 나중에 정리할 수 있습니다.',
        categories: [],
        thumbnail: 'NEW',
        url: '#',
      },
      ...current,
    ]);
    setSaveComplete(true);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">아맞다</p>
          <h1>{getScreenTitle(activeTab)}</h1>
        </div>
        <button
          className="profile-button"
          type="button"
          aria-label="프로필 메뉴 열기"
        >
          최
        </button>
      </header>

      <main
        className="app-main"
        aria-label={`${getScreenTitle(activeTab)} 화면`}
      >
        {activeTab === 'home' && (
          <HomeView
            hasRetrieved={hasRetrieved}
            query={retrieveQuery}
            results={retrieveResults}
            selectedSituation={selectedSituation}
            setQuery={setRetrieveQuery}
            onRetrieve={handleRetrieve}
            onSituationClick={handleSituationClick}
          />
        )}
        {activeTab === 'library' && (
          <LibraryView
            activeCategory={activeCategory}
            insights={libraryInsights}
            query={libraryQuery}
            setActiveCategory={setActiveCategory}
            setQuery={setLibraryQuery}
          />
        )}
        {activeTab === 'save' && (
          <SaveView
            saveComplete={saveComplete}
            saveUrl={saveUrl}
            setSaveComplete={setSaveComplete}
            setSaveUrl={setSaveUrl}
            onSave={handleSave}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="주요 화면">
        {tabs.map((tab) => (
          <button
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className="nav-item"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomeView({
  hasRetrieved,
  query,
  results,
  selectedSituation,
  setQuery,
  onRetrieve,
  onSituationClick,
}: {
  hasRetrieved: boolean;
  query: string;
  results: Insight[];
  selectedSituation: string;
  setQuery: (value: string) => void;
  onRetrieve: (event: FormEvent<HTMLFormElement>) => void;
  onSituationClick: (situation: string) => void;
}) {
  return (
    <>
      <section className="retrieve-panel" aria-labelledby="retrieve-title">
        <div className="section-heading">
          <p className="eyebrow">꺼내보기</p>
          <h2 id="retrieve-title">지금 하려는 일에 맞는 인사이트를 찾아요</h2>
        </div>

        <form className="retrieve-form" onSubmit={onRetrieve}>
          <label htmlFor="retrieve-query">현재 상황</label>
          <div className="input-action-row">
            <input
              id="retrieve-query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 팀 프로젝트 앱 디자인 참고"
              value={query}
            />
            <button className="button button-primary" type="submit">
              꺼내보기
            </button>
          </div>
        </form>

        <div className="chip-row" aria-label="추천 상황">
          {suggestedSituations.map((situation) => (
            <button
              aria-pressed={selectedSituation === situation}
              className="chip chip-situation"
              key={situation}
              onClick={() => onSituationClick(situation)}
              type="button"
            >
              {situation}
            </button>
          ))}
        </div>
      </section>

      <section
        className="content-section"
        aria-labelledby="retrieve-results-title"
      >
        <div className="section-heading section-heading-inline">
          <div>
            <p className="eyebrow">추천 결과</p>
            <h2 id="retrieve-results-title">다시 볼 만한 인사이트</h2>
          </div>
          <span className="result-count">{results.length}개</span>
        </div>

        {hasRetrieved && results.length > 0 ? (
          <InsightGrid insights={results} />
        ) : (
          <EmptyState
            action="보관함으로 이동"
            description="먼저 인사이트를 저장하면 현재 상황에 맞춰 다시 꺼내볼 수 있습니다."
            title="꺼내볼 인사이트가 아직 없어요"
          />
        )}
      </section>

      <section className="content-section" aria-labelledby="recent-title">
        <div className="section-heading">
          <p className="eyebrow">최근 보관함</p>
          <h2 id="recent-title">방금 저장해둔 자료</h2>
        </div>
        <InsightGrid insights={initialInsights.slice(0, 3)} />
      </section>
    </>
  );
}

function LibraryView({
  activeCategory,
  insights,
  query,
  setActiveCategory,
  setQuery,
}: {
  activeCategory: string;
  insights: Insight[];
  query: string;
  setActiveCategory: (category: string) => void;
  setQuery: (value: string) => void;
}) {
  return (
    <>
      <section className="toolbar" aria-label="보관함 필터">
        <div className="field">
          <label htmlFor="library-search">검색</label>
          <input
            id="library-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제목, 메모, 카테고리 검색"
            value={query}
          />
        </div>

        <div className="chip-row" aria-label="카테고리 필터">
          {categoryFilters.map((category) => (
            <button
              aria-pressed={activeCategory === category}
              className="chip chip-filter"
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="content-section" aria-labelledby="library-title">
        <div className="section-heading section-heading-inline">
          <div>
            <p className="eyebrow">최신 저장순</p>
            <h2 id="library-title">내 인사이트</h2>
          </div>
          <span className="result-count">{insights.length}개</span>
        </div>

        {insights.length > 0 ? (
          <InsightGrid insights={insights} />
        ) : (
          <EmptyState
            action="검색 초기화"
            description="검색어나 카테고리 필터를 바꾸면 저장한 자료를 다시 볼 수 있습니다."
            title="조건에 맞는 인사이트가 없어요"
          />
        )}
      </section>
    </>
  );
}

function SaveView({
  saveComplete,
  saveUrl,
  setSaveComplete,
  setSaveUrl,
  onSave,
}: {
  saveComplete: boolean;
  saveUrl: string;
  setSaveComplete: (value: boolean) => void;
  setSaveUrl: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="save-panel" aria-labelledby="save-title">
      <div className="section-heading">
        <p className="eyebrow">링크 저장</p>
        <h2 id="save-title">URL만 넣고 바로 보관해요</h2>
      </div>

      <form className="save-form" onSubmit={onSave}>
        <label htmlFor="save-url">링크 URL</label>
        <input
          id="save-url"
          onChange={(event) => {
            setSaveUrl(event.target.value);
            setSaveComplete(false);
          }}
          placeholder="https://example.com/article"
          type="url"
          value={saveUrl}
        />
        <button className="button button-primary" type="submit">
          저장하기
        </button>
      </form>

      {saveComplete ? (
        <div className="save-result" role="status">
          <strong>저장 완료</strong>
          <p>카테고리와 메모는 선택 사항입니다.</p>
          <div className="chip-row" aria-label="추천 카테고리">
            {suggestedCategories.map((category) => (
              <button
                className={`chip chip-${category.tone}`}
                key={category.name}
                type="button"
              >
                {category.name}
              </button>
            ))}
          </div>
          <label htmlFor="save-memo">메모</label>
          <textarea
            id="save-memo"
            placeholder="나중에 왜 다시 볼지 짧게 남겨두기"
            rows={3}
          />
          <button className="button button-secondary" type="button">
            그냥 저장
          </button>
        </div>
      ) : (
        <EmptyState
          action="URL 붙여넣기"
          description="저장 후 메타데이터를 불러오고, 카테고리와 메모를 가볍게 제안합니다."
          title="링크 하나로 시작해요"
        />
      )}
    </section>
  );
}

function InsightGrid({ insights }: { insights: Insight[] }) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <article className="insight-card" key={insight.id}>
          <div className="thumbnail" aria-hidden="true">
            {insight.thumbnail}
          </div>
          <div className="card-body">
            <p className="domain">{insight.domain}</p>
            <h3>{insight.title}</h3>
            {insight.memo ? <p className="memo">{insight.memo}</p> : null}
            {insight.categories.length > 0 ? (
              <ul className="category-list" aria-label="카테고리 목록">
                {insight.categories.map((category) => (
                  <li
                    className={`category-pill category-${category.tone}`}
                    key={category.name}
                  >
                    {category.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <a className="open-link" href={insight.url}>
            원문 열기
          </a>
        </article>
      ))}
    </div>
  );
}

function EmptyState({
  action,
  description,
  title,
}: {
  action: string;
  description: string;
  title: string;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      <button className="button button-ghost" type="button">
        {action}
      </button>
    </div>
  );
}

function getScreenTitle(tab: Tab) {
  if (tab === 'library') {
    return '보관함';
  }

  if (tab === 'save') {
    return '저장';
  }

  return '홈';
}
