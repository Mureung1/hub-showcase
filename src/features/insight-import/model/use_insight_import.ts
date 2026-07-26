import { useCallback, useRef, useState } from 'react';

import type {
  ImportFieldMappingRequest,
  ImportSourceAdapter,
} from './import_adapter';
import { analyzeImportCandidates } from './import_analysis';
import { extractFileCandidates } from './file_adapter_registry';
import type {
  ImportServiceFailureReason,
  InsightImportService,
} from './insight_import_service';
import { pastedTextAdapter } from './pasted_text_adapter';
import {
  createCollectionKey,
  type ImportAdapterKey,
  type ImportCollectionMapping,
  type ImportCommitResult,
  type ImportFieldMapping,
  type ImportHistoryEntry,
  type ImportUndoResult,
  type PreparedImport,
} from './import_types';
import { ImportFileError } from './read_import_file';

export type InsightImportState =
  | { stage: 'source'; errorMessage: string | null }
  | { stage: 'analyzing'; errorMessage: null }
  | {
      stage: 'field-mapping';
      errorMessage: null;
      mappingRequests: ImportFieldMappingRequest[];
    }
  | {
      stage: 'preview';
      errorMessage: string | null;
      mappings: ImportCollectionMapping[];
      prepared: PreparedImport;
    }
  | {
      stage: 'committing';
      mappings: ImportCollectionMapping[];
      prepared: PreparedImport;
    }
  | {
      stage: 'result';
      commit: ImportCommitResult;
      prepared: PreparedImport;
      undo: ImportUndoResult | null;
      errorMessage: string | null;
    };

export type UseInsightImportOptions = {
  fileAdapters?: readonly ImportSourceAdapter[];
  onCategoriesChanged?: () => void | Promise<void>;
  onLibraryChanged?: () => void | Promise<void>;
  service: InsightImportService;
};

export type InsightImportController = {
  analyzeFile(file: File, mappings?: ImportFieldMapping[]): Promise<void>;
  analyzePastedText(text: string): Promise<void>;
  cancelCurrentOperation(): void;
  canCommit: boolean;
  commit(): Promise<void>;
  deleteRecord(jobId: string): Promise<void>;
  errorMessage: string | null;
  fieldMappingRequests: ImportFieldMappingRequest[];
  history: ImportHistoryEntry[];
  historyErrorMessage: string | null;
  isHistoryLoading: boolean;
  loadPrepared(prepared: PreparedImport): void;
  mappings: ImportCollectionMapping[];
  prepared: PreparedImport | null;
  refreshHistory(): Promise<void>;
  reset(): void;
  result: (ImportCommitResult & { undo: ImportUndoResult | null }) | null;
  setCollectionMapping(mapping: ImportCollectionMapping): void;
  stage: InsightImportState['stage'];
  state: InsightImportState;
  submitFieldMappings(mappings: ImportFieldMapping[]): Promise<void>;
  undo(jobId: string): Promise<void>;
};

const INITIAL_STATE: InsightImportState = {
  errorMessage: null,
  stage: 'source',
};

const HISTORY_FAILURE_MESSAGE = '가져오기 기록을 불러오지 못했습니다.';
const REFRESH_FAILURE_MESSAGE =
  '가져오기는 완료됐지만 보관함을 새로고침하지 못했습니다.';

export function useInsightImport({
  fileAdapters = [],
  onCategoriesChanged,
  onLibraryChanged,
  service,
}: UseInsightImportOptions): InsightImportController {
  const [state, setState] = useState<InsightImportState>(INITIAL_STATE);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(
    null
  );
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const stateRef = useRef(state);
  const operationRevisionRef = useRef(0);
  const historyRevisionRef = useRef(0);
  const operationPendingRef = useRef(false);
  const pendingFileRef = useRef<File | undefined>(undefined);

  const applyState = useCallback((nextState: InsightImportState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const applyError = useCallback(
    (errorMessage: string) => {
      const currentState = stateRef.current;

      if (currentState.stage === 'source') {
        applyState({ errorMessage, stage: 'source' });
      } else if (currentState.stage === 'preview') {
        applyState({ ...currentState, errorMessage });
      } else if (currentState.stage === 'result') {
        applyState({ ...currentState, errorMessage });
      }
    },
    [applyState]
  );

  const analyzePastedText = useCallback(
    async (text: string) => {
      if (operationPendingRef.current) {
        return;
      }

      operationPendingRef.current = true;
      const revision = ++operationRevisionRef.current;
      applyState({ errorMessage: null, stage: 'analyzing' });

      try {
        const candidates = await pastedTextAdapter.extract({
          kind: 'pasted-text',
          text,
        });
        const analysis = analyzeImportCandidates(candidates);
        const idempotencyKey = await createImportIdempotencyKey(
          'pasted-text',
          text
        );
        const preparedResult = await service.prepare({
          adapterKey: 'pasted-text',
          idempotencyKey,
          inputKind: 'pasted-text',
          items: analysis.items,
        });

        if (operationRevisionRef.current !== revision) {
          return;
        }

        if (!preparedResult.ok) {
          applyState({
            errorMessage: getServiceErrorMessage(preparedResult.reason),
            stage: 'source',
          });
          return;
        }

        applyState({
          errorMessage: null,
          mappings: createDefaultMappings(preparedResult.value),
          prepared: preparedResult.value,
          stage: 'preview',
        });
      } catch {
        if (operationRevisionRef.current === revision) {
          applyState({
            errorMessage: getServiceErrorMessage('write-failed'),
            stage: 'source',
          });
        }
      } finally {
        if (operationRevisionRef.current === revision) {
          operationPendingRef.current = false;
        }
      }
    },
    [applyState, service]
  );

  const analyzeFile = useCallback(
    async (file: File, mappings?: ImportFieldMapping[]) => {
      if (operationPendingRef.current) {
        return;
      }

      operationPendingRef.current = true;
      const revision = ++operationRevisionRef.current;
      let preservePendingFile = false;
      applyState({ errorMessage: null, stage: 'analyzing' });

      try {
        const extraction = await extractFileCandidates(
          { file, kind: 'file', mappings },
          fileAdapters
        );

        if (extraction.candidates === null) {
          preservePendingFile = true;
          pendingFileRef.current = file;
          applyState({
            errorMessage: null,
            mappingRequests: extraction.mappingRequests,
            stage: 'field-mapping',
          });
          return;
        }

        const analysis = analyzeImportCandidates(extraction.candidates);
        const idempotencyKey = await createFileImportIdempotencyKey(
          extraction.adapterKey,
          file,
          mappings
        );
        const preparedResult = await service.prepare({
          adapterKey: extraction.adapterKey,
          idempotencyKey,
          inputKind: 'file',
          items: analysis.items,
        });

        if (operationRevisionRef.current !== revision) {
          return;
        }

        if (!preparedResult.ok) {
          applyState({
            errorMessage: getServiceErrorMessage(preparedResult.reason),
            stage: 'source',
          });
          return;
        }

        applyState({
          errorMessage: null,
          mappings: createDefaultMappings(preparedResult.value),
          prepared: preparedResult.value,
          stage: 'preview',
        });
      } catch (error) {
        if (operationRevisionRef.current === revision) {
          applyState({
            errorMessage:
              error instanceof ImportFileError
                ? getFileErrorMessage(error.code)
                : getServiceErrorMessage('write-failed'),
            stage: 'source',
          });
        }
      } finally {
        if (!preservePendingFile) {
          pendingFileRef.current = undefined;
        }

        if (operationRevisionRef.current === revision) {
          operationPendingRef.current = false;
        }
      }
    },
    [applyState, fileAdapters, service]
  );

  const submitFieldMappings = useCallback(
    async (mappings: ImportFieldMapping[]) => {
      const file = pendingFileRef.current;

      if (!file) {
        return;
      }

      await analyzeFile(file, mappings);
    },
    [analyzeFile]
  );

  const setCollectionMapping = useCallback(
    (mapping: ImportCollectionMapping) => {
      const currentState = stateRef.current;

      if (currentState.stage !== 'preview') {
        return;
      }

      const mappingExists = currentState.mappings.some(
        ({ collectionKey }) => collectionKey === mapping.collectionKey
      );
      const mappings = mappingExists
        ? currentState.mappings.map((currentMapping) =>
            currentMapping.collectionKey === mapping.collectionKey
              ? mapping
              : currentMapping
          )
        : [...currentState.mappings, mapping];

      applyState({
        ...currentState,
        errorMessage: null,
        mappings,
      });
    },
    [applyState]
  );

  const commit = useCallback(async () => {
    const currentState = stateRef.current;

    if (
      operationPendingRef.current ||
      currentState.stage !== 'preview' ||
      currentState.prepared.summary.newCount === 0
    ) {
      return;
    }

    operationPendingRef.current = true;
    const revision = ++operationRevisionRef.current;
    applyState({
      mappings: currentState.mappings,
      prepared: currentState.prepared,
      stage: 'committing',
    });

    try {
      const commitResult = await service.commit(
        currentState.prepared.id,
        currentState.mappings
      );

      if (operationRevisionRef.current !== revision) {
        return;
      }

      if (!commitResult.ok) {
        applyState({
          errorMessage: getServiceErrorMessage(commitResult.reason),
          mappings: currentState.mappings,
          prepared: currentState.prepared,
          stage: 'preview',
        });
        return;
      }

      applyState({
        commit: commitResult.value,
        errorMessage: null,
        prepared: currentState.prepared,
        stage: 'result',
        undo: null,
      });

      try {
        await Promise.all([onLibraryChanged?.(), onCategoriesChanged?.()]);
      } catch {
        if (operationRevisionRef.current === revision) {
          applyError(REFRESH_FAILURE_MESSAGE);
        }
      }
    } catch {
      if (operationRevisionRef.current === revision) {
        applyState({
          errorMessage: getServiceErrorMessage('write-failed'),
          mappings: currentState.mappings,
          prepared: currentState.prepared,
          stage: 'preview',
        });
      }
    } finally {
      if (operationRevisionRef.current === revision) {
        operationPendingRef.current = false;
      }
    }
  }, [applyError, applyState, onCategoriesChanged, onLibraryChanged, service]);

  const undo = useCallback(
    async (jobId: string) => {
      if (operationPendingRef.current) {
        return;
      }

      operationPendingRef.current = true;
      const revision = ++operationRevisionRef.current;

      try {
        const undoResult = await service.undo(jobId);

        if (operationRevisionRef.current !== revision) {
          return;
        }

        if (!undoResult.ok) {
          if (undoResult.reason === 'undo-expired') {
            setHistory((currentHistory) =>
              currentHistory.map((entry) =>
                entry.id === jobId ? { ...entry, undoExpiresAt: null } : entry
              )
            );
          }
          applyError(getServiceErrorMessage(undoResult.reason));
          return;
        }

        const currentState = stateRef.current;
        if (
          currentState.stage === 'result' &&
          currentState.commit.jobId === jobId
        ) {
          applyState({
            ...currentState,
            errorMessage: null,
            undo: undoResult.value,
          });
        }

        setHistory((currentHistory) =>
          currentHistory.map((entry) =>
            entry.id === jobId
              ? {
                  ...entry,
                  status: 'undone',
                  undoExpiresAt: null,
                  undoResult: undoResult.value,
                }
              : entry
          )
        );

        try {
          await onLibraryChanged?.();
        } catch {
          if (operationRevisionRef.current === revision) {
            applyError(REFRESH_FAILURE_MESSAGE);
          }
        }
      } catch {
        if (operationRevisionRef.current === revision) {
          applyError(getServiceErrorMessage('write-failed'));
        }
      } finally {
        if (operationRevisionRef.current === revision) {
          operationPendingRef.current = false;
        }
      }
    },
    [applyError, applyState, onLibraryChanged, service]
  );

  const deleteRecord = useCallback(
    async (jobId: string) => {
      if (operationPendingRef.current) {
        return;
      }

      operationPendingRef.current = true;
      const revision = ++operationRevisionRef.current;

      try {
        const deleteResult = await service.deleteRecord(jobId);

        if (operationRevisionRef.current !== revision) {
          return;
        }

        if (!deleteResult.ok) {
          applyError(getServiceErrorMessage(deleteResult.reason));
          return;
        }

        setHistory((currentHistory) =>
          currentHistory.filter((entry) => entry.id !== jobId)
        );

        const currentState = stateRef.current;
        if (
          currentState.stage === 'result' &&
          currentState.commit.jobId === jobId
        ) {
          applyState(INITIAL_STATE);
        }
      } catch {
        if (operationRevisionRef.current === revision) {
          applyError(getServiceErrorMessage('write-failed'));
        }
      } finally {
        if (operationRevisionRef.current === revision) {
          operationPendingRef.current = false;
        }
      }
    },
    [applyError, applyState, service]
  );

  const refreshHistory = useCallback(async () => {
    const revision = ++historyRevisionRef.current;
    setIsHistoryLoading(true);
    setHistoryErrorMessage(null);

    try {
      const historyResult = await service.listHistory();

      if (historyRevisionRef.current !== revision) {
        return;
      }

      if (!historyResult.ok) {
        setHistoryErrorMessage(HISTORY_FAILURE_MESSAGE);
        return;
      }

      setHistory(historyResult.value);
    } catch {
      if (historyRevisionRef.current === revision) {
        setHistoryErrorMessage(HISTORY_FAILURE_MESSAGE);
      }
    } finally {
      if (historyRevisionRef.current === revision) {
        setIsHistoryLoading(false);
      }
    }
  }, [service]);

  const reset = useCallback(() => {
    operationRevisionRef.current += 1;
    operationPendingRef.current = false;
    pendingFileRef.current = undefined;
    applyState(INITIAL_STATE);
  }, [applyState]);

  const cancelCurrentOperation = useCallback(() => {
    operationRevisionRef.current += 1;
    operationPendingRef.current = false;
    pendingFileRef.current = undefined;
    applyState(INITIAL_STATE);
  }, [applyState]);

  const loadPrepared = useCallback(
    (nextPrepared: PreparedImport) => {
      operationRevisionRef.current += 1;
      operationPendingRef.current = false;
      pendingFileRef.current = undefined;
      applyState({
        errorMessage: null,
        mappings: createDefaultMappings(nextPrepared),
        prepared: nextPrepared,
        stage: 'preview',
      });
    },
    [applyState]
  );

  const prepared =
    state.stage === 'preview' ||
    state.stage === 'committing' ||
    state.stage === 'result'
      ? state.prepared
      : null;
  const mappings =
    state.stage === 'preview' || state.stage === 'committing'
      ? state.mappings
      : [];
  const result =
    state.stage === 'result'
      ? {
          ...state.commit,
          undo: state.undo,
        }
      : null;
  const errorMessage =
    state.stage === 'committing' ||
    state.stage === 'analyzing' ||
    state.stage === 'field-mapping'
      ? null
      : state.errorMessage;
  const fieldMappingRequests =
    state.stage === 'field-mapping' ? state.mappingRequests : [];

  return {
    analyzeFile,
    analyzePastedText,
    cancelCurrentOperation,
    canCommit: state.stage === 'preview' && state.prepared.summary.newCount > 0,
    commit,
    deleteRecord,
    errorMessage,
    fieldMappingRequests,
    history,
    historyErrorMessage,
    isHistoryLoading,
    loadPrepared,
    mappings,
    prepared,
    refreshHistory,
    reset,
    result,
    setCollectionMapping,
    stage: state.stage,
    state,
    submitFieldMappings,
    undo,
  };
}

export async function createImportIdempotencyKey(
  adapterKey: ImportAdapterKey,
  originalText: string
) {
  const bytes = new TextEncoder().encode(`${adapterKey}\0${originalText}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function createFileImportIdempotencyKey(
  adapterKey: ImportAdapterKey,
  file: File,
  mappings: ImportFieldMapping[] = []
) {
  const normalizedMappings = [...mappings]
    .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey))
    .map(({ memoField, sourceKey, titleField, urlField }) => ({
      memoField,
      sourceKey,
      titleField,
      urlField,
    }));
  const prefix = new TextEncoder().encode(
    `${adapterKey}\0${JSON.stringify(normalizedMappings)}\0`
  );
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const bytes = new Uint8Array(prefix.length + fileBytes.length);
  bytes.set(prefix);
  bytes.set(fileBytes, prefix.length);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

function createDefaultMappings(
  prepared: PreparedImport
): ImportCollectionMapping[] {
  return prepared.collections.map((collectionPath) => ({
    collectionKey: createCollectionKey(collectionPath),
    target: { kind: 'uncategorized' },
  }));
}

function getServiceErrorMessage(reason: ImportServiceFailureReason) {
  if (reason === 'invalid-request') {
    return '가져오기 요청을 확인해 주세요.';
  }

  if (reason === 'permission-denied') {
    return '로그인 상태를 확인해 주세요.';
  }

  if (reason === 'read-failed') {
    return '가져오기 정보를 불러오지 못했습니다.';
  }

  if (reason === 'undo-expired') {
    return '되돌릴 수 있는 24시간이 지났어요.';
  }

  return '가져오기를 완료하지 못했습니다. 다시 시도해 주세요.';
}

function getFileErrorMessage(code: ImportFileError['code']) {
  if (code === 'file-too-large' || code === 'limit-exceeded') {
    return '가져올 파일의 크기나 항목 수가 제한을 넘었습니다.';
  }

  if (code === 'unsupported-encoding') {
    return 'UTF-8 또는 BOM이 있는 UTF-16 텍스트 파일을 선택해 주세요.';
  }

  if (code === 'corrupted-file') {
    return '손상된 파일이라 가져올 수 없습니다.';
  }

  if (code === 'unsafe-zip') {
    return '안전하지 않은 ZIP 파일입니다. 압축을 푼 뒤 지원 파일만 선택해 주세요.';
  }

  return '지원하는 링크 파일 구조를 찾지 못했습니다.';
}
