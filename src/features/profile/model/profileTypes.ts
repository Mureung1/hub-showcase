export type LearningLevel = 'beginner' | 'basic' | 'interview'

export type LearningProfile = {
  displayName: string
  learningGoal: string
  preferredTracks: string[]
  dailyStudyMinutes: number
  level: LearningLevel
}
