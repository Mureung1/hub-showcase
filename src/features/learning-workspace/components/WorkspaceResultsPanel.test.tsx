import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceResultsPanel } from './WorkspaceResultsPanel'

describe('WorkspaceResultsPanel', () => {
  it('renders test status, learner actions, and recent activity', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceResultsPanel
        activityLog={[
          {
            id: 'activity-1',
            time: '10:30',
            title: '테스트 통과',
            detail: '화면 렌더링까지 확인했습니다.',
          },
        ]}
        canAdvance
        failedCount={0}
        nextStepButtonLabel="다음 단계"
        onAdvanceStep={vi.fn()}
        onShowHint={vi.fn()}
        onShowReview={vi.fn()}
        passedCount={1}
        pendingCount={0}
        resultMessage="모든 테스트를 통과했습니다."
        testCases={[
          {
            id: 'case-1',
            input: '버튼 클릭',
            expected: '카운트 증가',
            actual: '카운트 증가',
            state: 'passed',
            runtime: '12ms',
          },
        ]}
      />,
    )

    expect(markup).toContain('모든 테스트를 통과했습니다.')
    expect(markup).toContain('통과 1')
    expect(markup).toContain('다음 단계')
    expect(markup).toContain('화면 렌더링까지 확인했습니다.')
  })
})
