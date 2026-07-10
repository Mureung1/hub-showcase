export type GitCommit = {
  id: string
  parents: string[]
}

export type GitBranch = {
  name: string
  commitId: string | null
}

export type GitHead =
  { type: 'branch'; branchName: string } | { type: 'detached'; commitId: string | null }

export type GitEngineState = {
  commits: GitCommit[]
  branches: GitBranch[]
  head: GitHead
  nextCommitIndex: number
}

export type GitCommand =
  | { type: 'commit' }
  | { type: 'branch'; name: string }
  | { type: 'checkout'; name: string }
  | { type: 'checkoutNewBranch'; name: string }
  | { type: 'merge'; name: string }
  | { type: 'log' }

export type GitCommandResult = {
  state: GitEngineState
  ok: boolean
  logs: string[]
}

export function createInitialGitState(
  branchName = 'main',
  commits: GitCommit[] = [],
): GitEngineState {
  const latestCommit = commits.at(-1)?.id ?? null

  return {
    commits,
    branches: [{ name: branchName, commitId: latestCommit }],
    head: { type: 'branch', branchName },
    nextCommitIndex: commits.length,
  }
}

export function parseGitCommand(input: string): GitCommand {
  const tokens = input
    .trim()
    .replace(/^\$\s*/, '')
    .split(/\s+/)
    .filter(Boolean)

  if (tokens[0] !== 'git') {
    throw new Error('Command must start with git.')
  }

  if (tokens[1] === 'commit' && tokens.length === 2) {
    return { type: 'commit' }
  }

  if (tokens[1] === 'branch' && tokens.length === 3) {
    return { type: 'branch', name: tokens[2] }
  }

  if (tokens[1] === 'checkout' && tokens[2] === '-b' && tokens.length === 4) {
    return { type: 'checkoutNewBranch', name: tokens[3] }
  }

  if (tokens[1] === 'checkout' && tokens.length === 3) {
    return { type: 'checkout', name: tokens[2] }
  }

  if (tokens[1] === 'merge' && tokens.length === 3) {
    return { type: 'merge', name: tokens[2] }
  }

  if (tokens[1] === 'log' && tokens.length === 2) {
    return { type: 'log' }
  }

  throw new Error(`Unsupported git command: ${input}`)
}

export function runGitCommand(state: GitEngineState, input: string): GitCommandResult {
  try {
    const command = parseGitCommand(input)
    return executeGitCommand(state, command)
  } catch (error) {
    return {
      state,
      ok: false,
      logs: [error instanceof Error ? error.message : 'Failed to run command.'],
    }
  }
}

export function executeGitCommand(state: GitEngineState, command: GitCommand): GitCommandResult {
  switch (command.type) {
    case 'commit':
      return commit(state)
    case 'branch':
      return branch(state, command.name)
    case 'checkout':
      return checkout(state, command.name)
    case 'checkoutNewBranch':
      return checkoutNewBranch(state, command.name)
    case 'merge':
      return merge(state, command.name)
    case 'log':
      return log(state)
  }
}

export function formatGitStateForConsole(state: GitEngineState) {
  const branchSummary = state.branches
    .map((branchItem) => `${branchItem.name}:${branchItem.commitId ?? 'empty'}`)
    .join(', ')
  const headSummary =
    state.head.type === 'branch'
      ? `HEAD -> ${state.head.branchName}`
      : `HEAD detached at ${state.head.commitId ?? 'empty'}`

  return [
    headSummary,
    `branches: ${branchSummary}`,
    `commits: ${state.commits.map((commitItem) => formatCommit(commitItem)).join(' | ')}`,
  ]
}

function commit(state: GitEngineState): GitCommandResult {
  const parentCommitId = getHeadCommitId(state)
  const nextCommitId = `C${state.nextCommitIndex}`
  const headBranchName = state.head.type === 'branch' ? state.head.branchName : null
  const nextCommit: GitCommit = {
    id: nextCommitId,
    parents: parentCommitId ? [parentCommitId] : [],
  }
  const nextState: GitEngineState = {
    ...state,
    commits: [...state.commits, nextCommit],
    branches: headBranchName
      ? state.branches.map((branchItem) =>
          branchItem.name === headBranchName
            ? { ...branchItem, commitId: nextCommitId }
            : branchItem,
        )
      : state.branches,
    head: headBranchName ? state.head : { type: 'detached', commitId: nextCommitId },
    nextCommitIndex: state.nextCommitIndex + 1,
  }

  return {
    state: nextState,
    ok: true,
    logs: [`created commit ${formatCommit(nextCommit)}`, ...formatGitStateForConsole(nextState)],
  }
}

function branch(state: GitEngineState, name: string): GitCommandResult {
  if (state.branches.some((branchItem) => branchItem.name === name)) {
    return failure(state, `branch '${name}' already exists`)
  }

  const nextState = {
    ...state,
    branches: [...state.branches, { name, commitId: getHeadCommitId(state) }],
  }

  return {
    state: nextState,
    ok: true,
    logs: [`created branch ${name}`, ...formatGitStateForConsole(nextState)],
  }
}

function checkout(state: GitEngineState, name: string): GitCommandResult {
  const targetBranch = state.branches.find((branchItem) => branchItem.name === name)

  if (!targetBranch) {
    return failure(state, `branch '${name}' does not exist`)
  }

  const nextState = {
    ...state,
    head: { type: 'branch', branchName: name } satisfies GitHead,
  }

  return {
    state: nextState,
    ok: true,
    logs: [`switched to branch ${name}`, ...formatGitStateForConsole(nextState)],
  }
}

function checkoutNewBranch(state: GitEngineState, name: string): GitCommandResult {
  if (state.branches.some((branchItem) => branchItem.name === name)) {
    return failure(state, `branch '${name}' already exists`)
  }

  const nextState = {
    ...state,
    branches: [...state.branches, { name, commitId: getHeadCommitId(state) }],
    head: { type: 'branch', branchName: name } satisfies GitHead,
  }

  return {
    state: nextState,
    ok: true,
    logs: [`created and switched to branch ${name}`, ...formatGitStateForConsole(nextState)],
  }
}

function merge(state: GitEngineState, name: string): GitCommandResult {
  if (state.head.type !== 'branch') {
    return failure(state, 'merge requires HEAD to point to a branch')
  }

  const headBranchName = state.head.branchName
  const currentBranch = state.branches.find((branchItem) => branchItem.name === headBranchName)
  const sourceBranch = state.branches.find((branchItem) => branchItem.name === name)

  if (!sourceBranch) {
    return failure(state, `branch '${name}' does not exist`)
  }

  if (!currentBranch?.commitId || !sourceBranch.commitId) {
    return failure(state, 'merge requires both branches to point to a commit')
  }

  if (currentBranch.name === sourceBranch.name) {
    return failure(state, 'cannot merge a branch into itself')
  }

  const nextCommitId = `C${state.nextCommitIndex}`
  const nextCommit = {
    id: nextCommitId,
    parents: uniqueCommitIds([currentBranch.commitId, sourceBranch.commitId]),
  }
  const nextState = {
    ...state,
    commits: [...state.commits, nextCommit],
    branches: state.branches.map((branchItem) =>
      branchItem.name === currentBranch.name
        ? { ...branchItem, commitId: nextCommitId }
        : branchItem,
    ),
    nextCommitIndex: state.nextCommitIndex + 1,
  }

  return {
    state: nextState,
    ok: true,
    logs: [`merged ${name} into ${currentBranch.name}`, ...formatGitStateForConsole(nextState)],
  }
}

function log(state: GitEngineState): GitCommandResult {
  return {
    state,
    ok: true,
    logs:
      state.commits.length === 0
        ? ['no commits yet', ...formatGitStateForConsole(state)]
        : state.commits.map((commitItem) => formatCommit(commitItem)),
  }
}

function getHeadCommitId(state: GitEngineState) {
  if (state.head.type === 'detached') {
    return state.head.commitId
  }

  const headBranchName = state.head.branchName

  return state.branches.find((branchItem) => branchItem.name === headBranchName)?.commitId ?? null
}

function failure(state: GitEngineState, message: string): GitCommandResult {
  return {
    state,
    ok: false,
    logs: [message, ...formatGitStateForConsole(state)],
  }
}

function formatCommit(commitItem: GitCommit) {
  const parents = commitItem.parents.length > 0 ? commitItem.parents.join(',') : 'root'

  return `${commitItem.id} <- ${parents}`
}

function uniqueCommitIds(commitIds: string[]) {
  return [...new Set(commitIds)]
}
