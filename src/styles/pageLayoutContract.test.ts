import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const readCss = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

const globalCss = readCss('./global.css')
const curriculumHistoryCss = readCss(
  '../features/curriculum/CurriculumHistoryPage.module.css',
)
const gitLabCss = readCss('../features/git-lab/GitLabPage.module.css')
const workspaceCss = readCss(
  '../features/learning-workspace/LearningWorkspace.module.css',
)
const addMistakeNoteCss = readCss(
  '../features/mistake-notes/AddMistakeNotePage.module.css',
)
const mistakeNotesCss = readCss(
  '../features/mistake-notes/MistakeNotesPage.module.css',
)
const todayLearningCss = readCss(
  '../features/today-learning/TodayLearningHub.module.css',
)

describe('공통 페이지 레이아웃', () => {
  it('커리큘럼 보관함 기준값을 일반 화면과 작업 화면의 외곽 정렬에 공유한다', () => {
    expect(globalCss).toContain('--icu-page-padding: 28px 30px 34px')
    expect(globalCss).toContain('--icu-page-padding-inline: 30px')
    expect(globalCss).toContain('--icu-page-section-gap: 22px')
    expect(globalCss).toContain('--icu-page-title-size: 28px')
    expect(globalCss).toContain('--icu-section-radius: 8px')

    for (const css of [
      curriculumHistoryCss,
      todayLearningCss,
      mistakeNotesCss,
      addMistakeNoteCss,
    ]) {
      expect(css).toContain('var(--icu-page-padding)')
      expect(css).toContain('var(--icu-page-section-gap)')
    }

    expect(workspaceCss).toContain('var(--icu-page-padding-inline)')
    expect(gitLabCss).toContain('var(--icu-page-padding-inline)')
  })
})
