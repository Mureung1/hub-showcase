import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TodayLearningHub } from './TodayLearningHub'

describe('TodayLearningHub', () => {
  it('keeps the dashboard focused on the primary learning workflow', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TodayLearningHub />
      </MemoryRouter>,
    )

    expect(markup).toContain('학습 진행 현황')
    expect(markup).toContain('오늘 학습 큐')
    expect(markup).toContain('복습과 오답')
    expect(markup).toContain('작업 공간 미리보기')
    expect(markup).toContain('data-track-icon="git-lab"')
    expect(markup).toContain('data-track-icon="react-practice"')
    expect(markup).toContain('data-track-icon="docker-practice"')
    expect(markup).toContain('현재 단계')
    expect(markup).toContain('최근 학습')
    expect(markup).toContain('다음 학습')
    expect(markup).toContain('href="/curriculum/history"')
    expect(markup).toContain('Step 0 /')
    expect(markup).not.toContain('calendar-title')
  })
})
