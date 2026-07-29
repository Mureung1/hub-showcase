import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { generateMockCurriculum } from '../model/curriculumGenerator'
import { CurriculumDetailModal } from './CurriculumDetailModal'

describe('CurriculumDetailModal', () => {
  it('allows the active curriculum to resume learning', () => {
    const plan = generateMockCurriculum('React 배우기')
    const markup = renderToStaticMarkup(
      <CurriculumDetailModal
        snapshot={{
          id: plan.id,
          goal: plan.goal,
          plan,
          generatedAt: '2026-07-29T00:00:00.000Z',
        }}
        originRect={null}
        onClose={vi.fn()}
        onActivate={vi.fn()}
        isActive
      />,
    )

    expect(markup).toContain('이어서 학습하기')
    expect(markup).not.toContain('disabled')
  })
})
