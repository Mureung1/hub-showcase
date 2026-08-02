import { createEmptyConfig, type GitEngineState, type GitFileStatus } from '../engine/gitEngine'
import type { GraphSnapshot } from '../engine/gitGraphAdapter'

export type GitLabGoalKind =
  | 'graph'
  | 'configState'
  | 'repoState'
  | 'fileStatus'
  | 'resetState'
  | 'remoteState'
  | 'tagState'
  | 'conflictResolved'
  | 'commandOutput'
  | 'stashState'
  | 'bisectResult'

export type GitLabGoalCheck =
  | { type: 'configState'; description: string }
  | { type: 'repoState'; description: string }
  | { type: 'fileStatus'; fileName: string; status: GitFileStatus; description: string }
  | {
      type: 'resetState'
      headCommitId: string | null
      indexCommitId: string | null
      workingTreeCommitId: string | null
      description: string
    }
  | { type: 'remoteState'; requiredRemoteName?: string; requiredRemoteBranch?: string; description: string }
  | { type: 'tagState'; tagName: string; commitId: string; description: string }
  | { type: 'conflictResolved'; filePath: string; description: string }
  | {
      type: 'commandOutput'
      expectedResolvedRef?: string
      expectedLogResult?: string[]
      description: string
    }
  | {
      type: 'stashState'
      expectedStashLength?: number
      fileName?: string
      fileStatus?: GitFileStatus
      description: string
    }
  | { type: 'bisectResult'; commitId: string; description: string }

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
  goalKind: GitLabGoalKind
  goalCheck?: GitLabGoalCheck
  initialEngineState?: GitEngineState
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

type RawPlayableGitLabLevel = Omit<PlayableGitLabLevel, 'goalKind'> & {
  goalKind?: GitLabGoalKind
}

type LevelsFile = {
  levels: RawPlayableGitLabLevel[]
  curriculumModules?: unknown
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
  repoExists?: boolean
  config?: Partial<Record<keyof ReturnType<typeof createEmptyConfig>, string | null>>
  files?: Record<
    string,
    { content?: string; workingContent?: string; status?: GitFileStatus; versions?: Record<string, string> }
  >
  index?: string
  workingDir?: string
  commits?: CurriculumCommit[]
  branches?: CurriculumBranch[]
  remotes?: { name: string; url: string }[]
  tags?: { name: string; commitId: string; message?: string }[]
  stash?: { id: string; files: Record<string, string> }[]
  HEAD?: { type?: string; name?: string; commitId?: string | null } | null
}

type CurriculumGoal = {
  type?: string
  condition?: string
  targetDescription?: string
  targetGraph?: {
    commits?: CurriculumCommit[]
    branches?: CurriculumBranch[]
  }
  note?: string
  mergeType?: string
}

type CurriculumCommit = {
  id: string
  parents?: string[]
  branch?: string
  message?: string
  bugState?: 'good' | 'bad'
}

type CurriculumBranch = {
  name: string
  commitId?: string | null
  head?: string | null
}

export function createPlayableLevels(data: LevelsFile): PlayableGitLabLevel[] {
  const baseLevels: PlayableGitLabLevel[] = data.levels.map((level) => ({
    ...level,
    goalKind: level.goalKind ?? 'graph',
  }))
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
  const modules = Array.isArray(data.curriculumModules)
    ? (data.curriculumModules as CurriculumModule[])
    : []

  return modules.map((module) => ({
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
    reason: getPlayableReason(playableLevel.goalKind),
    playableLevel,
  }
}

function createPlayableLevelFromCurriculum(
  module: CurriculumModule,
  level: CurriculumLevel,
): PlayableGitLabLevel | null {
  if (!level.initialState || !isSupportedGoalType(level.goal?.type)) {
    return null
  }

  const initialEngineState = createEngineStateFromCurriculumState(level.initialState)
  const initial = createSnapshotFromState(level.initialState)
  const conceptSummary = level.narrative ?? level.description
  const goalNote = level.goal?.note ? ` ${level.goal.note}` : ''
  const goalKind = level.goal.type
  const graphGoal = level.goal.targetGraph

  return {
    id: level.id,
    title: level.title,
    chapterTitle: module.moduleTitle,
    proGitSection: level.bookRef,
    conceptSummary,
    acceptedCommands: level.allowedCommands ?? [],
    visualMode: graphGoal
      ? level.goal.mergeType
        ? `${level.goal.mergeType}-graph`
        : 'curriculum-graph'
      : getVisualMode(goalKind),
    nextLessonId: level.id,
    goalTitle: level.description,
    description: `${level.description}${goalNote}`,
    hint: level.hints?.[0] ?? '이 레슨은 현재 목표 상태를 먼저 관찰해보세요.',
    goalKind,
    goalCheck: createGoalCheck(level),
    initialEngineState,
    initial,
    goal: graphGoal ? createSnapshotFromGoal(graphGoal, level.initialState) : initial,
  }
}

function createEngineStateFromCurriculumState(state: CurriculumState): GitEngineState {
  const config = createEmptyConfig()
  const currentBranch = getCurrentBranchName(state)
  const branches = (state.branches ?? []).map((branch) => ({
    name: branch.name,
    commitId: getBranchHead(branch),
  }))

  const headCommitId =
    getBranchHead(branches.find((branch) => branch.name === currentBranch)) ??
    state.HEAD?.commitId ??
    null

  return {
    repoExists: state.repoExists ?? true,
    config: {
      ...config,
      ...state.config,
    },
    files: Object.fromEntries(
      Object.entries(state.files ?? {}).map(([fileName, file]) => [
        fileName,
        {
          content: file.workingContent ?? file.content ?? '',
          status: file.status ?? 'committed',
          ...(file.versions ? { versions: file.versions } : {}),
        },
      ]),
    ),
    commits: (state.commits ?? []).map((commit) => ({
      id: commit.id,
      parents: commit.parents ?? [],
      ...(commit.message ? { message: commit.message } : {}),
      ...(commit.bugState ? { bugState: commit.bugState } : {}),
    })),
    branches,
    head: currentBranch
      ? { type: 'branch', branchName: currentBranch }
      : { type: 'detached', commitId: state.HEAD?.commitId ?? null },
    indexCommitId: parseTreeCommitId(state.index, headCommitId),
    workingTreeCommitId: parseTreeCommitId(state.workingDir, headCommitId),
    nextCommitIndex: getNextCommitIndex(state.commits ?? []),
    remotes: state.remotes ?? [],
    remoteBranches: {},
    tags: state.tags ?? [],
    stash: state.stash ?? [],
    bisect: null,
    conflict: null,
    pendingMerge: null,
    lastResolvedRef: null,
    lastLogRangeResult: null,
  }
}

function createGoalCheck(level: CurriculumLevel): GitLabGoalCheck | undefined {
  const description = level.goal?.targetDescription ?? level.description

  if (level.goal?.type === 'configState') {
    return { type: 'configState', description }
  }

  if (level.goal?.type === 'repoState') {
    return { type: 'repoState', description }
  }

  if (level.goal?.type === 'fileStatus') {
    const match = /files\['([^']+)'\]\.status === '([^']+)'/.exec(level.goal.condition ?? '')
    const fileName = match?.[1] ?? Object.keys(level.initialState?.files ?? {})[0]
    const status = isGitFileStatus(match?.[2]) ? match[2] : 'staged'

    if (!fileName) {
      return undefined
    }

    return { type: 'fileStatus', fileName, status, description }
  }

  if (level.goal?.type === 'resetState') {
    const condition = level.goal.condition ?? ''

    return {
      type: 'resetState',
      headCommitId: parseConditionCommitId(condition, 'HEAD_commit'),
      indexCommitId: parseConditionTreeCommitId(condition, 'index'),
      workingTreeCommitId: parseConditionTreeCommitId(condition, 'workingDir'),
      description,
    }
  }

  if (level.goal?.type === 'remoteState') {
    const condition = level.goal.condition ?? ''
    const remoteNameMatch = /remotes\.includes\('([^']+)'\)/.exec(condition)
    const remoteBranchIncludesMatch = /remoteBranches\.includes\('([^']+)'\)/.exec(condition)
    const remoteBranchKeyMatch = /remoteBranches\.(\w+)\s*===/.exec(condition)

    return {
      type: 'remoteState',
      requiredRemoteName: remoteNameMatch?.[1],
      requiredRemoteBranch:
        remoteBranchIncludesMatch?.[1] ??
        (remoteBranchKeyMatch
          ? `${remoteNameMatch?.[1] ?? 'origin'}/${remoteBranchKeyMatch[1]}`
          : undefined),
      description,
    }
  }

  if (level.goal?.type === 'tagState') {
    const condition = level.goal.condition ?? ''
    const nameMatch = /t\.name === '([^']+)'/.exec(condition)
    const commitMatch = /t\.commitId === '([^']+)'/.exec(condition)

    return {
      type: 'tagState',
      tagName: nameMatch?.[1] ?? '',
      commitId: commitMatch?.[1] ?? '',
      description,
    }
  }

  if (level.goal?.type === 'commandOutput') {
    const condition = level.goal.condition ?? ''
    const resolvedRefMatch = /lastResolvedRef === '([^']+)'/.exec(condition)
    const logResultMatch = /\[([^\]]+)\]\.sort\(\)\.join\(\)/.exec(condition)
    const expectedLogResult = logResultMatch
      ? logResultMatch[1].split(',').map((token) => token.trim().replace(/^'|'$/g, ''))
      : undefined

    return {
      type: 'commandOutput',
      expectedResolvedRef: resolvedRefMatch?.[1],
      expectedLogResult,
      description,
    }
  }

  if (level.goal?.type === 'stashState') {
    const condition = level.goal.condition ?? ''
    const stashLengthMatch = /stash\.length === (\d+)/.exec(condition)
    const fileMatch = /files\['([^']+)'\]\.status === '([^']+)'/.exec(condition)

    return {
      type: 'stashState',
      expectedStashLength: stashLengthMatch ? Number(stashLengthMatch[1]) : undefined,
      fileName: fileMatch?.[1],
      fileStatus: isGitFileStatus(fileMatch?.[2]) ? fileMatch[2] : undefined,
      description,
    }
  }

  if (level.goal?.type === 'bisectResult') {
    const match = /identifiedFirstBadCommit === '([^']+)'/.exec(level.goal.condition ?? '')

    return { type: 'bisectResult', commitId: match?.[1] ?? '', description }
  }

  if (level.goal?.type === 'conflictResolved') {
    const match = /files\['([^']+)'\]/.exec(level.goal.condition ?? '')
    const filePath = match?.[1] ?? Object.keys(level.initialState?.files ?? {})[0]

    if (!filePath) {
      return undefined
    }

    return { type: 'conflictResolved', filePath, description }
  }

  return undefined
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

  if (
    initialCurrentBranch &&
    targetBranches.some((branch) => branch.name === initialCurrentBranch)
  ) {
    return initialCurrentBranch
  }

  return targetBranches[0]?.name ?? null
}

function parseTreeCommitId(value: string | undefined, fallbackCommitId: string | null) {
  const match = /^matches\s+(.+)$/.exec(value ?? '')

  return match ? match[1] : fallbackCommitId
}

function parseConditionCommitId(condition: string, key: string) {
  const match = new RegExp(`${key} === '([^']+)'`).exec(condition)

  return match?.[1] ?? null
}

function parseConditionTreeCommitId(condition: string, key: string) {
  const match = new RegExp(`${key} === 'matches ([^']+)'`).exec(condition)

  return match?.[1] ?? null
}
function getNextCommitIndex(commits: CurriculumCommit[]) {
  const maxCommitIndex = commits.reduce((maxIndex, commit) => {
    const match = /^C(\d+)$/.exec(commit.id)

    return match ? Math.max(maxIndex, Number(match[1])) : maxIndex
  }, -1)

  return maxCommitIndex + 1
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

function getPlayableReason(goalKind: GitLabGoalKind) {
  return goalKind === 'graph'
    ? '현재 커밋 그래프 엔진으로 로드할 수 있습니다.'
    : '현재 기초 Git 엔진으로 실행할 수 있습니다.'
}

function getVisualMode(goalKind: GitLabGoalKind) {
  switch (goalKind) {
    case 'configState':
      return 'config-state'
    case 'repoState':
      return 'repository-state'
    case 'fileStatus':
      return 'file-status'
    case 'resetState':
      return 'reset-state'
    case 'remoteState':
      return 'remote-state'
    case 'tagState':
      return 'tag-state'
    case 'conflictResolved':
      return 'conflict-resolved'
    case 'commandOutput':
      return 'command-output'
    case 'stashState':
      return 'stash-state'
    case 'bisectResult':
      return 'bisect-result'
    case 'graph':
      return 'curriculum-graph'
  }
}

function isSupportedGoalType(goalType: string | undefined): goalType is GitLabGoalKind {
  return (
    goalType === 'graph' ||
    goalType === 'configState' ||
    goalType === 'repoState' ||
    goalType === 'fileStatus' ||
    goalType === 'resetState' ||
    goalType === 'remoteState' ||
    goalType === 'tagState' ||
    goalType === 'conflictResolved' ||
    goalType === 'commandOutput' ||
    goalType === 'stashState' ||
    goalType === 'bisectResult'
  )
}

function isGitFileStatus(value: string | undefined): value is GitFileStatus {
  return (
    value === 'untracked' || value === 'modified' || value === 'staged' || value === 'committed'
  )
}
