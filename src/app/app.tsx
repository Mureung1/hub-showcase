import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BottomNavigation,
  BottomNavigationItem,
  Button,
  Category,
  CategoryList,
  CategoryListItem,
  Chip,
  FallbackView,
  FallbackViewContent,
  FallbackViewImage,
  FallbackViewText,
  IconButton,
  SearchField,
  SectionMessage,
  TextArea,
  TextField,
} from '@wanteddev/wds';
import {
  IconCirclePlus,
  IconFilter,
  IconFolder,
  IconHome,
  IconLink,
  IconListCategory,
  IconPlus,
} from '@wanteddev/wds-icon';
import {
  filterInsights,
  type Insight,
  type InsightCategory,
} from '@/entities/insight';
import { LandingPage } from '@/pages/landing';
import './styles/global.css';

type Tab = 'library' | 'home' | 'save';
type AuthEntryView = 'onboarding' | 'login' | 'workspace';

const categoryFilters: InsightCategory[] = [
  { name: 'All', tone: 'slate' },
  { name: '개발', tone: 'green' },
  { name: '디자인', tone: 'blue' },
  { name: '팀프로젝트', tone: 'amber' },
  { name: '공부', tone: 'slate' },
  { name: '취업', tone: 'coral' },
  { name: '미분류', tone: 'slate' },
];

const initialInsights: Insight[] = [
  {
    id: 1,
    title: '모바일 온보딩에서 선택 부담을 줄이는 패턴',
    domain: 'uxplanet.org',
    memo: '관심 분야 선택 화면 만들 때 참고하기',
    categories: [
      { name: '디자인', tone: 'blue' },
      { name: '공부', tone: 'slate' },
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
      { name: '공부', tone: 'slate' },
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
      { name: '공부', tone: 'slate' },
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
    categories: [{ name: '취업', tone: 'coral' }],
    thumbnail: 'CV',
    url: '#',
  },
];

const tabs = [
  { id: 'library', label: '보관함', icon: IconFolder },
  { id: 'home', label: '홈', icon: IconHome },
  { id: 'save', label: '저장', icon: IconCirclePlus },
] satisfies Array<{ id: Tab; label: string; icon: typeof IconFolder }>;

const suggestedSituations = [
  { label: '팀 프로젝트', query: '팀 프로젝트 앱 디자인 참고' },
  { label: '개발 공부', query: '개발 공부 정리' },
  { label: 'UI 레퍼런스', query: 'UI 레퍼런스 찾기' },
  { label: '포트폴리오', query: '취업 포트폴리오 준비' },
  { label: '과제 자료', query: '과제 자료 정리' },
  { label: '온보딩 화면', query: '온보딩 화면 만들기' },
];

const suggestedCategories: InsightCategory[] = [
  { name: '개발', tone: 'green' },
  { name: '디자인', tone: 'blue' },
  { name: '공부', tone: 'amber' },
  { name: '팀프로젝트', tone: 'slate' },
];

export function App() {
  const [authEntryView, setAuthEntryView] =
    useState<AuthEntryView>('onboarding');

  if (authEntryView === 'onboarding') {
    return <LandingPage onStart={() => setAuthEntryView('login')} />;
  }

  if (authEntryView === 'login') {
    return (
      <LoginPage
        onBack={() => setAuthEntryView('onboarding')}
        onLogin={() => setAuthEntryView('workspace')}
      />
    );
  }

  return <AuthenticatedWorkspace />;
}

function AuthenticatedWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [insights, setInsights] = useState(initialInsights);
  const [activeCategory, setActiveCategory] = useState('All');
  const [globalQuery, setGlobalQuery] = useState('');
  const [retrieveQuery, setRetrieveQuery] = useState(
    suggestedSituations[0].query
  );
  const [selectedSituation, setSelectedSituation] = useState(
    suggestedSituations[0].query
  );
  const [saveUrl, setSaveUrl] = useState('');
  const [saveComplete, setSaveComplete] = useState(false);

  const visibleInsights = useMemo(() => {
    return filterInsights(insights, activeCategory, globalQuery);
  }, [activeCategory, globalQuery, insights]);

  const retrieveResults = useMemo(() => {
    return filterInsights(insights, 'All', retrieveQuery).slice(0, 6);
  }, [insights, retrieveQuery]);

  function handleSituationClick(situation: { label: string; query: string }) {
    setSelectedSituation(situation.query);
    setRetrieveQuery(situation.query);
  }

  function handleRetrieveQueryChange(value: string) {
    setRetrieveQuery(value);

    if (value !== selectedSituation) {
      setSelectedSituation('');
    }
  }

  function handleRetrieve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    setActiveCategory('All');
    setSaveComplete(true);
  }

  return (
    <div className="workspace">
      <header className="workspace-header">
        <div className="identity">
          <div className="avatar" aria-hidden="true">
            아
          </div>
          <div>
            <p className="eyebrow">Amadda Space</p>
            <h1>{getScreenTitle(activeTab)}</h1>
          </div>
        </div>
        <button className="pro-button" type="button">
          Google 연결됨
        </button>
      </header>

      {activeTab === 'library' ? (
        <>
          <CategoryRail
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />

          <SearchBand
            query={globalQuery}
            setQuery={setGlobalQuery}
            activeTab={activeTab}
          />
        </>
      ) : null}

      {activeTab !== 'home' ? (
        <TipBanner activeTab={activeTab} activeCategory={activeCategory} />
      ) : null}

      <main className="board" aria-label={`${getScreenTitle(activeTab)} 화면`}>
        {activeTab === 'library' ? (
          <div className="board-action">
            <button className="share-button" type="button">
              공유
            </button>
          </div>
        ) : null}

        {activeTab === 'library' && (
          <LibraryBoard
            activeCategory={activeCategory}
            insights={visibleInsights}
            setActiveCategory={setActiveCategory}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'home' && (
          <HomeBoard
            query={retrieveQuery}
            results={retrieveResults}
            selectedSituation={selectedSituation}
            setQuery={handleRetrieveQueryChange}
            setActiveTab={setActiveTab}
            onRetrieve={handleRetrieve}
            onSituationClick={handleSituationClick}
          />
        )}

        {activeTab === 'save' && (
          <SaveBoard
            saveComplete={saveComplete}
            saveUrl={saveUrl}
            setSaveComplete={setSaveComplete}
            setSaveUrl={setSaveUrl}
            onSave={handleSave}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

function LoginPage({
  onBack,
  onLogin,
}: {
  onBack: () => void;
  onLogin: () => void;
}) {
  return (
    <main className="login-shell" aria-labelledby="login-title">
      <section className="login-panel">
        <button className="back-button" type="button" onClick={onBack}>
          서비스 소개로
        </button>
        <p className="eyebrow">로그인</p>
        <h1 id="login-title">환영합니다!</h1>
        <p className="login-description">
          로그인 후 나만의 보관함과 꺼내보기를 사용할 수 있어요.
        </p>
        <Button
          color="primary"
          fullWidth
          onClick={onLogin}
          size="large"
          type="button"
        >
          Google로 시작하기
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

function CategoryRail({
  activeCategory,
  setActiveCategory,
}: {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}) {
  return (
    <Category value={activeCategory} onValueChange={setActiveCategory}>
      <nav className="category-rail" aria-label="카테고리 필터">
        <IconButton
          aria-label="보기 방식"
          className="rail-icon-button"
          size="medium"
          type="button"
          variant="outlined"
        >
          <IconListCategory aria-hidden="true" />
        </IconButton>
        <CategoryList
          className="category-scroll"
          horizontalPadding={false}
          size="small"
          verticalPadding={false}
        >
          {categoryFilters.map((category) => (
            <CategoryListItem
              aria-label={`${category.name} 카테고리`}
              key={category.name}
              value={category.name}
            >
              <span
                aria-hidden="true"
                className={`category-swatch swatch-${category.tone}`}
              />
              <span>{category.name}</span>
            </CategoryListItem>
          ))}
        </CategoryList>
        <IconButton
          aria-label="카테고리 추가"
          className="rail-icon-button"
          size="medium"
          type="button"
          variant="outlined"
        >
          <IconPlus aria-hidden="true" />
        </IconButton>
      </nav>
    </Category>
  );
}

function SearchBand({
  activeTab,
  query,
  setQuery,
}: {
  activeTab: Tab;
  query: string;
  setQuery: (value: string) => void;
}) {
  const placeholder =
    activeTab === 'home'
      ? '꺼내보고 싶은 상황, 제목, 메모 검색'
      : '제목, 메모, 카테고리 검색';

  return (
    <section className="search-band" aria-label="검색">
      <label className="visually-hidden" htmlFor="global-search">
        검색
      </label>
      <SearchField
        aria-label="검색"
        className="search-field"
        id="global-search"
        onChange={(event) => setQuery(event.currentTarget.value)}
        onReset={() => setQuery('')}
        placeholder={placeholder}
        size="medium"
        value={query}
        width="100%"
      />
      <IconButton
        aria-label="필터 설정"
        className="filter-button"
        size="medium"
        type="button"
        variant="outlined"
      >
        <IconFilter aria-hidden="true" />
      </IconButton>
    </section>
  );
}

function TipBanner({
  activeCategory,
  activeTab,
}: {
  activeCategory: string;
  activeTab: Tab;
}) {
  const message =
    activeTab === 'library'
      ? `${activeCategory} 필터와 검색으로 저장한 링크를 빠르게 찾을 수 있어요.`
      : activeTab === 'home'
        ? '현재 상황을 입력하면 저장해둔 인사이트를 다시 꺼내볼 수 있어요.'
        : 'URL만 저장해도 보관함에 먼저 들어가고, 정리는 나중에 해도 괜찮아요.';

  return (
    <SectionMessage
      aria-label="화면 안내"
      className="tip-banner"
      closeButton
      description={message}
      variant="info"
    >
      {activeTab === 'library'
        ? '필터로 빠르게 찾기'
        : getScreenTitle(activeTab)}
    </SectionMessage>
  );
}

function LibraryBoard({
  activeCategory,
  insights,
  setActiveCategory,
  setActiveTab,
}: {
  activeCategory: string;
  insights: Insight[];
  setActiveCategory: (category: string) => void;
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <section className="board-content" aria-labelledby="library-title">
      <div className="board-heading">
        <div>
          <p className="eyebrow">최신 저장순</p>
          <h2 id="library-title">
            {activeCategory === 'All' ? '전체 인사이트' : activeCategory}
          </h2>
        </div>
        <span>{insights.length}개</span>
      </div>

      {insights.length > 0 ? (
        <InsightGrid insights={insights} />
      ) : (
        <EmptyState
          actionLabel="전체 보기"
          description="저장한 링크가 없거나 조건에 맞는 인사이트가 없습니다. 다른 카테고리로 바꾸거나 새 링크를 저장해보세요."
          title="저장된 링크가 없어요"
          onAction={() => setActiveCategory('All')}
          secondaryActionLabel="링크 저장"
          onSecondaryAction={() => setActiveTab('save')}
        />
      )}
    </section>
  );
}

function HomeBoard({
  query,
  results,
  selectedSituation,
  setActiveTab,
  setQuery,
  onRetrieve,
  onSituationClick,
}: {
  query: string;
  results: Insight[];
  selectedSituation: string;
  setActiveTab: (tab: Tab) => void;
  setQuery: (value: string) => void;
  onRetrieve: (event: FormEvent<HTMLFormElement>) => void;
  onSituationClick: (situation: { label: string; query: string }) => void;
}) {
  return (
    <section className="home-board" aria-labelledby="retrieve-title">
      <div className="retrieve-hero">
        <p className="hero-badge">꺼내보기</p>
        <h2 id="retrieve-title">지금 필요한 인사이트를 다시 꺼내보세요</h2>
        <p>
          아맞다는 저장해둔 링크와 메모를 현재 상황에 맞춰 다시 찾게 해주는 개인
          인사이트 저장소입니다.
        </p>

        <form className="retrieve-search" onSubmit={onRetrieve}>
          <label htmlFor="retrieve-query">지금 꺼내보고 싶은 상황</label>
          <div className="retrieve-search-row">
            <TextField
              height={52}
              id="retrieve-query"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="예: 팀 프로젝트 앱 디자인 참고"
              value={query}
              width="100%"
            />
            <Button color="primary" size="large" type="submit" variant="solid">
              꺼내보기
            </Button>
          </div>
        </form>

        <div className="situation-grid" aria-label="추천 상황">
          {suggestedSituations.map((situation) => (
            <Chip
              active={selectedSituation === situation.query}
              aria-label={`${situation.label} 상황으로 꺼내보기`}
              aria-pressed={selectedSituation === situation.query}
              className="suggestion-chip"
              key={situation.query}
              onClick={() => onSituationClick(situation)}
              size="medium"
              type="button"
              variant={
                selectedSituation === situation.query ? 'solid' : 'outlined'
              }
            >
              {situation.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="board-heading retrieve-results-heading">
        <div>
          <p className="eyebrow">추천 결과</p>
          <h2>지금 다시 볼 만한 인사이트</h2>
        </div>
        <span>{results.length}개</span>
      </div>

      {results.length > 0 ? (
        <InsightGrid insights={results} />
      ) : (
        <EmptyState
          actionLabel="보관함 보기"
          description="먼저 인사이트를 저장하면 현재 상황에 맞춰 다시 꺼내볼 수 있습니다."
          title="꺼내볼 인사이트가 아직 없어요"
          onAction={() => setActiveTab('library')}
        />
      )}
    </section>
  );
}

function SaveBoard({
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
    <section className="save-board" aria-labelledby="save-title">
      <div className="save-card">
        <p className="eyebrow">링크 저장</p>
        <h2 id="save-title">URL만 넣고 바로 보관해요</h2>
        <p>
          저장 전 미리보기 없이 먼저 보관하고, 카테고리와 메모는 선택적으로
          남깁니다.
        </p>

        <form className="save-form" onSubmit={onSave}>
          <label htmlFor="save-url">링크 URL</label>
          <TextField
            id="save-url"
            onChange={(event) => {
              setSaveUrl(event.currentTarget.value);
              setSaveComplete(false);
            }}
            placeholder="https://example.com/article"
            type="url"
            value={saveUrl}
            width="100%"
          />
          <Button
            color="primary"
            fullWidth
            leadingContent={<IconLink aria-hidden="true" />}
            size="medium"
            type="submit"
            variant="solid"
          >
            저장하기
          </Button>
        </form>
      </div>

      {saveComplete ? (
        <div className="save-followup" role="status">
          <strong>저장 완료</strong>
          <p>필요하면 카테고리와 메모를 가볍게 붙여두세요.</p>
          <div className="situation-row" aria-label="추천 카테고리">
            {suggestedCategories.map((category) => (
              <Chip
                className={`suggestion-chip chip-${category.tone}`}
                key={category.name}
                size="medium"
                type="button"
                variant="outlined"
              >
                {category.name}
              </Chip>
            ))}
          </div>
          <label htmlFor="save-memo">메모</label>
          <TextArea
            id="save-memo"
            minRows={3}
            placeholder="나중에 왜 다시 볼지 짧게 남겨두기"
            rows={3}
            width="100%"
          />
          <Button
            color="primary"
            size="medium"
            type="button"
            variant="outlined"
          >
            그냥 저장
          </Button>
        </div>
      ) : null}
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
                  <li key={category.name}>
                    <Chip
                      as="span"
                      className={`category-pill category-${category.tone}`}
                      disableInteraction
                      size="xsmall"
                      variant="solid"
                    >
                      {category.name}
                    </Chip>
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
  actionLabel,
  description,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  title,
}: {
  actionLabel: string;
  description: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  title: string;
}) {
  return (
    <FallbackView className="empty-state" padding="compact" platform="desktop">
      <FallbackViewImage>
        <div className="empty-art" aria-hidden="true">
          <span />
          <i />
        </div>
      </FallbackViewImage>
      <FallbackViewContent>
        <FallbackViewText description={description} title={title} />
        <div className="empty-actions">
          <Button
            color="primary"
            onClick={onAction}
            size="medium"
            type="button"
            variant="solid"
          >
            {actionLabel}
          </Button>
          {secondaryActionLabel ? (
            <Button
              color="primary"
              onClick={onSecondaryAction}
              size="medium"
              type="button"
              variant="outlined"
            >
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      </FallbackViewContent>
    </FallbackView>
  );
}

function BottomNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <BottomNavigation
      aria-label="주요 화면"
      className="bottom-nav"
      onValueChange={(value) => setActiveTab(value as Tab)}
      value={activeTab}
    >
      {tabs.map((tab) => {
        const TabIcon = tab.icon;

        return (
          <BottomNavigationItem
            icon={<TabIcon aria-hidden="true" />}
            key={tab.id}
            label={tab.label}
            value={tab.id}
          />
        );
      })}
    </BottomNavigation>
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
