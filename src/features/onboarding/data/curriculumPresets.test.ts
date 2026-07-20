import { describe, expect, it } from 'vitest'
import { curriculumPresets } from './curriculumPresets'

describe('curriculumPresets', () => {
  it('keeps every preset actionable for the intro demo', () => {
    for (const preset of Object.values(curriculumPresets)) {
      expect(preset.label).toBeTruthy()
      expect(preset.fileName).toBeTruthy()
      expect(preset.steps.length).toBeGreaterThanOrEqual(3)
    }
  })
})
