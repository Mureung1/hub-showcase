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
        role={lifecycle.state === 'recovery_required' ? 'alert' : 'status'}
      >
        <LifecycleIcon lifecycle={lifecycle} />
        <p className="workspace-lifecycle-eyebrow">
          {lifecycle.state === 'starting'
            ? 'Starting'
            : lifecycle.state === 'active'
              ? 'Active'
              : 'Recovery required'}
        </p>
        <h1>{lifecycleHeading(lifecycle)}</h1>
        <p className="workspace-lifecycle-message">
          {lifecycleMessage(lifecycle)}
        </p>
        {lifecycle.workspace ? (
          <WorkspaceReference lifecycle={lifecycle} />
        ) : null}
        {lifecycle.state === 'recovery_required' ? (
          <p className="workspace-lifecycle-guidance">
            {recoveryGuidance(lifecycle.reason)}
          </p>
        ) : null}
      </section>
    </main>
  )
}

function LifecycleIcon({
  lifecycle,
}: {
  readonly lifecycle: ProductWorkspaceLifecycle
}) {
  if (lifecycle.state === 'starting') {
    return (
      <span className="workspace-lifecycle-icon is-loading" aria-hidden="true">
        <LoaderCircle size={30} />
      </span>
    )
  }
  if (lifecycle.state === 'active') {
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

function lifecycleHeading(lifecycle: ProductWorkspaceLifecycle): string {
  if (lifecycle.state === 'starting') {
    return `${lifecycle.workspace.label} 작업공간을 여는 중입니다`
  }
  if (lifecycle.state === 'active') {
    return `${lifecycle.workspace.label} 작업공간이 준비되었습니다`
  }
  switch (lifecycle.reason) {
    case 'workspace_unavailable':
      return '등록된 학기 작업공간을 열 수 없습니다'
    case 'runtime_unavailable':
      return 'AY Runtime을 계속 사용할 수 없습니다'
    case 'registry_incompatible':
      return 'WorkspaceRegistry를 확인해야 합니다'
    case 'prepared_workspace_required':
      return '준비된 학기 작업공간이 필요합니다'
  }
}

function lifecycleMessage(lifecycle: ProductWorkspaceLifecycle): string {
  if (lifecycle.state === 'starting') {
    return '새 Runtime과 Interaction 연결을 확인하고 있습니다.'
  }
  if (lifecycle.state === 'active') {
    return '이 process에서 새로 만든 Runtime과 thread로 AY Chat을 시작할 수 있습니다.'
  }
  return lifecycle.displayMessage
}

function recoveryGuidance(
  reason: Extract<
    ProductWorkspaceLifecycle,
    { readonly state: 'recovery_required' }
  >['reason'],
): string {
  switch (reason) {
    case 'workspace_unavailable':
      return 'Native Bootstrap 결과와 workspace identity를 확인한 뒤 App 밖에서 다시 실행해 주세요.'
    case 'runtime_unavailable':
      return '현재 process를 종료한 뒤 같은 prepared workspace로 AY-PLE을 다시 실행해 주세요.'
    case 'registry_incompatible':
      return 'Registry 원본은 보존되었습니다. 파일을 reset하지 말고 호환 가능한 AY-PLE에서 확인해 주세요.'
    case 'prepared_workspace_required':
      return '먼저 native Bootstrap Skill을 완료하고 explicit --workspace 경로로 AY-PLE을 실행해 주세요.'
  }
}
