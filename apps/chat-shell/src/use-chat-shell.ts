import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import type {
  CodexChatStatus,
  CodexChatStreamFrame,
} from '@ay-ple/codex-chat-runtime/contract'

import {
  ChatApiError,
  fetchCodexChatStatus,
  startCodexChatThread,
  streamCodexChatTurn,
} from './chat-api.js'
import {
  createInitialChatState,
  reduceChatState,
  type ChatFailure,
} from './chat-model.js'

export type StatusView =
  | { readonly state: 'loading' }
  | { readonly state: 'loaded'; readonly value: CodexChatStatus }
  | { readonly state: 'error' }

const GENERIC_REQUEST_FAILURE = {
  code: 'request_failed',
  displayMessage: '대화 요청을 완료하지 못했습니다.',
} as const

export function useChatShell() {
  const [status, setStatus] = useState<StatusView>({ state: 'loading' })
  const [conversation, dispatch] = useReducer(
    reduceChatState,
    undefined,
    createInitialChatState,
  )
  const [draft, setDraft] = useState('')
  const [threadPending, setThreadPending] = useState(false)
  const [actionFailure, setActionFailure] = useState<ChatFailure>()
  const streamController = useRef<AbortController | undefined>(undefined)

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    setStatus({ state: 'loading' })
    try {
      const value = await fetchCodexChatStatus(signal)
      setStatus({ state: 'loaded', value })
    } catch {
      if (!signal?.aborted) setStatus({ state: 'error' })
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadStatus(controller.signal)
    return () => {
      controller.abort()
      streamController.current?.abort()
    }
  }, [loadStatus])

  const runtimeCanStart =
    status.state === 'loaded' &&
    (status.value.state === 'configured' || status.value.state === 'ready')
  const turnActive =
    conversation.phase === 'submitting' || conversation.phase === 'running'
  const canStartThread = runtimeCanStart && !threadPending && !turnActive
  const canSubmit =
    conversation.phase === 'ready' &&
    conversation.threadId !== undefined &&
    draft.trim().length > 0

  async function startConversation() {
    if (!canStartThread) return
    setThreadPending(true)
    setActionFailure(undefined)
    if (status.state === 'loaded' && status.value.state === 'configured') {
      setStatus({
        state: 'loaded',
        value: { ...status.value, state: 'starting' },
      })
    }
    try {
      const thread = await startCodexChatThread()
      dispatch({ type: 'thread.started', threadId: thread.threadId })
      setDraft('')
      await loadStatus()
    } catch (error) {
      setActionFailure(safeFailure(error))
      await loadStatus()
    } finally {
      setThreadPending(false)
    }
  }

  async function submitTurn() {
    if (!canSubmit || conversation.threadId === undefined) return
    const text = draft
    const threadId = conversation.threadId
    const controller = new AbortController()
    let accepted = false
    let runtimeFailed = false
    streamController.current = controller
    setActionFailure(undefined)
    setDraft('')
    dispatch({ type: 'turn.submitted', text })
    try {
      await streamCodexChatTurn(
        threadId,
        text,
        (frame: CodexChatStreamFrame) => {
          if (frame.type === 'turn.accepted') accepted = true
          if (frame.type === 'runtime.failed') {
            runtimeFailed = true
            setStatus({ state: 'loading' })
          }
          dispatch({ type: 'stream.frame', frame })
        },
        controller.signal,
      )
    } catch (error) {
      if (controller.signal.aborted) return
      if (!accepted && error instanceof ChatApiError) {
        dispatch({
          type: 'turn.request-failed',
          failure: safeFailure(error),
        })
      } else {
        dispatch({ type: 'stream.failed' })
      }
    } finally {
      if (runtimeFailed) await loadStatus(controller.signal)
      if (streamController.current === controller) {
        streamController.current = undefined
      }
    }
  }

  return {
    status,
    conversation,
    draft,
    setDraft,
    threadPending,
    actionFailure,
    runtimeCanStart,
    canStartThread,
    canSubmit,
    loadStatus,
    startConversation,
    submitTurn,
  }
}

function safeFailure(error: unknown): ChatFailure {
  return error instanceof ChatApiError
    ? { code: error.code, displayMessage: error.displayMessage }
    : GENERIC_REQUEST_FAILURE
}
