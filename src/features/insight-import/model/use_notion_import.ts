import { useCallback, useEffect, useRef, useState } from 'react';

import type { NotionImportCallback } from '@/shared/capacitor';

import {
  createNotionImportApi,
  NotionImportApiError,
  type NotionFieldMapping,
  type NotionFieldMappingRequest,
  type NotionImportApi,
} from '../api/notion_import_api';
import type { PreparedImport } from './import_types';

export type NotionImportStage =
  'idle' | 'connecting' | 'analyzing' | 'mapping' | 'ready' | 'error';

export type UseNotionImportOptions = {
  analysisDelayMs?: number;
  api?: NotionImportApi;
  callback?: NotionImportCallback;
  initialConnectionId?: string | null;
  initialError?: 'access-denied' | null;
  onConnectionFinished?: () => void;
  onPrepared(prepared: PreparedImport): void;
  openWeb?: (authorizeUrl: string) => void;
};

export function useNotionImport({
  analysisDelayMs = 500,
  api: providedApi,
  callback,
  initialConnectionId = null,
  initialError = null,
  onConnectionFinished = noop,
  onPrepared,
  openWeb = (authorizeUrl) => window.location.assign(authorizeUrl),
}: UseNotionImportOptions) {
  const defaultApiRef = useRef<NotionImportApi | null>(null);
  if (!providedApi && !defaultApiRef.current) {
    defaultApiRef.current = createNotionImportApi();
  }
  const api = providedApi ?? defaultApiRef.current!;
  const onConnectionFinishedRef = useRef(onConnectionFinished);
  const onPreparedRef = useRef(onPrepared);
  onConnectionFinishedRef.current = onConnectionFinished;
  onPreparedRef.current = onPrepared;

  const [stage, setStage] = useState<NotionImportStage>('idle');
  const [connectionId, setConnectionId] = useState<string | null>(
    initialConnectionId
  );
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [mappingRequests, setMappingRequests] = useState<
    NotionFieldMappingRequest[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const activeConnectionRef = useRef<string | null>(initialConnectionId);
  const initialCallbackHandledRef = useRef(false);

  const abortCurrent = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
  }, []);

  const analyze = useCallback(
    async (
      nextConnectionId: string,
      mappings: NotionFieldMapping[],
      controller: AbortController
    ) => {
      let rateLimitRetryCount = 0;

      for (;;) {
        try {
          const result = await api.analyze(
            nextConnectionId,
            mappings,
            controller.signal
          );
          rateLimitRetryCount = 0;
          setCandidateCount(result.candidateCount);
          setRequestCount((current) => current + result.requestCount);

          if (result.status === 'mapping-required') {
            setMappingRequests(result.mappingRequests);
            setStage('mapping');
            return;
          }

          if (result.status === 'ready') {
            setStage('ready');
            onPreparedRef.current(result.prepared);
            return;
          }

          await wait(analysisDelayMs, controller.signal);
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }
          if (
            error instanceof NotionImportApiError &&
            error.reason === 'provider-rate-limited' &&
            rateLimitRetryCount < 3
          ) {
            rateLimitRetryCount += 1;
            await wait(
              error.retryAfterMs ?? 500 * 2 ** (rateLimitRetryCount - 1),
              controller.signal
            );
            continue;
          }
          throw error;
        }
      }
    },
    [analysisDelayMs, api]
  );

  const resume = useCallback(
    async (nextConnectionId: string, mappings: NotionFieldMapping[] = []) => {
      abortCurrent();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeConnectionRef.current = nextConnectionId;
      setConnectionId(nextConnectionId);
      setStage('analyzing');
      setErrorMessage(null);

      try {
        const status = await api.status(nextConnectionId, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        setWorkspaceName(status.workspaceName);

        if (status.status !== 'connected' && status.status !== 'analyzing') {
          activeConnectionRef.current = null;
          setConnectionId(null);
          setStage('error');
          setErrorMessage(getTerminalStatusMessage(status.status));
          onConnectionFinishedRef.current();
          return;
        }

        await analyze(nextConnectionId, mappings, controller);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setStage('error');
        setErrorMessage(getErrorMessage(error));
        if (
          error instanceof NotionImportApiError &&
          (error.reason === 'not-found' || error.reason === 'reauthorize')
        ) {
          activeConnectionRef.current = null;
          setConnectionId(null);
          onConnectionFinishedRef.current();
        }
      }
    },
    [abortCurrent, analyze, api]
  );

  useEffect(() => {
    let active = true;

    if (
      initialError === 'access-denied' &&
      !initialCallbackHandledRef.current
    ) {
      initialCallbackHandledRef.current = true;
      activeConnectionRef.current = null;
      setConnectionId(null);
      setStage('error');
      setErrorMessage('Notion 연결을 승인하지 않았어요. 다시 연결해 주세요.');
      onConnectionFinishedRef.current();
    } else if (initialConnectionId && !initialCallbackHandledRef.current) {
      initialCallbackHandledRef.current = true;
      queueMicrotask(() => {
        if (active) {
          void resume(initialConnectionId);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [initialConnectionId, initialError, resume]);

  useEffect(() => () => abortCurrent(), [abortCurrent]);

  useEffect(
    () => callback?.subscribe((id) => void resume(id)),
    [callback, resume]
  );

  return {
    candidateCount,
    connectionId,
    errorMessage,
    mappingRequests,
    requestCount,
    stage,
    workspaceName,

    async cancel() {
      const currentConnectionId = activeConnectionRef.current;
      abortCurrent();

      if (currentConnectionId) {
        try {
          await api.cancel(currentConnectionId);
        } catch {
          setErrorMessage(
            '연결 해제를 다시 시도할게요. 보관함 내용은 바뀌지 않았어요.'
          );
        }
      }

      activeConnectionRef.current = null;
      setConnectionId(null);
      setStage('idle');
      onConnectionFinishedRef.current();
    },

    async complete() {
      const currentConnectionId = activeConnectionRef.current;
      if (!currentConnectionId) {
        return;
      }

      try {
        const result = await api.complete(currentConnectionId);
        if (result.status === 'cleanup-pending') {
          setErrorMessage(
            '인사이트는 가져왔어요. 연결 해제는 자동으로 다시 시도할게요.'
          );
        }
      } catch {
        setErrorMessage(
          '인사이트는 가져왔어요. 연결 해제는 자동으로 다시 시도할게요.'
        );
      } finally {
        activeConnectionRef.current = null;
        setConnectionId(null);
        onConnectionFinishedRef.current();
      }
    },

    resume,

    async start(includePageUrls: boolean) {
      abortCurrent();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setStage('connecting');
      setErrorMessage(null);

      try {
        const result = await api.start(
          includePageUrls,
          callback ? 'android' : 'web',
          controller.signal
        );
        activeConnectionRef.current = result.connectionId;
        setConnectionId(result.connectionId);

        if (callback) {
          await callback.open(result.authorizeUrl);
        } else {
          openWeb(result.authorizeUrl);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setStage('error');
          setErrorMessage(getErrorMessage(error));
        }
      }
    },

    submitMappings(mappings: NotionFieldMapping[]) {
      const currentConnectionId = activeConnectionRef.current;
      if (!currentConnectionId) {
        return Promise.resolve();
      }
      setMappingRequests([]);
      return resume(currentConnectionId, mappings);
    },
  };
}

function getTerminalStatusMessage(status: string) {
  if (status === 'completed') {
    return '이미 완료된 Notion 가져오기예요.';
  }

  if (status === 'canceled') {
    return '취소된 Notion 연결이에요. 다시 연결해 주세요.';
  }

  return '완료되지 않은 Notion 연결이에요. 다시 연결해 주세요.';
}

function getErrorMessage(error: unknown) {
  if (error instanceof NotionImportApiError && error.reason === 'reauthorize') {
    return 'Notion 연결이 만료되었어요. 다시 연결해 주세요.';
  }

  if (
    error instanceof NotionImportApiError &&
    error.reason === 'permission-denied'
  ) {
    return '로그인 정보를 확인하지 못했어요. 다시 로그인한 뒤 시도해 주세요.';
  }

  return 'Notion 내용을 가져오지 못했어요. 입력한 내용은 그대로 두었어요. 다시 시도해 주세요.';
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const rejectAbort = () =>
      reject(new DOMException('작업이 취소되었습니다.', 'AbortError'));

    if (signal.aborted) {
      rejectAbort();
      return;
    }

    const abort = () => {
      window.clearTimeout(timeout);
      rejectAbort();
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
  });
}

function noop() {}
