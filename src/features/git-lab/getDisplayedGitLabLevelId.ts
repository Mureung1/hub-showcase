const legacyLevelDisplayIds: Record<string, string> = {
  intro1: '1-3',
  branch1: '2-1',
  checkout1: '2-2',
  merge1: '2-5',
}

export function getDisplayedGitLabLevelId(levelId: string) {
  return legacyLevelDisplayIds[levelId] ?? levelId
}

export function getDisplayedGitLabLevelIds(levelIds: string[]) {
  return [...new Set(levelIds.map(getDisplayedGitLabLevelId))]
}
