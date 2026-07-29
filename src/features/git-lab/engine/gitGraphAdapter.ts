import type { CommitGraphBranch, CommitGraphCommit } from '../components/CommitGraphSvg'
import { createEmptyConfig, type GitBranch, type GitCommit, type GitEngineState } from './gitEngine'

export type GraphSnapshot = {
  commits: CommitGraphCommit[]
  branches: CommitGraphBranch[]
  currentBranch: string | null
}

export function createEngineStateFromSnapshot(snapshot: GraphSnapshot): GitEngineState {
  const commits: GitCommit[] = snapshot.commits.map((commit) => ({
    id: commit.id,
    parents: commit.parents,
  }))
  const branches: GitBranch[] = snapshot.branches.map((branch) => ({
    name: branch.name,
    commitId: branch.head || null,
  }))
  const currentBranch = snapshot.currentBranch ?? branches[0]?.name ?? 'main'

  return {
    repoExists: true,
    config: createEmptyConfig(),
    files: {},
    commits,
    branches: branches.length > 0 ? branches : [{ name: currentBranch, commitId: null }],
    head: { type: 'branch', branchName: currentBranch },
    indexCommitId: branches.find((branch) => branch.name === currentBranch)?.commitId ?? null,
    workingTreeCommitId: branches.find((branch) => branch.name === currentBranch)?.commitId ?? null,
    nextCommitIndex: getNextCommitIndex(commits),
    remotes: [],
    remoteBranches: {},
    tags: [],
    stash: [],
    bisect: null,
    conflict: null,
    pendingMerge: null,
    lastResolvedRef: null,
    lastLogRangeResult: null,
  }
}

export function createGraphSnapshotFromEngineState(state: GitEngineState): GraphSnapshot {
  const branches = state.branches
    .filter((branch) => branch.commitId)
    .map((branch) => ({
      name: branch.name,
      head: branch.commitId ?? '',
    }))
  const currentBranch = state.head.type === 'branch' ? state.head.branchName : null

  return {
    commits: state.commits.map((commit, index) => ({
      id: commit.id,
      parents: commit.parents,
      branch: getCommitBranch(commit.id, state.branches),
      order: index,
    })),
    branches,
    currentBranch,
  }
}

function getCommitBranch(commitId: string, branches: GitBranch[]) {
  return branches.find((branch) => branch.commitId === commitId)?.name
}

function getNextCommitIndex(commits: GitCommit[]) {
  const maxCommitIndex = commits.reduce((maxIndex, commit) => {
    const match = /^C(\d+)$/.exec(commit.id)

    return match ? Math.max(maxIndex, Number(match[1])) : maxIndex
  }, -1)

  return maxCommitIndex + 1
}
