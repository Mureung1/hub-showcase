import { useCallback, useEffect, useState } from 'react'
import {
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react'

import {
  decodeTargetProductBootstrap,
  type TargetProductBootstrap,
} from '@ay-ple/product-contract'

import { PreparedProductChat } from './prepared-product-chat.js'
import {
  PreparedSourceWorkbench,
  usePreparedWorkspaceSources,
} from './prepared-source-workbench.js'
import { usePreparedProductChat } from './use-prepared-product-chat.js'
import { WorkspaceLifecycleView } from './workspace-lifecycle-view.js'
import './App.css'

export function PreparedWorkspaceApp() {
  const [bootstrap, setBootstrap] = useState<TargetProductBootstrap>()
  const [failure, setFailure] = useState<string>()
  const [chatOpen, setChatOpen] = useState(true)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/product/bootstrap', {
      cache: 'no-store',
      signal,
    })
    if (!response.ok) throw new Error('Prepared workspace bootstrap failed')
    const next = decodeTargetProductBootstrap(await response.json())
    setBootstrap(next)
    setFailure(undefined)
    return next
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted) {
        setFailure('AY 작업공간 상태를 확인하지 못했습니다.')
      }
    })
    return () => controller.abort()
  }, [refresh])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh().catch(() => undefined)
    }, 500)
    return () => window.clearInterval(timer)
  }, [refresh])

  const chat = usePreparedProductChat({
    accountReadiness:
      bootstrap?.accountReadiness ?? {
        state: 'unavailable',
        displayMessage: 'AY Runtime 준비가 완료되지 않았습니다.',
      },
    lifecycle: bootstrap?.workspaceLifecycle,
    activeOperation: bootstrap?.activeOperation ?? null,
    onSettled: () => refresh().then(() => undefined),
  })
  const sources = usePreparedWorkspaceSources(
    bootstrap?.workspaceLifecycle.state === 'active',
  )

  if (failure) {
    return (
      <main className="workspace-lifecycle-shell">
        <section className="workspace-lifecycle-card is-recovery_required" role="alert">
          <p className="workspace-lifecycle-eyebrow">Recovery required</p>
          <h1>AY-PLE을 시작하지 못했습니다</h1>
          <p className="workspace-lifecycle-message">{failure}</p>
        </section>
      </main>
    )
  }
  if (!bootstrap) {
    return (
      <main className="workspace-lifecycle-shell">
        <section className="workspace-lifecycle-card is-starting" role="status">
          <p className="workspace-lifecycle-eyebrow">Starting</p>
          <h1>AY 작업공간을 확인하는 중입니다</h1>
        </section>
      </main>
    )
  }
  if (bootstrap.workspaceLifecycle.state !== 'active') {
    return <WorkspaceLifecycleView bootstrap={bootstrap} />
  }

  return (
    <div
      className={`product-shell prepared-product-shell ${
        chatOpen ? 'chat-open' : 'chat-closed'
      }`}
    >
      <header className="product-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Sparkles size={19} strokeWidth={2.2} />
          </div>
          <div>
            <strong>AY-PLE</strong>
            <span>{bootstrap.workspaceLifecycle.workspace.label}</span>
          </div>
        </div>
        <div className="header-context" aria-label="현재 작업공간">
          <span>자료 중심 SemesterWorkspace</span>
          <strong>Git actual file · AY Chat</strong>
        </div>
        <button
          className="chat-toggle"
          type="button"
          aria-expanded={chatOpen}
          onClick={() => setChatOpen((current) => !current)}
        >
          {chatOpen ? (
            <PanelRightClose size={18} />
          ) : (
            <PanelRightOpen size={18} />
          )}
          {chatOpen ? 'AY Chat 숨기기' : 'AY Chat 열기'}
        </button>
      </header>
      <div className="workbench-grid">
        <PreparedSourceWorkbench
          controller={sources}
          action={{
            invocationEnabled:
              chat.canStartOperation &&
              sources.listView.state === 'loaded',
            selectionLocked: chat.operationActive,
            onInvoke: (relativePaths) => {
              setChatOpen(true)
              void chat.invokeOrganizeSources(relativePaths)
            },
          }}
        />
        <aside
          className="chat-dock"
          aria-label="AY Chat"
          hidden={!chatOpen}
        >
          <PreparedProductChat
            controller={chat}
            onNavigateEvidence={sources.navigateEvidence}
          />
        </aside>
      </div>
    </div>
  )
}
