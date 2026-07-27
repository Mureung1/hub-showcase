import { describe, expect, it } from 'vitest'
import { normalizeLearnerProfile } from './learnerProfile.mjs'

const validProfile = {
  displayName: '  예린  ',
  learningGoal: '  React 앱 완성하기  ',
  preferredTracks: ['frontend', 'git'],
  dailyStudyMinutes: 60,
  level: 'beginner',
}

describe('normalizeLearnerProfile', () => {
  it('trims text and returns a complete learner profile', () => {
    expect(normalizeLearnerProfile(validProfile)).toEqual({
      displayName: '예린',
      learningGoal: 'React 앱 완성하기',
      preferredTracks: ['frontend', 'git'],
      dailyStudyMinutes: 60,
      level: 'beginner',
    })
  })

  it.each([
    [{ ...validProfile, displayName: '  ' }, 'Display name is required'],
    [{ ...validProfile, learningGoal: '' }, 'Learning goal is required'],
    [{ ...validProfile, preferredTracks: [] }, 'Preferred track is required'],
    [{ ...validProfile, dailyStudyMinutes: 0 }, 'Daily study minutes must be at least 1'],
    [{ ...validProfile, level: 'expert' }, 'Unsupported learner level'],
  ])('rejects invalid profile input %#', (input, message) => {
    expect(() => normalizeLearnerProfile(input)).toThrow(message)
  })
})
