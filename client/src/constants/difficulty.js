export const DIFFICULTY_META = {
  easy: { label: "Easy", tone: "easy" },
  medium: { label: "Medium", tone: "medium" },
  hard: { label: "Hard", tone: "hard" },
}

export function toDifficultyTier(readabilityScore) {
  if (readabilityScore >= 5) return "easy"
  if (readabilityScore === 4) return "medium"
  return "hard"
}
