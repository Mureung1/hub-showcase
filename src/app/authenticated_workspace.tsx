import { useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import {
  filterInsights,
  retrieveInsights,
  createBrowserInsightCaptureService,
  type InsightRepository,
  type InsightCaptureService,
  type InsightRepositoryWarning,
} from '@/entities/insight';
import { PwaInstallNotice, usePwaInstallPrompt } from '@/features/pwa-install';
import { HomePage, type SuggestedSituation } from '@/pages/home';
import { LibraryPage } from '@/pages/library';
import { SavePage, type SaveContextDraft } from '@/pages/save';
import { readClipboardText } from '@/shared/browser';
import { BrandLogo, StatusMessage } from '@/shared/ui';
import { AppNavigation, type WorkspaceTab } from '@/widgets/app-navigation';

import { createBrowserInsightRepository } from './model/create_browser_insight_repository';
import { createRepositoryInsightCaptureService } from './model/create_repository_insight_capture_service';
import { CATEGORY_FILTERS, SUGGESTED_SITUATIONS } from './model/workspace_seed';
import {
  useInsightWorkspace,
  type SaveInsightFailureReason,
  type SaveInsightInput,
} from './model/use_insight_workspace';
import './styles/authenticated_workspace.css';

const EMPTY_CONTEXT_DRAFT: SaveContextDraft = {
  category: '',
  memo: '',
  title: '',
};
const SAVE_ERROR_MESSAGES: Record<SaveInsightFailureReason, string> = {
  'invalid-url': '올바른 URL을 입력해주세요.',
  'permission-denied':
    '저장 권한을 확인하지 못했어요. 입력한 URL을 그대로 두었으니 다시 로그인한 뒤 시도해주세요.',
  'unsupported-protocol': 'http 또는 https 주소만 저장할 수 있어요.',
  'write-failed':
    '원격 저장에 실패했어요. 입력한 URL을 그대로 두었으니 네트워크를 확인하고 다시 시도해주세요.',
};
const LOAD_WARNING_MESSAGES: Record<
  InsightRepositoryWarning,
  { description: string; title: string }
> = {
  'read-failed': {
    title: '보관함을 불러오지 못했어요',
    description:
      '원격 보관함을 읽지 못했어요. 네트워크를 확인하고 새로고침해주세요.',
  },
  'corrupted-store': {
    title: '저장 데이터를 불러오지 못했어요',
    description:
      '저장 데이터가 손상되어 불러오지 못했어요. 새 링크는 계속 저장할 수 있어요.',
  },
  'corrupted-entry': {
    title: '일부 링크를 제외했어요',
    description: '일부 손상된 링크를 제외하고 나머지를 불러왔어요.',
  },
  'permission-denied': {
    title: '보관함 접근 권한을 확인하지 못했어요',
    description: '다시 로그인한 뒤 보관함을 열어주세요.',
  },
};

function hasBlockingLoadWarning(warnings: InsightRepositoryWarning[]) {
  return warnings.some(
    (warning) => warning === 'read-failed' || warning === 'permission-denied'
  );
}

function isLibraryUnavailable(
  warnings: InsightRepositoryWarning[],
  insightCount: number
) {
  return (
    hasBlockingLoadWarning(warnings) ||
    (insightCount === 0 && warnings.includes('corrupted-entry'))
  );
}

function getLoadWarningMessage(
  warning: InsightRepositoryWarning,
  insightCount: number
) {
  if (warning === 'corrupted-entry' && insightCount === 0) {
    return {
      title: '저장된 인사이트를 읽지 못했어요',
      description:
        '원격 보관함의 데이터를 확인하지 못했어요. 다시 불러와도 계속되면 문제를 알려주세요.',
    };
  }

  return LOAD_WARNING_MESSAGES[warning];
}

export type AuthenticatedWorkspaceProps = {
  accountControl?: ReactNode;
  captureService?: InsightCaptureService;
  initialSaveDraft?: SaveInsightInput;
  repository?: InsightRepository;
  userId?: string;
};

export function AuthenticatedWorkspace({
  accountControl,
  captureService,
  initialSaveDraft,
  repository,
  userId,
}: AuthenticatedWorkspaceProps) {
  const pwaInstallPrompt = usePwaInstallPrompt();
  const workspaceRepository = useMemo(
    () =>
      repository ??
      (userId
        ? createBrowserInsightRepository(userId)
        : createUnavailableInsightRepository()),
    [repository, userId]
  );
  const workspaceCaptureService = useMemo(
    () =>
      captureService ??
      (repository
        ? createRepositoryInsightCaptureService(repository)
        : userId
          ? createBrowserInsightCaptureService()
          : createUnavailableInsightCaptureService()),
    [captureService, repository, userId]
  );
  const {
    deleteInsight,
    insights,
    isLoading,
    isMutating,
    loadWarnings,
    saveInsight,
    updateInsightContext,
  } = useInsightWorkspace({
    captureService: workspaceCaptureService,
    repository: workspaceRepository,
  });
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() =>
    initialSaveDraft ? 'save' : 'home'
  );
  const [activeCategory, setActiveCategory] = useState('All');
  const [globalQuery, setGlobalQuery] = useState('');
  const [retrieveQuery, setRetrieveQuery] = useState('');
  const [submittedRetrieveQuery, setSubmittedRetrieveQuery] = useState('');
  const [selectedSituation, setSelectedSituation] = useState('');
  const [saveDraft, setSaveDraft] = useState<SaveInsightInput>(
    () => initialSaveDraft ?? { source: 'web', url: '' }
  );
  const saveDraftRevisionRef = useRef(0);
  const [saveComplete, setSaveComplete] = useState(false);
  const [saveErrorReason, setSaveErrorReason] =
    useState<SaveInsightFailureReason>();
  const [savedInsightId, setSavedInsightId] = useState<string>();
  const [contextDraft, setContextDraft] = useState(EMPTY_CONTEXT_DRAFT);
  const [contextSaveComplete, setContextSaveComplete] = useState(false);
  const [contextSaveFailed, setContextSaveFailed] = useState(false);

  const visibleInsights = useMemo(() => {
    return filterInsights(insights, activeCategory, globalQuery);
  }, [activeCategory, globalQuery, insights]);

  const retrieveResults = useMemo(() => {
    return retrieveInsights(insights, submittedRetrieveQuery);
  }, [insights, submittedRetrieveQuery]);
  const libraryUnavailable = isLibraryUnavailable(
    loadWarnings,
    insights.length
  );

  function handleSituationClick(situation: SuggestedSituation) {
    setSelectedSituation(situation.query);
    setRetrieveQuery(situation.query);
    setSubmittedRetrieveQuery(situation.query);
  }

  function handleRetrieveQueryChange(value: string) {
    setRetrieveQuery(value);

    if (value !== selectedSituation) {
      setSelectedSituation('');
    }
  }

  function handleRetrieve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmittedRetrieveQuery(retrieveQuery.trim());
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedDraftRevision = saveDraftRevisionRef.current;
    const saveResult = await saveInsight(saveDraft);

    if (submittedDraftRevision !== saveDraftRevisionRef.current) {
      return;
    }

    if (!saveResult.ok) {
      setSaveComplete(false);
      setSaveErrorReason(saveResult.reason);
      return;
    }

    pwaInstallPrompt.recordSuccessfulSave();
    setSaveErrorReason(undefined);
    setActiveCategory('All');
    setSavedInsightId(saveResult.insightId);
    setContextDraft(EMPTY_CONTEXT_DRAFT);
    setContextSaveComplete(false);
    setContextSaveFailed(false);
    setSaveComplete(true);
  }

  function resetSaveFeedback() {
    setSaveComplete(false);
    setSaveErrorReason(undefined);
    setSavedInsightId(undefined);
    setContextDraft(EMPTY_CONTEXT_DRAFT);
    setContextSaveComplete(false);
    setContextSaveFailed(false);
  }

  function updateSaveDraft(
    update: (currentDraft: SaveInsightInput) => SaveInsightInput
  ) {
    saveDraftRevisionRef.current += 1;
    setSaveDraft(update);
    resetSaveFeedback();
  }

  function handleSaveUrlChange(value: string) {
    updateSaveDraft((draft) => ({ ...draft, url: value }));
  }

  function handleSaveTitleChange(value: string) {
    updateSaveDraft((draft) => ({ ...draft, title: value }));
  }

  async function handleClipboardPaste() {
    const value = await readClipboardText();

    if (value) {
      updateSaveDraft(() => ({ source: 'web', url: value }));
    }
  }

  async function handleContextSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!savedInsightId) {
      return;
    }

    const updateResult = await updateInsightContext(
      savedInsightId,
      contextDraft
    );

    if (updateResult.ok) {
      setContextSaveComplete(true);
      setContextSaveFailed(false);
      return;
    }

    setContextSaveComplete(false);
    setContextSaveFailed(true);
  }

  function handleContextDraftChange(draft: SaveContextDraft) {
    setContextDraft(draft);
    setContextSaveComplete(false);
    setContextSaveFailed(false);
  }

  function handleContextSkip() {
    setSavedInsightId(undefined);
    setContextDraft(EMPTY_CONTEXT_DRAFT);
    setContextSaveComplete(false);
    setContextSaveFailed(false);
    setSaveComplete(false);
    setSaveDraft({ source: 'web', url: '' });
    setSaveErrorReason(undefined);
    setActiveCategory('All');
    setGlobalQuery('');
    setActiveTab('library');
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="workspace-brand">
          <BrandLogo className="workspace-brand__mark" />
          <span className="workspace-brand__name">아맞다</span>
          <span aria-hidden="true" className="workspace-brand__divider" />
          <h1>{getScreenTitle(activeTab)}</h1>
        </div>
        {accountControl ?? (
          <p className="workspace-connection-status">
            로그인 계정의 원격 보관함에 저장됨
          </p>
        )}
      </header>

      <main className="workspace-main">
        {pwaInstallPrompt.isVisible ? (
          <PwaInstallNotice
            isPrompting={pwaInstallPrompt.isPrompting}
            onDismiss={pwaInstallPrompt.dismiss}
            onInstall={pwaInstallPrompt.install}
          />
        ) : null}

        {loadWarnings.length > 0 ? (
          <div className="workspace-warnings" aria-label="저장소 안내">
            {loadWarnings.map((warning) => {
              const message = getLoadWarningMessage(warning, insights.length);

              return (
                <StatusMessage
                  key={warning}
                  title={message.title}
                  variant="error"
                >
                  <p>{message.description}</p>
                </StatusMessage>
              );
            })}
          </div>
        ) : null}

        {activeTab === 'library' ? (
          <LibraryPage
            activeCategory={activeCategory}
            categoryOptions={CATEGORY_FILTERS}
            insights={visibleInsights}
            loading={isLoading}
            onCategoryChange={setActiveCategory}
            onDeleteInsight={deleteInsight}
            onOpenSave={() => setActiveTab('save')}
            onQueryChange={setGlobalQuery}
            onRetryLoad={() => window.location.reload()}
            onUpdateInsight={updateInsightContext}
            query={globalQuery}
            totalInsightCount={insights.length}
            unavailable={libraryUnavailable}
          />
        ) : null}

        {activeTab === 'home' ? (
          <HomePage
            insightCount={insights.length}
            libraryState={
              isLoading
                ? 'loading'
                : libraryUnavailable
                  ? 'unavailable'
                  : 'ready'
            }
            onOpenLibrary={() => setActiveTab('library')}
            onOpenSave={() => setActiveTab('save')}
            onQueryChange={handleRetrieveQueryChange}
            onRetrieve={handleRetrieve}
            onRetryLoad={() => window.location.reload()}
            onSituationClick={handleSituationClick}
            query={retrieveQuery}
            results={retrieveResults}
            selectedSituation={selectedSituation}
            situations={SUGGESTED_SITUATIONS}
            submittedQuery={submittedRetrieveQuery}
          />
        ) : null}

        {activeTab === 'save' ? (
          <SavePage
            contextDraft={contextDraft}
            contextErrorMessage={
              contextSaveFailed
                ? '먼저 저장한 링크와 입력은 그대로 두었어요. 다시 시도하거나 건너뛸 수 있어요.'
                : undefined
            }
            contextSaveComplete={contextSaveComplete}
            isContextSaving={isMutating}
            isSaving={isMutating}
            errorMessage={
              saveErrorReason ? SAVE_ERROR_MESSAGES[saveErrorReason] : undefined
            }
            onContextDraftChange={handleContextDraftChange}
            onContextSave={handleContextSave}
            onContextSkip={handleContextSkip}
            onPasteFromClipboard={handleClipboardPaste}
            onSave={handleSave}
            onTitleChange={handleSaveTitleChange}
            onUrlChange={handleSaveUrlChange}
            isSharedSave={saveDraft.source === 'android_share'}
            saveComplete={saveComplete}
            saveTitle={saveDraft.title ?? ''}
            saveUrl={saveDraft.url}
            storageReady={!isLoading}
          />
        ) : null}
      </main>

      <AppNavigation onTabChange={setActiveTab} tab={activeTab} />
    </div>
  );
}

function createUnavailableInsightRepository(): InsightRepository {
  return {
    async create() {
      return { ok: false, reason: 'permission-denied' };
    },
    async delete() {
      return { ok: false, reason: 'permission-denied' };
    },
    async list() {
      return { insights: [], warnings: ['permission-denied'] };
    },
    async update() {
      return { ok: false, reason: 'permission-denied' };
    },
  };
}

function createUnavailableInsightCaptureService(): InsightCaptureService {
  return {
    async capture() {
      return { ok: false, reason: 'permission-denied' };
    },
  };
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
