export type GitCommit = {
  id: string
  parents: string[]
  message?: string
}

export type GitBranch = {
  name: string
  commitId: string | null
}

export type GitHead =
  { type: 'branch'; branchName: string } | { type: 'detached'; commitId: string | null }

export type GitFileStatus = 'untracked' | 'modified' | 'staged' | 'committed'

export type GitFile = {
  content: string
  status: GitFileStatus
}

export type GitResetMode = 'soft' | 'mixed' | 'hard'

export type GitConfig = {
  'user.name': string | null
  'user.email': string | null
}

export type GitEngineState = {
  repoExists: boolean
  config: GitConfig
  files: Record<string, GitFile>
  commits: GitCommit[]
  branches: GitBranch[]
  head: GitHead
  indexCommitId: string | null
  workingTreeCommitId: string | null
  nextCommitIndex: number
}

export type GitCommand =
  | { type: 'configSet'; key: keyof GitConfig; value: string }
  | { type: 'configList' }
  | { type: 'init' }
  | { type: 'status' }
  | { type: 'diff'; staged: boolean }
  | { type: 'add'; path: string }
  | { type: 'restore'; path: string; staged: boolean }
  | { type: 'reset'; mode: GitResetMode; target: string }
  | { type: 'resetPath'; path: string }
  | { type: 'commit'; message?: string }
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
    repoExists: true,
    config: createEmptyConfig(),
    files: {},
    commits,
    branches: [{ name: branchName, commitId: latestCommit }],
    head: { type: 'branch', branchName },
    indexCommitId: latestCommit,
    workingTreeCommitId: latestCommit,
    nextCommitIndex: commits.length,
  }
}

export function createEmptyConfig(): GitConfig {
  return {
    'user.name': null,
    'user.email': null,
  }
}

export function parseGitCommand(input: string): GitCommand {
  const tokens = tokenizeCommand(input.trim().replace(/^\$\s*/, ''))

  if (tokens[0] !== 'git') {
    throw new Error('Command must start with git.')
  }

  if (tokens[1] === 'config' && tokens[2] === '--global' && isGitConfigKey(tokens[3])) {
    const value = tokens.slice(4).join(' ').trim()

    if (!value) {
      throw new Error(`Missing value for ${tokens[3]}.`)
    }

    return { type: 'configSet', key: tokens[3], value }
  }

  if (tokens[1] === 'config' && tokens[2] === '--list' && tokens.length === 3) {
    return { type: 'configList' }
  }

  if (tokens[1] === 'init' && tokens.length === 2) {
    return { type: 'init' }
  }

  if (tokens[1] === 'status' && tokens.length === 2) {
    return { type: 'status' }
  }

  if (tokens[1] === 'diff' && tokens.length === 2) {
    return { type: 'diff', staged: false }
  }

  if (tokens[1] === 'diff' && tokens[2] === '--staged' && tokens.length === 3) {
    return { type: 'diff', staged: true }
  }

  if (tokens[1] === 'add' && tokens.length === 3) {
    return { type: 'add', path: tokens[2] }
  }

  if (tokens[1] === 'restore' && tokens.length === 3) {
    return { type: 'restore', path: tokens[2], staged: false }
  }

  if (tokens[1] === 'restore' && tokens[2] === '--staged' && tokens.length === 4) {
    return { type: 'restore', path: tokens[3], staged: true }
  }

  if (tokens[1] === 'reset' && tokens[2] === 'HEAD' && tokens.length === 4) {
    return { type: 'resetPath', path: tokens[3] }
  }

  if (tokens[1] === 'reset' && tokens.length >= 3 && tokens.length <= 4) {
    const mode = parseResetMode(tokens[2])
    const target = mode ? tokens[3] : tokens[2]

    if (!target) {
      throw new Error('Missing reset target.')
    }

    return { type: 'reset', mode: mode ?? 'mixed', target }
  }

  if (tokens[1] === 'commit' && tokens.length === 2) {
    return { type: 'commit' }
  }

  if (tokens[1] === 'commit' && tokens[2] === '-m' && tokens.length >= 4) {
    return { type: 'commit', message: tokens.slice(3).join(' ') }
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

  if (tokens[1] === 'switch' && tokens[2] === '-c' && tokens.length === 4) {
    return { type: 'checkoutNewBranch', name: tokens[3] }
  }

  if (tokens[1] === 'switch' && tokens.length === 3) {
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
    case 'configSet':
      return configSet(state, command.key, command.value)
    case 'configList':
      return configList(state)
    case 'init':
      return init(state)
    case 'status':
      return status(state)
    case 'diff':
      return diff(state, command.staged)
    case 'add':
      return add(state, command.path)
    case 'restore':
      return restore(state, command.path, command.staged)
    case 'reset':
      return reset(state, command.mode, command.target)
    case 'resetPath':
      return restore(state, command.path, true)
    case 'commit':
      return commit(state, command.message)
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
  const fileSummary = Object.entries(state.files)
    .map(([fileName, file]) => `${fileName}:${file.status}`)
    .join(', ')

  return [
    state.repoExists ? 'repository: initialized' : 'repository: not initialized',
    headSummary,
    `branches: ${branchSummary || 'none'}`,
    `index: ${state.indexCommitId ?? 'empty'}`,
    `working tree: ${state.workingTreeCommitId ?? 'empty'}`,
    `commits: ${state.commits.map((commitItem) => formatCommit(commitItem)).join(' | ')}`,
    `files: ${fileSummary || 'none'}`,
  ]
}

function configSet(state: GitEngineState, key: keyof GitConfig, value: string): GitCommandResult {
  const nextState = {
    ...state,
    config: {
      ...state.config,
      [key]: value,
    },
  }

  return {
    state: nextState,
    ok: true,
    logs: [`set ${key}=${value}`, ...formatGitStateForConsole(nextState)],
  }
}

function configList(state: GitEngineState): GitCommandResult {
  const logs = Object.entries(state.config)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)

  return {
    state,
    ok: true,
    logs: logs.length > 0 ? logs : ['no global config set'],
  }
}

function init(state: GitEngineState): GitCommandResult {
  const branchName = state.branches[0]?.name ?? 'master'
  const nextState: GitEngineState = {
    ...state,
    repoExists: true,
    branches: state.branches.length > 0 ? state.branches : [{ name: branchName, commitId: null }],
    head: state.head.type === 'branch' ? state.head : { type: 'branch', branchName },
    indexCommitId: state.indexCommitId ?? null,
    workingTreeCommitId: state.workingTreeCommitId ?? null,
  }

  return {
    state: nextState,
    ok: true,
    logs: ['initialized empty Git repository', ...formatGitStateForConsole(nextState)],
  }
}

function status(state: GitEngineState): GitCommandResult {
  if (!state.repoExists) {
    return failure(state, 'not a git repository')
  }

  const fileLogs = Object.entries(state.files).map(
    ([fileName, file]) => `${file.status}: ${fileName}`,
  )

  return {
    state,
    ok: true,
    logs: [formatHeadStatus(state), ...(fileLogs.length > 0 ? fileLogs : ['working tree clean'])],
  }
}

function diff(state: GitEngineState, staged: boolean): GitCommandResult {
  if (!state.repoExists) {
    return failure(state, 'not a git repository')
  }

  const targetStatuses: GitFileStatus[] = staged ? ['staged'] : ['modified', 'untracked']
  const fileLogs = Object.entries(state.files)
    .filter(([, file]) => targetStatuses.includes(file.status))
    .map(([fileName, file]) => `${file.status}: ${fileName}`)

  return {
    state,
    ok: true,
    logs:
      fileLogs.length > 0
        ? [staged ? 'staged changes:' : 'working tree changes:', ...fileLogs]
        : [staged ? 'no staged changes' : 'no working tree changes'],
  }
}

function restore(state: GitEngineState, path: string, staged: boolean): GitCommandResult {
  if (!state.repoExists) {
    return failure(state, 'not a git repository')
  }

  const targetFile = state.files[path]

  if (!targetFile) {
    return failure(state, `pathspec '${path}' did not match any files`)
  }

  if (staged) {
    if (targetFile.status !== 'staged') {
      return {
        state,
        ok: true,
        logs: [`no staged changes to restore for ${path}`, ...formatGitStateForConsole(state)],
      }
    }

    const nextState = {
      ...state,
      files: {
        ...state.files,
        [path]: { ...targetFile, status: 'modified' as const },
      },
    }

    return {
      state: nextState,
      ok: true,
      logs: [`unstaged ${path}`, ...formatGitStateForConsole(nextState)],
    }
  }

  if (targetFile.status === 'untracked') {
    const nextFiles = Object.fromEntries(
      Object.entries(state.files).filter(([fileName]) => fileName !== path),
    )
    const nextState = {
      ...state,
      files: nextFiles,
    }

    return {
      state: nextState,
      ok: true,
      logs: [`removed untracked ${path}`, ...formatGitStateForConsole(nextState)],
    }
  }

  if (targetFile.status === 'modified') {
    const nextState = {
      ...state,
      files: {
        ...state.files,
        [path]: { ...targetFile, status: 'committed' as const },
      },
    }

    return {
      state: nextState,
      ok: true,
      logs: [`restored ${path}`, ...formatGitStateForConsole(nextState)],
    }
  }

  return {
    state,
    ok: true,
    logs: [`no working tree changes to restore for ${path}`, ...formatGitStateForConsole(state)],
  }
}

function reset(state: GitEngineState, mode: GitResetMode, target: string): GitCommandResult {
  if (!state.repoExists) {
    return failure(state, 'not a git repository')
  }

  const targetCommitId = resolveResetTarget(state, target)

  if (targetCommitId === undefined) {
    return failure(state, `unknown revision '${target}'`)
  }

  const headBranchName = state.head.type === 'branch' ? state.head.branchName : null
  const currentHeadCommitId = getHeadCommitId(state)
  const nextFiles = updateFilesForReset(state.files, mode)
  const nextState: GitEngineState = {
    ...state,
    files: nextFiles,
    branches: headBranchName
      ? state.branches.map((branchItem) =>
          branchItem.name === headBranchName
            ? { ...branchItem, commitId: targetCommitId }
            : branchItem,
        )
      : state.branches,
    head: headBranchName ? state.head : { type: 'detached', commitId: targetCommitId },
    indexCommitId: mode === 'soft' ? state.indexCommitId : targetCommitId,
    workingTreeCommitId: mode === 'hard' ? targetCommitId : state.workingTreeCommitId,
  }

  return {
    state: nextState,
    ok: true,
    logs: [
      `reset ${mode} from ${currentHeadCommitId ?? 'empty'} to ${targetCommitId ?? 'empty'}`,
      ...formatGitStateForConsole(nextState),
    ],
  }
}

function add(state: GitEngineState, path: string): GitCommandResult {
  if (!state.repoExists) {
    return failure(state, 'not a git repository')
  }

  const nextFiles = { ...state.files }
  const targetFileNames =
    path === '.'
      ? Object.keys(nextFiles).filter((fileName) => nextFiles[fileName].status !== 'committed')
      : [path]

  if (targetFileNames.length === 0 || targetFileNames.some((fileName) => !nextFiles[fileName])) {
    return failure(state, `pathspec '${path}' did not match any files`)
  }

  targetFileNames.forEach((fileName) => {
    nextFiles[fileName] = {
      ...nextFiles[fileName],
      status: 'staged',
    }
  })

  const nextState = {
    ...state,
    files: nextFiles,
  }

  return {
    state: nextState,
    ok: true,
    logs: [`staged ${targetFileNames.join(', ')}`, ...formatGitStateForConsole(nextState)],
  }
}

function commit(state: GitEngineState, message?: string): GitCommandResult {
  if (!state.repoExists) {
    return failure(state, 'not a git repository')
  }

  const parentCommitId = getHeadCommitId(state)
  const nextCommitId = `C${state.nextCommitIndex}`
  const headBranchName = state.head.type === 'branch' ? state.head.branchName : null
  const nextCommit: GitCommit = {
    id: nextCommitId,
    parents: parentCommitId ? [parentCommitId] : [],
    ...(message ? { message } : {}),
  }
  const nextFiles = Object.fromEntries(
    Object.entries(state.files).map(([fileName, file]) => [
      fileName,
      file.status === 'staged' ? { ...file, status: 'committed' as const } : file,
    ]),
  )
  const nextState: GitEngineState = {
    ...state,
    files: nextFiles,
    commits: [...state.commits, nextCommit],
    indexCommitId: nextCommitId,
    workingTreeCommitId: nextCommitId,
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
    indexCommitId: targetBranch.commitId,
    workingTreeCommitId: targetBranch.commitId,
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
    indexCommitId: getHeadCommitId(state),
    workingTreeCommitId: getHeadCommitId(state),
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

  if (isAncestor(state, currentBranch.commitId, sourceBranch.commitId)) {
    const nextState: GitEngineState = {
      ...state,
      branches: state.branches.map((branchItem) =>
        branchItem.name === currentBranch.name
          ? { ...branchItem, commitId: sourceBranch.commitId }
          : branchItem,
      ),
      indexCommitId: sourceBranch.commitId,
      workingTreeCommitId: sourceBranch.commitId,
    }

    return {
      state: nextState,
      ok: true,
      logs: [
        `fast-forward ${currentBranch.name} to ${name}`,
        ...formatGitStateForConsole(nextState),
      ],
    }
  }

  if (isAncestor(state, sourceBranch.commitId, currentBranch.commitId)) {
    return {
      state,
      ok: true,
      logs: [`already up to date with ${name}`, ...formatGitStateForConsole(state)],
    }
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
    indexCommitId: nextCommitId,
    workingTreeCommitId: nextCommitId,
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
    logs: [message, explainFailure(message), ...formatGitStateForConsole(state)],
  }
}

function formatCommit(commitItem: GitCommit) {
  const parents = commitItem.parents.length > 0 ? commitItem.parents.join(',') : 'root'

  return `${commitItem.id} <- ${parents}`
}

function formatHeadStatus(state: GitEngineState) {
  return state.head.type === 'branch'
    ? `On branch ${state.head.branchName}`
    : `HEAD detached at ${state.head.commitId ?? 'empty'}`
}

function parseResetMode(token: string | undefined): GitResetMode | null {
  if (token === '--soft') return 'soft'
  if (token === '--mixed') return 'mixed'
  if (token === '--hard') return 'hard'

  return null
}

function resolveResetTarget(state: GitEngineState, target: string) {
  if (target === 'HEAD^' || target === 'HEAD~1') {
    const headCommit = getCommitById(state, getHeadCommitId(state))

    return headCommit?.parents[0] ?? null
  }

  if (target === 'HEAD') {
    return getHeadCommitId(state)
  }

  return state.commits.some((commit) => commit.id === target) ? target : undefined
}

function updateFilesForReset(files: Record<string, GitFile>, mode: GitResetMode) {
  if (mode === 'soft') {
    return Object.fromEntries(
      Object.entries(files).map(([fileName, file]) => [
        fileName,
        file.status === 'committed' ? { ...file, status: 'staged' as const } : file,
      ]),
    )
  }

  if (mode === 'mixed') {
    return Object.fromEntries(
      Object.entries(files).map(([fileName, file]) => [
        fileName,
        file.status === 'staged' || file.status === 'committed'
          ? { ...file, status: 'modified' as const }
          : file,
      ]),
    )
  }

  return Object.fromEntries(
    Object.entries(files)
      .filter(([, file]) => file.status !== 'untracked')
      .map(([fileName, file]) => [fileName, { ...file, status: 'committed' as const }]),
  )
}

function isAncestor(state: GitEngineState, ancestorId: string, commitId: string): boolean {
  if (ancestorId === commitId) {
    return true
  }

  const commit = getCommitById(state, commitId)

  if (!commit) {
    return false
  }

  return commit.parents.some((parentId) => isAncestor(state, ancestorId, parentId))
}

function getCommitById(state: GitEngineState, commitId: string | null) {
  return state.commits.find((commit) => commit.id === commitId)
}

function explainFailure(message: string) {
  if (message === 'not a git repository') {
    return 'Why: this lesson state is not initialized yet. Try running git init first.'
  }

  if (message.startsWith('pathspec')) {
    return 'Why: Git could not find that file in this lesson state. Check the file name with git status.'
  }

  if (message.startsWith('branch') && message.endsWith('does not exist')) {
    return 'Why: the target branch is not available yet. Check branch names or create it first.'
  }

  if (message.includes('already exists')) {
    return 'Why: that name is already in use. Choose a new branch name or switch to the existing one.'
  }

  if (message.startsWith('unknown revision')) {
    return 'Why: the reset target does not point to a known commit. Use HEAD^, HEAD~1, HEAD, or an existing commit id.'
  }

  return 'Why: the command does not match the current repository state. Compare the goal, current graph, and allowed commands.'
}
function isGitConfigKey(token: string | undefined): token is keyof GitConfig {
  return token === 'user.name' || token === 'user.email'
}

function tokenizeCommand(input: string) {
  const tokens: string[] = []
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(input))) {
    tokens.push(match[1] ?? match[2] ?? match[3])
  }

  return tokens
}

function uniqueCommitIds(commitIds: string[]) {
  return [...new Set(commitIds)]
}
