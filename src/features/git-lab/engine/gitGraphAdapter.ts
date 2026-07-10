import type { CommitGraphBranch, CommitGraphCommit } from '../components/CommitGraphSvg'
import type { GitBranch, GitCommit, GitEngineState } from './gitEngine'

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
    commits,
    branches: branches.length > 0 ? branches : [{ name: currentBranch, commitId: null }],
    head: { type: 'branch', branchName: currentBranch },
    nextCommitIndex: commits.length,
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
