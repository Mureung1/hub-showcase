import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import type {
  InsightCaptureService,
  InsightMemoService,
} from '@/entities/insight';
import type { AndroidSharePluginAdapter } from '@/shared/capacitor';

import {
  createAndroidShareSession,
  reduceShareSession,
  type AndroidShareAction,
  type AndroidShareState,
} from './android_share_session';

type AndroidShareAuthStatus = 'loading' | 'signed-in' | 'signed-out';

export type UseAndroidShareOptions = {
  androidShareOAuthCallbackRevision: number;
  authStatus: AndroidShareAuthStatus;
  captureService: InsightCaptureService;
  hasSignInError: boolean;
  memoService: InsightMemoService;
  plugin: AndroidSharePluginAdapter;
  signInWithGoogle: (context?: 'android-share') => Promise<void>;
};

export type AndroidShareController = {
  changeMemo: (memo: string) => void;
  complete: () => Promise<void>;
  completionError?: string;
  dismiss: () => Promise<void>;
  isCompleting: boolean;
  memoError?: string;
  retry: () => void;
  startMemoEditing: () => void;
  state: AndroidShareState;
};

type AuthAttempt = {
  callbackRevision: number;
  errorCleared: boolean;
  id: number;
  startedSignedIn: boolean;
};

const MEMO_SAVE_ERROR = '메모를 저장하지 못했어요. 입력은 유지했어요.';
const COMPLETION_ERROR = '원래 앱으로 돌아가지 못했어요. 다시 시도해 주세요.';
const MAX_MEMO_LENGTH = 200;

function sessionReducer(
  session: ReturnType<typeof createAndroidShareSession>,
  action: AndroidShareAction
) {
  return reduceShareSession(session, action).session;
}

export function useAndroidShare({
  androidShareOAuthCallbackRevision,
  authStatus,
  captureService,
  hasSignInError,
  memoService,
  plugin,
  signInWithGoogle,
}: UseAndroidShareOptions): AndroidShareController {
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    createAndroidShareSession
  );
  const [isCompleting, setIsCompleting] = useState(false);
  const [memoError, setMemoError] = useState<string>();
  const [completionError, setCompletionError] = useState<string>();
  const activeShareIdRef = useRef<string | undefined>(undefined);
  const authAttemptRef = useRef<AuthAttempt | undefined>(undefined);
  const attemptedAuthIdRef = useRef(0);
  const attemptedSavingStateRef = useRef<AndroidShareState | undefined>(
    undefined
  );
  const observedOAuthCallbackRevisionRef = useRef(0);
  const savedMemoRef = useRef<{ insightId: string; memo: string } | undefined>(
    undefined
  );
  const state = session.state;

  const beginAuthentication = useCallback(() => {
    authAttemptRef.current = {
      callbackRevision: androidShareOAuthCallbackRevision,
      errorCleared: !hasSignInError,
      id: (authAttemptRef.current?.id ?? 0) + 1,
      startedSignedIn: authStatus === 'signed-in',
    };
    dispatch({ type: 'authentication-started' });
  }, [androidShareOAuthCallbackRevision, authStatus, hasSignInError]);

  useEffect(() => {
    let disposed = false;
    let release: (() => Promise<void>) | undefined;

    void plugin
      .subscribe((share) => {
        activeShareIdRef.current = share.id;
        savedMemoRef.current = undefined;
        setCompletionError(undefined);
        setMemoError(undefined);
        dispatch(share);
      })
      .then((nextRelease) => {
        if (disposed) {
          void nextRelease();
          return;
        }

        release = nextRelease;
      });

    return () => {
      disposed = true;
      void release?.();
    };
  }, [plugin]);

  useEffect(() => {
    if (state.status !== 'received' || authStatus === 'loading') {
      return;
    }

    if (authStatus === 'signed-in') {
      dispatch({ type: 'saving-started' });
      return;
    }

    beginAuthentication();
  }, [authStatus, beginAuthentication, state.status]);

  useEffect(() => {
    const authAttempt = authAttemptRef.current;

    if (
      state.status !== 'authenticating' ||
      !authAttempt ||
      attemptedAuthIdRef.current === authAttempt.id
    ) {
      return;
    }

    attemptedAuthIdRef.current = authAttempt.id;
    void signInWithGoogle('android-share');
  }, [signInWithGoogle, state.status]);

  useEffect(() => {
    const authAttempt = authAttemptRef.current;

    if (state.status !== 'authenticating' || !authAttempt) {
      return;
    }

    if (!hasSignInError && !authAttempt.errorCleared) {
      authAttempt.errorCleared = true;
      return;
    }

    if (hasSignInError && authAttempt.errorCleared) {
      dispatch({ type: 'authentication-failed' });
      return;
    }

    const callbackReturned =
      androidShareOAuthCallbackRevision > authAttempt.callbackRevision;
    const signedInAfterSignedOut =
      !authAttempt.startedSignedIn && authStatus === 'signed-in';

    if (callbackReturned || signedInAfterSignedOut) {
      dispatch({ type: 'authentication-resumed' });
    }
  }, [
    androidShareOAuthCallbackRevision,
    authStatus,
    hasSignInError,
    state.status,
  ]);

  useEffect(() => {
    if (
      androidShareOAuthCallbackRevision <=
      observedOAuthCallbackRevisionRef.current
    ) {
      return;
    }

    observedOAuthCallbackRevisionRef.current =
      androidShareOAuthCallbackRevision;

    if (state.status === 'idle') {
      dispatch({ type: 'authentication-resumed' });
    }
  }, [androidShareOAuthCallbackRevision, state.status]);

  useEffect(() => {
    if (
      state.status !== 'saving' ||
      attemptedSavingStateRef.current === state
    ) {
      return;
    }

    attemptedSavingStateRef.current = state;
    const savingState = state;

    void captureService
      .capture({
        source: 'android_share',
        ...(savingState.share.title?.trim()
          ? { title: savingState.share.title }
          : {}),
        url: savingState.url,
      })
      .then((result) => {
        if (activeShareIdRef.current !== savingState.share.id) {
          return;
        }

        if (!result.ok) {
          if (result.reason === 'permission-denied') {
            beginAuthentication();
            return;
          }

          dispatch({ type: 'capture-failed' });
          return;
        }

        dispatch({
          type: 'capture-succeeded',
          created: result.created,
          insight: result.insight,
        });
      });
  }, [beginAuthentication, captureService, state]);

  const startMemoEditing = useCallback(() => {
    setMemoError(undefined);
    dispatch({ type: 'memo-editing-started' });
  }, []);

  const changeMemo = useCallback((memo: string) => {
    setMemoError(undefined);
    dispatch({
      type: 'memo-changed',
      memo: [...memo].slice(0, MAX_MEMO_LENGTH).join(''),
    });
  }, []);

  const finishShare = useCallback(async () => {
    setCompletionError(undefined);
    setIsCompleting(true);

    try {
      await plugin.finishShare();
      dispatch({ type: 'completed' });
    } catch {
      setCompletionError(COMPLETION_ERROR);
    } finally {
      setIsCompleting(false);
    }
  }, [plugin]);

  const complete = useCallback(async () => {
    if (state.status === 'editing-memo') {
      const nextMemo = state.memo.trim();
      const previousMemo =
        savedMemoRef.current?.insightId === state.insight.id
          ? savedMemoRef.current.memo
          : (state.insight.memo ?? '');

      if (nextMemo !== previousMemo) {
        setIsCompleting(true);
        const result = await memoService.updateMemo(state.insight.id, nextMemo);
        setIsCompleting(false);

        if (!result.ok) {
          setMemoError(MEMO_SAVE_ERROR);
          return;
        }

        savedMemoRef.current = {
          insightId: state.insight.id,
          memo: nextMemo,
        };
      }
    }

    await finishShare();
  }, [finishShare, memoService, state]);

  const retry = useCallback(() => {
    setCompletionError(undefined);
    setMemoError(undefined);

    if (state.status !== 'error') {
      return;
    }

    if (state.retry === 'auth') {
      beginAuthentication();
      return;
    }

    if (state.retry === 'save') {
      dispatch({ type: 'saving-started' });
    }
  }, [beginAuthentication, state]);

  return {
    changeMemo,
    complete,
    ...(completionError ? { completionError } : {}),
    dismiss: finishShare,
    isCompleting,
    ...(memoError ? { memoError } : {}),
    retry,
    startMemoEditing,
    state,
  };
}
