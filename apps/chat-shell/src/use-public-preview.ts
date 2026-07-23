import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  executePublicPreviewCommand,
  fetchPublicPreviewResponse,
  ProductApiError,
  type PublicPreviewBootstrap,
  type PublicPreviewResponse,
} from './product-api.js'
import {
  createPublicPreviewCommand,
  projectPublicPreviewScreen,
  PublicPreviewActionError,
  type PublicPreviewAction,
  type PublicPreviewScreenModel,
  type PublicPreviewSemesterDraft,
} from './public-preview-view-model.js'

type PublicPreviewNotice = {
  readonly tone: 'error' | 'status'
  readonly message: string
}

export type PublicPreviewController = {
  readonly bootstrap: PublicPreviewBootstrap | null
  readonly screen: PublicPreviewScreenModel | null
  readonly initialLoading: boolean
  readonly refreshing: boolean
  readonly pendingActionId: PublicPreviewAction['id'] | null
  readonly notice: PublicPreviewNotice | null
  readonly runAction: (
    actionId: PublicPreviewAction['id'],
    draft?: PublicPreviewSemesterDraft,
  ) => Promise<void>
  readonly refresh: () => Promise<void>
}

export function usePublicPreview(): PublicPreviewController {
  const [bootstrap, setBootstrap] = useState<PublicPreviewBootstrap | null>(
    null,
  )
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingActionId, setPendingActionId] = useState<
    PublicPreviewAction['id'] | null
  >(null)
  const [notice, setNotice] = useState<PublicPreviewNotice | null>(null)
  const mounted = useRef(true)
  const requestSequence = useRef(0)

  const applyResponse = useCallback(
    (response: PublicPreviewResponse, sequence: number) => {
      if (!mounted.current || sequence !== requestSequence.current) return
      setBootstrap(response.projection)
      setNotice(
        response.status === 'error'
          ? { tone: 'error', message: response.error.displayMessage }
          : null,
      )
    },
    [],
  )

  const observe = useCallback(
    async (signal?: AbortSignal) => {
      const sequence = ++requestSequence.current
      setRefreshing(true)
      try {
        applyResponse(await fetchPublicPreviewResponse(signal), sequence)
      } catch (error) {
        if (!isAbort(error) && mounted.current) {
          setNotice({
            tone: 'error',
            message: safePublicPreviewError(error),
          })
        }
      } finally {
        if (mounted.current) {
          setInitialLoading(false)
          setRefreshing(false)
        }
      }
    },
    [applyResponse],
  )

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    void observe(controller.signal)
    return () => {
      mounted.current = false
      controller.abort()
    }
  }, [observe])

  useEffect(() => {
    if (
      bootstrap === null ||
      refreshing ||
      pendingActionId !== null ||
      !shouldPoll(bootstrap)
    ) {
      return
    }
    const timeout = window.setTimeout(() => {
      void observe()
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [bootstrap, observe, pendingActionId, refreshing])

  const runAction = useCallback(
    async (
      actionId: PublicPreviewAction['id'],
      draft?: PublicPreviewSemesterDraft,
    ) => {
      if (bootstrap === null || pendingActionId !== null) return
      let command
      try {
        command = createPublicPreviewCommand(bootstrap, actionId, draft)
      } catch (error) {
        setNotice({
          tone: 'error',
          message: safePublicPreviewError(error),
        })
        return
      }

      setPendingActionId(actionId)
      setNotice(null)
      const sequence = ++requestSequence.current
      try {
        applyResponse(await executePublicPreviewCommand(command), sequence)
      } catch (error) {
        if (mounted.current) {
          setNotice({
            tone: 'error',
            message: safePublicPreviewError(error),
          })
        }
      } finally {
        if (mounted.current) setPendingActionId(null)
      }
    },
    [applyResponse, bootstrap, pendingActionId],
  )

  const refresh = useCallback(async () => {
    setNotice(null)
    await observe()
  }, [observe])

  return {
    bootstrap,
    screen: useMemo(
      () => (bootstrap === null ? null : projectPublicPreviewScreen(bootstrap)),
      [bootstrap],
    ),
    initialLoading,
    refreshing,
    pendingActionId,
    notice,
    runAction,
    refresh,
  }
}

function shouldPoll(bootstrap: PublicPreviewBootstrap): boolean {
  return (
    bootstrap.account.state === 'checking' ||
    bootstrap.account.state === 'login_starting' ||
    bootstrap.account.state === 'login_pending' ||
    bootstrap.account.state === 'verifying' ||
    bootstrap.setup.state === 'working'
  )
}

function safePublicPreviewError(error: unknown): string {
  if (error instanceof ProductApiError) return error.displayMessage
  if (error instanceof PublicPreviewActionError) return error.message
  return '지금은 학기 공간 상태를 확인할 수 없습니다.'
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
