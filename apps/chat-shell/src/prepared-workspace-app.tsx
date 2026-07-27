import { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

import {
  decodeTargetProductBootstrap,
  type TargetProductBootstrap,
} from '@ay-ple/product-contract'

import { ProductChatDock } from './product-chat-presentation.js'
import type {
  ProductBootstrap,
  ReadyProductWorkspace,
} from './product-api.js'
import { useProductChat } from './use-product-chat.js'
import { WorkspaceLifecycleView } from './workspace-lifecycle-view.js'
import './App.css'

const activeWorkspace: ReadyProductWorkspace = {
  state: 'ready',
  confirmedRevision: 0,
  course: null,
  materials: [],
  recovery: null,
}

export function PreparedWorkspaceApp() {
  const [bootstrap, setBootstrap] = useState<TargetProductBootstrap>()
  const [failure, setFailure] = useState<string>()

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/product/bootstrap', {
      cache: 'no-store',
      signal,
    })
    if (!response.ok) throw new Error('Prepared workspace bootstrap failed')
    const next = decodeTargetProductBootstrap(await response.json())
    setBootstrap(next)
    setFailure(undefined)
    return legacyAdapter(next)
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

  const chat = useProductChat({
    accountReadiness: bootstrap?.accountReadiness,
    workspace:
      bootstrap?.workspaceLifecycle.state === 'active'
        ? activeWorkspace
        : undefined,
    selectedMaterials: [],
    refreshProductSnapshot: refresh,
    refreshSettledProductState: refresh,
  })

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
    <div className="product-shell prepared-product-shell">
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
          <span>Prepared Git SemesterWorkspace</span>
          <strong>AY가 actual file에서 직접 작업합니다</strong>
        </div>
      </header>
      <main className="prepared-chat-main">
        <aside className="chat-dock" aria-label="AY Chat">
          <ProductChatDock
            controller={chat}
            accountReadiness={bootstrap.accountReadiness}
            history={undefined}
            confirmedRevision={undefined}
            materials={[]}
            bootstrapRefreshing={false}
            onNavigateEvidence={() => undefined}
            preparedWorkspace
          />
        </aside>
      </main>
    </div>
  )
}

function legacyAdapter(
  target: TargetProductBootstrap,
): ProductBootstrap {
  return {
    accountReadiness: target.accountReadiness,
    operationStatus: target.activeOperation ? 'active' : 'idle',
    workspace:
      target.workspaceLifecycle.state === 'active'
        ? activeWorkspace
        : null,
    history: {
      assignments: [],
      modelingRuns: [],
      statePatches: [],
      userConfirmations: [],
    },
  }
}
