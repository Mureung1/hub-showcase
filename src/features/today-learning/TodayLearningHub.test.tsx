import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TodayLearningHub } from './TodayLearningHub'

describe('TodayLearningHub', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('keeps the dashboard focused on the primary learning workflow', () => {
    vi.stubEnv('VITE_ICU_API_MODE', 'mock')
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
    expect(markup).not.toContain('레벨 이어하기')
    expect(markup.match(/>이어하기<\/a>/g)?.length).toBeGreaterThanOrEqual(2)
    expect(markup).toContain('href="/curriculum/history"')
    expect(markup).toContain('Step 0 /')
    expect(markup).not.toContain('calendar-title')
  })

  it('shows a curriculum creation action instead of mock learning data in server mode', () => {
    vi.stubEnv('VITE_ICU_API_MODE', 'server')
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TodayLearningHub />
      </MemoryRouter>,
    )

    expect(markup).toContain('커리큘럼을 먼저 생성해 주세요')
    expect(markup).toContain('href="/today/goal"')
  })
})
