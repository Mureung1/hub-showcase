import { createRoot } from 'react-dom/client'

import type { TargetProductBootstrap } from '@ay-ple/product-contract'

import { WorkspaceLifecycleView } from '../src/workspace-lifecycle-view.js'
import '../src/index.css'

const targetWorkspace = {
  workspaceId: `workspace_${'2'.repeat(32)}`,
  semester: {
    yearLevel: 2,
    term: { key: 'spring', displayName: '1학기' },
  },
  label: '2학년 1학기',
} as const
const previousWorkspace = {
  workspaceId: `workspace_${'1'.repeat(32)}`,
  semester: {
    yearLevel: 2,
    term: { key: 'fall', displayName: '2학기' },
  },
  label: '2학년 2학기',
} as const

const scenario = new URLSearchParams(globalThis.location.search).get('scenario')
const bootstrap = scenarioBootstrap(scenario)
const root = document.getElementById('root')
if (!root) throw new Error('Workspace lifecycle target root is missing')
createRoot(root).render(<WorkspaceLifecycleView bootstrap={bootstrap} />)

function scenarioBootstrap(value: string | null): TargetProductBootstrap {
  const workspaceLifecycle: TargetProductBootstrap['workspaceLifecycle'] =
    value === 'starting'
      ? { state: 'starting', workspace: targetWorkspace }
      : value === 'active'
        ? { state: 'active', workspace: targetWorkspace }
        : value === 'failed-switch'
          ? { state: 'active', workspace: previousWorkspace }
          : value === 'workspace-unavailable'
            ? {
                state: 'recovery_required',
                workspace: {
                  availability: 'unavailable',
                  workspaceId: previousWorkspace.workspaceId,
                  label: '등록된 학기 작업공간',
                },
                reason: 'workspace_unavailable',
                displayMessage:
                  '등록된 SemesterWorkspace를 다시 확인해 주세요.',
              }
            : value === 'runtime-unavailable'
              ? {
                  state: 'recovery_required',
                  workspace: {
                    availability: 'available',
                    ...targetWorkspace,
                  },
                  reason: 'runtime_unavailable',
                  displayMessage:
                    'Workspace Runtime을 계속 사용할 수 없습니다.',
                }
              : value === 'registry-incompatible'
                ? {
                    state: 'recovery_required',
                    workspace: null,
                    reason: 'registry_incompatible',
                    displayMessage:
                      'WorkspaceRegistry 원본을 보존한 채 멈췄습니다.',
                  }
                : value === 'prepared-workspace-required'
                  ? {
                      state: 'recovery_required',
                      workspace: null,
                      reason: 'prepared_workspace_required',
                      displayMessage:
                        '준비된 SemesterWorkspace가 필요합니다.',
                    }
                  : {
                      state: 'active',
                      workspace: previousWorkspace,
                    }
  return {
    accountReadiness: { state: 'ready' },
    workspaceLifecycle,
    activeOperation: null,
  }
}
