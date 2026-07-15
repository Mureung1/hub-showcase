import type { GraphSnapshot } from '../engine/gitGraphAdapter'

export type PlayableGitLabLevel = {
  id: string
  title: string
  chapterTitle: string
  proGitSection: string
  conceptSummary: string
  acceptedCommands: string[]
  visualMode: string
  nextLessonId: string
  goalTitle: string
  description: string
  hint: string
  initial: GraphSnapshot
  goal: GraphSnapshot
}

export type CurriculumNavigationStatus = 'playable' | 'locked'

export type CurriculumNavigationItem = {
  id: string
  title: string
  moduleTitle: string
  bookRef: string
  status: CurriculumNavigationStatus
  reason: string
  playableLevel?: PlayableGitLabLevel
}

export type CurriculumNavigationModule = {
  moduleId: string
  moduleTitle: string
  bookRef: string
  items: CurriculumNavigationItem[]
}

type LevelsFile = {
  levels: PlayableGitLabLevel[]
  curriculumModules?: CurriculumModule[]
}

type CurriculumModule = {
  moduleId: string
  moduleTitle: string
  bookRef: string
  levels: CurriculumLevel[]
}

type CurriculumLevel = {
  id: string
  title: string
  bookRef: string
  description: string
  narrative?: string
  hints?: string[]
  allowedCommands?: string[]
  simulationType?: string
  initialState?: CurriculumState
  goal?: CurriculumGoal
}

type CurriculumState = {
  commits?: CurriculumCommit[]
  branches?: CurriculumBranch[]
  HEAD?: { type?: string; name?: string; commitId?: string | null } | null
}

type CurriculumGoal = {
  type?: string
  targetGraph?: {
    commits?: CurriculumCommit[]
    branches?: CurriculumBranch[]
  }
  targetDescription?: string
  note?: string
  mergeType?: string
}

type CurriculumCommit = {
  id: string
  parents?: string[]
  branch?: string
}

type CurriculumBranch = {
  name: string
  commitId?: string | null
  head?: string | null
}

export function createPlayableLevels(data: LevelsFile): PlayableGitLabLevel[] {
  const baseLevels = data.levels
  const curriculumLevels = createCurriculumNavigation(data).flatMap((module) =>
    module.items.flatMap((item) => (item.playableLevel ? [item.playableLevel] : [])),
  )
  const levelOrder = [...baseLevels, ...curriculumLevels]

  return levelOrder.map((level, index) => ({
    ...level,
    nextLessonId: levelOrder[(index + 1) % levelOrder.length]?.id ?? level.nextLessonId,
  }))
}

export function createCurriculumNavigation(data: LevelsFile): CurriculumNavigationModule[] {
  return (data.curriculumModules ?? []).map((module) => ({
    moduleId: module.moduleId,
    moduleTitle: module.moduleTitle,
    bookRef: module.bookRef,
    items: module.levels.map((level) => createNavigationItem(module, level)),
  }))
}

function createNavigationItem(
  module: CurriculumModule,
  level: CurriculumLevel,
): CurriculumNavigationItem {
  const playableLevel = createPlayableLevelFromCurriculum(module, level)

  if (!playableLevel) {
    return {
      id: level.id,
      title: level.title,
      moduleTitle: module.moduleTitle,
      bookRef: level.bookRef,
      status: 'locked',
      reason: getLockedReason(level),
    }
  }

  return {
    id: playableLevel.id,
    title: playableLevel.title,
    moduleTitle: module.moduleTitle,
    bookRef: level.bookRef,
    status: 'playable',
    reason: '현재 커밋 그래프 엔진으로 로드할 수 있습니다.',
    playableLevel,
  }
}

function createPlayableLevelFromCurriculum(
  module: CurriculumModule,
  level: CurriculumLevel,
): PlayableGitLabLevel | null {
  if (level.goal?.type !== 'graph' || !level.initialState || !level.goal.targetGraph) {
    return null
  }

  const initial = createSnapshotFromState(level.initialState)
  const goal = createSnapshotFromGoal(level.goal.targetGraph, level.initialState)
  const conceptSummary = level.narrative ?? level.description
  const goalNote = level.goal.note ? ` ${level.goal.note}` : ''

  return {
    id: level.id,
    title: level.title,
    chapterTitle: module.moduleTitle,
    proGitSection: level.bookRef,
    conceptSummary,
    acceptedCommands: level.allowedCommands ?? [],
    visualMode: level.goal.mergeType ? `${level.goal.mergeType}-graph` : 'curriculum-graph',
    nextLessonId: level.id,
    goalTitle: level.description,
    description: `${level.description}${goalNote}`,
    hint: level.hints?.[0] ?? '이 레슨은 현재 그래프 목표를 먼저 관찰해보세요.',
    initial,
    goal,
  }
}

function createSnapshotFromState(state: CurriculumState): GraphSnapshot {
  const branches = (state.branches ?? []).map((branch) => ({
    name: branch.name,
    head: branch.commitId ?? branch.head ?? '',
  }))
  const currentBranch = getCurrentBranchName(state) ?? branches[0]?.name ?? null

  return {
    commits: createCommits(state.commits ?? [], state.branches ?? []),
    branches,
    currentBranch,
  }
}

function createSnapshotFromGoal(
  targetGraph: NonNullable<CurriculumGoal['targetGraph']>,
  initialState: CurriculumState,
): GraphSnapshot {
  const initialBranches = initialState.branches ?? []
  const targetBranches = targetGraph.branches ?? []

  return {
    commits: createCommits(targetGraph.commits ?? [], targetBranches),
    branches: targetBranches.map((branch) => ({
      name: branch.name,
      head: branch.commitId ?? branch.head ?? '',
    })),
    currentBranch: deriveGoalCurrentBranch(initialState, initialBranches, targetBranches),
  }
}

function createCommits(commits: CurriculumCommit[], branches: CurriculumBranch[]) {
  return commits.map((commit, index) => ({
    id: commit.id,
    parents: commit.parents ?? [],
    branch: commit.branch ?? getCommitBranch(commit.id, branches),
    order: index,
  }))
}

function deriveGoalCurrentBranch(
  initialState: CurriculumState,
  initialBranches: CurriculumBranch[],
  targetBranches: CurriculumBranch[],
) {
  const initialCurrentBranch = getCurrentBranchName(initialState)
  const changedBranches = targetBranches.filter((targetBranch) => {
    const initialBranch = initialBranches.find((branch) => branch.name === targetBranch.name)
    return getBranchHead(initialBranch) !== getBranchHead(targetBranch)
  })

  if (changedBranches.length === 1) {
    return changedBranches[0].name
  }

  if (initialCurrentBranch && targetBranches.some((branch) => branch.name === initialCurrentBranch)) {
    return initialCurrentBranch
  }

  return targetBranches[0]?.name ?? null
}

function getCurrentBranchName(state: CurriculumState) {
  return state.HEAD?.type === 'branch' ? (state.HEAD.name ?? null) : null
}

function getCommitBranch(commitId: string, branches: CurriculumBranch[]) {
  return branches.find((branch) => getBranchHead(branch) === commitId)?.name
}

function getBranchHead(branch?: CurriculumBranch) {
  return branch?.commitId ?? branch?.head ?? null
}

function getLockedReason(level: CurriculumLevel) {
  const goalType = level.goal?.type ?? 'unknown'

  if (goalType === 'graph') {
    return '그래프 목표 데이터가 부족해 현재 엔진으로 로드할 수 없습니다.'
  }

  return `${goalType} 목표는 아직 전용 엔진과 시각화가 필요합니다.`
}