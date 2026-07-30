import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { TodayLearningGoalPage } from './TodayLearningGoalPage'

const todayLearningCss = readFileSync(
  new URL('./TodayLearningHub.module.css', import.meta.url),
  'utf8',
)
const curriculumLoadingCss = readFileSync(
  new URL('./CurriculumLoading.module.css', import.meta.url),
  'utf8',
)

describe('TodayLearningGoalPage layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps the goal help text grouped separately from the input action row', () => {
    vi.stubEnv('VITE_ICU_API_MODE', 'mock')

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TodayLearningGoalPage />
      </MemoryRouter>,
    )

    expect(markup).toContain('for="curriculum-goal"')
    expect(markup).toContain('data-goal-field="input"')
  })

  it('uses a compact title size for the curriculum goal question', () => {
    vi.stubEnv('VITE_ICU_API_MODE', 'mock')

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TodayLearningGoalPage />
      </MemoryRouter>,
    )

    expect(markup).toContain('data-title-density="compact"')
    expect(todayLearningCss).toMatch(
      /\.topbar h1\[data-title-density='compact'\]\s*\{[^}]*font-size: 22px;/s,
    )
  })

  it('keeps curriculum generation states inside one stable result slot', () => {
    vi.stubEnv('VITE_ICU_API_MODE', 'mock')

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TodayLearningGoalPage />
      </MemoryRouter>,
    )

    expect(markup).toContain('data-generation-state-slot="idle"')
    expect(todayLearningCss).toMatch(
      /\.generationStateSlot\s*\{[^}]*position: relative;[^}]*min-height: 154px;/s,
    )
    expect(curriculumLoadingCss).toMatch(
      /\.loadingContainer\s*\{[^}]*min-height: 100%;[^}]*margin: 0;/s,
    )
  })
})
