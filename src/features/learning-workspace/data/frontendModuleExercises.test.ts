import { describe, expect, it } from 'vitest'
import { frontendModuleExercises } from './frontendModuleExercises'
// @ts-expect-error backend .mjs has no type declarations; this cross-layer test import is intentional
import { runJavaScriptCode } from '../../../../backend/modules/code-runner/codeRunner.mjs'

function expectValidExercise(moduleId: string) {
  const exercise = frontendModuleExercises[moduleId]

  expect(exercise, `${moduleId} exercise should exist`).toBeDefined()
  expect(exercise.fileName.length).toBeGreaterThan(0)
  expect(exercise.codeLines.length).toBeGreaterThan(0)
  expect(exercise.practiceDetail.length).toBeGreaterThan(0)
  expect(exercise.hint.length).toBeGreaterThan(0)
}

describe('frontendModuleExercises', () => {
  it('provides content for level 1 modules (fe-01-01 ~ fe-01-03)', () => {
    expectValidExercise('fe-01-01')
    expectValidExercise('fe-01-02')
    expectValidExercise('fe-01-03')
  })

  it('provides content for level 2 modules (fe-02-01 ~ fe-02-03)', () => {
    expectValidExercise('fe-02-01')
    expectValidExercise('fe-02-02')
    expectValidExercise('fe-02-03')
  })

  it('provides content for level 3 modules (fe-03-01 ~ fe-03-03)', () => {
    expectValidExercise('fe-03-01')
    expectValidExercise('fe-03-02')
    expectValidExercise('fe-03-03')
  })

  it('provides content for level 4 modules (fe-04-01 ~ fe-04-03)', () => {
    expectValidExercise('fe-04-01')
    expectValidExercise('fe-04-02')
    expectValidExercise('fe-04-03')
  })

  it('provides exactly the 12 frontend track modules', () => {
    expect(Object.keys(frontendModuleExercises).sort()).toEqual([
      'fe-01-01',
      'fe-01-02',
      'fe-01-03',
      'fe-02-01',
      'fe-02-02',
      'fe-02-03',
      'fe-03-01',
      'fe-03-02',
      'fe-03-03',
      'fe-04-01',
      'fe-04-02',
      'fe-04-03',
    ])
  })

  it('transforms every exercise as a valid React preview bundle', async () => {
    for (const [moduleId, exercise] of Object.entries(frontendModuleExercises)) {
      const language = exercise.fileName.endsWith('.tsx') ? 'tsx' : 'jsx'
      const result = await runJavaScriptCode(exercise.codeLines.join('\n'), {
        previewOnly: true,
        css: exercise.cssCode ?? '',
        language,
      })

      expect(result.success, `${moduleId} (${exercise.fileName}): ${result.error}`).toBe(true)
    }
  })
})
