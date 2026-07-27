// src/features/learning-workspace/components/WorkspaceGuidePanel.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceGuidePanel } from './WorkspaceGuidePanel'

describe('WorkspaceGuidePanel', () => {
  it('renders the conversation area and composer when there are no messages yet', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceGuidePanel
        tutorMessages={[]}
        tutorQuestion=""
        isAskingTutor={false}
        onTutorQuestionChange={vi.fn()}
        onSubmitTutorQuestion={vi.fn()}
      />,
    )

    expect(markup).toContain('튜터 대화')
    expect(markup).toContain('튜터에게 질문하기')
  })

  it('renders user, tutor, and error messages when present', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceGuidePanel
        tutorMessages={[
          { role: 'user', text: 'useState가 뭐야?' },
          { role: 'tutor', text: '상태를 저장하는 훅입니다.' },
          { role: 'error', text: '답변을 받지 못했습니다.' },
        ]}
        tutorQuestion=""
        isAskingTutor={false}
        onTutorQuestionChange={vi.fn()}
        onSubmitTutorQuestion={vi.fn()}
      />,
    )

    expect(markup).toContain('useState가 뭐야?')
    expect(markup).toContain('상태를 저장하는 훅입니다.')
    expect(markup).toContain('답변을 받지 못했습니다.')
  })

  it('disables the composer and shows a loading label while asking', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceGuidePanel
        tutorMessages={[]}
        tutorQuestion="useState가 뭐야?"
        isAskingTutor
        onTutorQuestionChange={vi.fn()}
        onSubmitTutorQuestion={vi.fn()}
      />,
    )

    expect(markup).toContain('답변 중...')
    expect(markup).toContain('disabled')
  })

  it('shows the loading burst indicator while asking', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceGuidePanel
        tutorMessages={[]}
        tutorQuestion=""
        isAskingTutor
        onTutorQuestionChange={vi.fn()}
        onSubmitTutorQuestion={vi.fn()}
      />,
    )

    expect(markup).toContain('튜터 답변 준비 중')
  })

  it('does not show the loading burst indicator when idle', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceGuidePanel
        tutorMessages={[]}
        tutorQuestion=""
        isAskingTutor={false}
        onTutorQuestionChange={vi.fn()}
        onSubmitTutorQuestion={vi.fn()}
      />,
    )

    expect(markup).not.toContain('튜터 답변 준비 중')
  })
})
