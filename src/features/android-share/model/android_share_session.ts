import type { CapturedInsight } from '@/entities/insight';

import {
  extractSharedUrl,
  hasUnsupportedSharedUrlProtocol,
} from './extract_shared_url';

export type AndroidShareInput = {
  id: string;
  text: string;
  title?: string;
};

type AndroidSharePending = {
  share: AndroidShareInput;
  url: string;
};

export type AndroidShareState =
  | { status: 'idle' }
  | ({ status: 'received' } & AndroidSharePending)
  | ({ status: 'authenticating' } & AndroidSharePending)
  | ({ status: 'saving' } & AndroidSharePending)
  | { status: 'saved'; insight: CapturedInsight }
  | { status: 'duplicate'; insight: CapturedInsight }
  | {
      status: 'editing-memo';
      insight: CapturedInsight;
      memo: string;
      result: 'duplicate' | 'saved';
    }
  | { status: 'completed' }
  | {
      status: 'error';
      message: string;
      pending?: AndroidSharePending;
      retry: 'auth' | 'save' | 'share';
    };

export type AndroidShareSession = {
  receivedShareIds: readonly string[];
  state: AndroidShareState;
};

export type AndroidShareAction =
  | AndroidShareInput
  | { type: 'authentication-started' }
  | { type: 'authentication-resumed' }
  | { type: 'authentication-failed' }
  | { type: 'saving-started' }
  | { type: 'capture-succeeded'; created: boolean; insight: CapturedInsight }
  | { type: 'capture-failed' }
  | { type: 'memo-editing-started' }
  | { type: 'memo-changed'; memo: string }
  | { type: 'completed' };

export type AndroidShareEffect = 'authenticate' | 'capture' | 'ignore' | 'none';

export type AndroidShareTransition = {
  effect: AndroidShareEffect;
  session: AndroidShareSession;
};

const URL_NOT_FOUND_MESSAGE = '저장할 링크를 찾지 못했어요.';
const UNSUPPORTED_PROTOCOL_MESSAGE = 'http 또는 https 링크만 저장할 수 있어요.';
const AUTHENTICATION_FAILED_MESSAGE = '로그인을 완료하지 못했어요.';
const SHARE_MEMORY_LOST_MESSAGE =
  '로그인은 완료됐지만 링크를 다시 받아야 해요.';
const CAPTURE_FAILED_MESSAGE = '저장하지 못했어요.';
const RECENT_SHARE_ID_LIMIT = 32;

export function createAndroidShareSession(): AndroidShareSession {
  return {
    receivedShareIds: [],
    state: { status: 'idle' },
  };
}

function transition(
  session: AndroidShareSession,
  state: AndroidShareState,
  effect: AndroidShareEffect = 'none'
): AndroidShareTransition {
  return {
    effect,
    session: {
      ...session,
      state,
    },
  };
}

function isShareInput(action: AndroidShareAction): action is AndroidShareInput {
  return 'id' in action;
}

function getPending(state: AndroidShareState): AndroidSharePending | undefined {
  if (
    state.status === 'received' ||
    state.status === 'authenticating' ||
    state.status === 'saving'
  ) {
    return { share: state.share, url: state.url };
  }

  return state.status === 'error' ? state.pending : undefined;
}

function receiveShare(
  session: AndroidShareSession,
  share: AndroidShareInput
): AndroidShareTransition {
  if (session.receivedShareIds.includes(share.id)) {
    return { effect: 'ignore', session };
  }

  const receivedShareIds = [...session.receivedShareIds, share.id].slice(
    -RECENT_SHARE_ID_LIMIT
  );
  const url = extractSharedUrl(share.text);

  if (!url) {
    const message = hasUnsupportedSharedUrlProtocol(share.text)
      ? UNSUPPORTED_PROTOCOL_MESSAGE
      : URL_NOT_FOUND_MESSAGE;

    return {
      effect: 'none',
      session: {
        receivedShareIds,
        state: { status: 'error', message, retry: 'share' },
      },
    };
  }

  return {
    effect: 'none',
    session: {
      receivedShareIds,
      state: { status: 'received', share, url },
    },
  };
}

export function reduceShareSession(
  session: AndroidShareSession,
  action: AndroidShareAction
): AndroidShareTransition {
  if (isShareInput(action)) {
    return receiveShare(session, action);
  }

  const { state } = session;

  switch (action.type) {
    case 'authentication-started': {
      const pending = getPending(state);
      if (!pending) {
        return { effect: 'none', session };
      }

      return transition(
        session,
        { status: 'authenticating', ...pending },
        'authenticate'
      );
    }

    case 'authentication-resumed': {
      const pending = getPending(state);
      if (!pending) {
        return transition(session, {
          status: 'error',
          message: SHARE_MEMORY_LOST_MESSAGE,
          retry: 'share',
        });
      }

      return transition(session, { status: 'saving', ...pending }, 'capture');
    }

    case 'authentication-failed': {
      const pending = getPending(state);
      if (!pending) {
        return { effect: 'none', session };
      }

      return transition(session, {
        status: 'error',
        message: AUTHENTICATION_FAILED_MESSAGE,
        pending,
        retry: 'auth',
      });
    }

    case 'saving-started': {
      const pending = getPending(state);
      if (!pending) {
        return { effect: 'none', session };
      }

      return transition(session, { status: 'saving', ...pending }, 'capture');
    }

    case 'capture-succeeded':
      if (state.status !== 'saving') {
        return { effect: 'none', session };
      }

      return transition(
        session,
        action.created
          ? { status: 'saved', insight: action.insight }
          : { status: 'duplicate', insight: action.insight }
      );

    case 'capture-failed': {
      const pending = getPending(state);
      if (!pending) {
        return { effect: 'none', session };
      }

      return transition(session, {
        status: 'error',
        message: CAPTURE_FAILED_MESSAGE,
        pending,
        retry: 'save',
      });
    }

    case 'memo-editing-started':
      if (state.status !== 'saved' && state.status !== 'duplicate') {
        return { effect: 'none', session };
      }

      return transition(session, {
        status: 'editing-memo',
        insight: state.insight,
        memo: state.insight.memo ?? '',
        result: state.status,
      });

    case 'memo-changed':
      if (state.status !== 'editing-memo') {
        return { effect: 'none', session };
      }

      return transition(session, { ...state, memo: action.memo });

    case 'completed':
      if (
        state.status !== 'saved' &&
        state.status !== 'duplicate' &&
        state.status !== 'editing-memo' &&
        state.status !== 'error'
      ) {
        return { effect: 'none', session };
      }

      return transition(session, { status: 'completed' });
  }
}
