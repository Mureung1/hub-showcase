import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
} from 'lucide-react'

import type {
  ProductWorkspaceLifecycle,
  TargetProductBootstrap,
} from '@ay-ple/product-contract'

import './workspace-lifecycle-view.css'

export function WorkspaceLifecycleView({
  bootstrap,
}: {
  readonly bootstrap: TargetProductBootstrap
}) {
  const lifecycle = bootstrap.workspaceLifecycle
  const presentation = projectLifecyclePresentation(lifecycle)

  return (
    <main
      className="workspace-lifecycle-shell"
      data-workspace-lifecycle={lifecycle.state}
      data-recovery-reason={
        lifecycle.state === 'recovery_required'
          ? lifecycle.reason
          : undefined
      }
    >
      <header className="workspace-lifecycle-header">
        <div className="workspace-lifecycle-brand">
          <span aria-hidden="true">
            <Sparkles size={20} strokeWidth={2.2} />
          </span>
          <div>
            <strong>AY-PLE</strong>
            <small>SemesterWorkspace</small>
          </div>
        </div>
        <p>준비된 Git workspace만 안전하게 엽니다.</p>
      </header>

      <section
        className={`workspace-lifecycle-card is-${lifecycle.state}`}
        aria-label="AY 작업공간 상태"
        role={presentation.role}
      >
        <LifecycleIcon kind={presentation.icon} />
        <p className="workspace-lifecycle-eyebrow">
          {presentation.eyebrow}
        </p>
        <h1>{presentation.heading}</h1>
        <p className="workspace-lifecycle-message">
          {presentation.message}
        </p>
        {lifecycle.workspace ? (
          <WorkspaceReference lifecycle={lifecycle} />
        ) : null}
        {presentation.guidance ? (
          <p className="workspace-lifecycle-guidance">
            {presentation.guidance}
          </p>
        ) : null}
      </section>
    </main>
  )
}

function LifecycleIcon({
  kind,
}: {
  readonly kind: LifecyclePresentation['icon']
}) {
  if (kind === 'loading') {
    return (
      <span className="workspace-lifecycle-icon is-loading" aria-hidden="true">
        <LoaderCircle size={30} />
      </span>
    )
  }
  if (kind === 'active') {
    return (
      <span className="workspace-lifecycle-icon is-active" aria-hidden="true">
        <CheckCircle2 size={30} />
      </span>
    )
  }
  return (
    <span className="workspace-lifecycle-icon is-recovery" aria-hidden="true">
      <AlertTriangle size={30} />
    </span>
  )
}

function WorkspaceReference({
  lifecycle,
}: {
  readonly lifecycle: Exclude<
    ProductWorkspaceLifecycle,
    { readonly workspace: null }
  >
}) {
  const workspace = lifecycle.workspace
  return (
    <dl className="workspace-lifecycle-summary">
      <div>
        <dt>학기</dt>
        <dd>{workspace.label}</dd>
      </div>
      {'semester' in workspace ? (
        <div>
          <dt>Workspace</dt>
          <dd>{workspace.workspaceId}</dd>
        </div>
      ) : null}
    </dl>
  )
}

type LifecyclePresentation = {
  readonly role: 'alert' | 'status'
  readonly eyebrow: string
  readonly icon: 'active' | 'loading' | 'recovery'
  readonly heading: string
  readonly message: string
  readonly guidance?: string
}

function projectLifecyclePresentation(
  lifecycle: ProductWorkspaceLifecycle,
): LifecyclePresentation {
  if (lifecycle.state === 'starting') {
    return {
      role: 'status',
      eyebrow: 'Starting',
      icon: 'loading',
      heading: `${lifecycle.workspace.label} 작업공간을 여는 중입니다`,
      message: '새 Runtime과 Interaction 연결을 확인하고 있습니다.',
    }
  }
  if (lifecycle.state === 'active') {
    return {
      role: 'status',
      eyebrow: 'Active',
      icon: 'active',
      heading: `${lifecycle.workspace.label} 작업공간이 준비되었습니다`,
      message:
        '이 process에서 새로 만든 Runtime과 thread로 AY Chat을 시작할 수 있습니다.',
    }
  }

  const recovery = {
    role: 'alert',
    eyebrow: 'Recovery required',
    icon: 'recovery',
    message: lifecycle.displayMessage,
  } as const
  switch (lifecycle.reason) {
    case 'workspace_unavailable':
      return {
        ...recovery,
        heading: '등록된 학기 작업공간을 열 수 없습니다',
        guidance:
          'Native Bootstrap 결과와 workspace identity를 확인한 뒤 App 밖에서 다시 실행해 주세요.',
      }
    case 'runtime_unavailable':
      return {
        ...recovery,
        heading: 'AY Runtime을 계속 사용할 수 없습니다',
        guidance:
          '현재 process를 종료한 뒤 같은 prepared workspace로 AY-PLE을 다시 실행해 주세요.',
      }
    case 'registry_incompatible':
      return {
        ...recovery,
        heading: 'WorkspaceRegistry를 확인해야 합니다',
        guidance:
          'Registry 원본은 보존되었습니다. 파일을 reset하지 말고 호환 가능한 AY-PLE에서 확인해 주세요.',
      }
    case 'prepared_workspace_required':
      return {
        ...recovery,
        heading: '준비된 학기 작업공간이 필요합니다',
        guidance:
          '먼저 native Bootstrap Skill을 완료하고 explicit --workspace 경로로 AY-PLE을 실행해 주세요.',
      }
  }
}
