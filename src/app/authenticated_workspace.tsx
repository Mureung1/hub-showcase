import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { filterInsights } from '@/entities/insight';
import { HomePage, type SuggestedSituation } from '@/pages/home';
import { LibraryPage } from '@/pages/library';
import { SavePage } from '@/pages/save';
import { AppNavigation, type WorkspaceTab } from '@/widgets/app-navigation';

import {
  CATEGORY_FILTERS,
  INITIAL_INSIGHTS,
  SUGGESTED_CATEGORIES,
  SUGGESTED_SITUATIONS,
} from './model/workspace_seed';
import './styles/authenticated_workspace.css';

const INITIAL_SITUATION_QUERY = SUGGESTED_SITUATIONS[0]?.query ?? '';
const SAVE_URL_ERROR_MESSAGE = '올바른 URL을 입력해주세요.';

export function AuthenticatedWorkspace() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');
  const [insights, setInsights] = useState(() => INITIAL_INSIGHTS);
  const [activeCategory, setActiveCategory] = useState('All');
  const [globalQuery, setGlobalQuery] = useState('');
  const [retrieveQuery, setRetrieveQuery] = useState(INITIAL_SITUATION_QUERY);
  const [selectedSituation, setSelectedSituation] = useState(
    INITIAL_SITUATION_QUERY
  );
  const [saveUrl, setSaveUrl] = useState('');
  const [saveComplete, setSaveComplete] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const visibleInsights = useMemo(() => {
    return filterInsights(insights, activeCategory, globalQuery);
  }, [activeCategory, globalQuery, insights]);

  const retrieveResults = useMemo(() => {
    return filterInsights(insights, 'All', retrieveQuery).slice(0, 6);
  }, [insights, retrieveQuery]);

  function handleSituationClick(situation: SuggestedSituation) {
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

    const normalizedUrl = saveUrl.trim();

    if (!normalizedUrl) {
      setSaveComplete(false);
      setSaveError(SAVE_URL_ERROR_MESSAGE);
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      setSaveComplete(false);
      setSaveError(SAVE_URL_ERROR_MESSAGE);
      return;
    }

    setSaveError(undefined);
    setInsights((current) => [
      {
        categories: [],
        domain: parsedUrl.hostname.replace(/^www\./, ''),
        id: Date.now(),
        memo: '카테고리와 메모는 나중에 정리할 수 있습니다.',
        thumbnail: 'NEW',
        title: '저장한 링크의 제목을 불러오는 중',
        url: '#',
      },
      ...current,
    ]);
    setActiveCategory('All');
    setSaveComplete(true);
  }

  function handleSaveUrlChange(value: string) {
    setSaveUrl(value);
    setSaveError(undefined);
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="workspace-brand">
          <span aria-hidden="true" className="workspace-brand__mark" />
          <span className="workspace-brand__name">아맞다</span>
          <span aria-hidden="true" className="workspace-brand__divider" />
          <h1>{getScreenTitle(activeTab)}</h1>
        </div>
        <p className="workspace-connection-status">Google 연결됨</p>
      </header>

      <main className="workspace-main">
        {activeTab === 'library' ? (
          <LibraryPage
            activeCategory={activeCategory}
            categoryOptions={CATEGORY_FILTERS}
            insights={visibleInsights}
            onCategoryChange={setActiveCategory}
            onOpenSave={() => setActiveTab('save')}
            onQueryChange={setGlobalQuery}
            query={globalQuery}
          />
        ) : null}

        {activeTab === 'home' ? (
          <HomePage
            onOpenLibrary={() => setActiveTab('library')}
            onQueryChange={handleRetrieveQueryChange}
            onRetrieve={handleRetrieve}
            onSituationClick={handleSituationClick}
            query={retrieveQuery}
            results={retrieveResults}
            selectedSituation={selectedSituation}
            situations={SUGGESTED_SITUATIONS}
          />
        ) : null}

        {activeTab === 'save' ? (
          <SavePage
            errorMessage={saveError}
            onSave={handleSave}
            onSaveCompleteChange={setSaveComplete}
            onUrlChange={handleSaveUrlChange}
            saveComplete={saveComplete}
            saveUrl={saveUrl}
            suggestedCategories={SUGGESTED_CATEGORIES}
          />
        ) : null}
      </main>

      <AppNavigation onTabChange={setActiveTab} tab={activeTab} />
    </div>
  );
}

function getScreenTitle(tab: WorkspaceTab) {
  if (tab === 'library') {
    return '보관함';
  }

  if (tab === 'save') {
    return '저장';
  }

  return '홈';
}
