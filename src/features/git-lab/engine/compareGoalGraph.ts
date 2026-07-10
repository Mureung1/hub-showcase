import type { CommitGraphBranch, CommitGraphCommit } from '../components/CommitGraphSvg'

export type GitGraphSnapshot = {
  commits: CommitGraphCommit[]
  branches: CommitGraphBranch[]
  currentBranch: string | null
}

export type GoalCheckResult = {
  cleared: boolean
  message: string
}

type NormalizedGraph = {
  commits: Array<{
    id: string
    parents: string[]
  }>
  branches: Array<{
    name: string
    head: string
  }>
  currentBranch: string | null
}

export function compareGoalGraph(
  current: GitGraphSnapshot,
  goal: GitGraphSnapshot,
): GoalCheckResult {
  const normalizedCurrent = normalizeGraph(current)
  const normalizedGoal = normalizeGraph(goal)

  if (normalizedCurrent.commits.length !== normalizedGoal.commits.length) {
    return {
      cleared: false,
      message: `커밋 개수가 다릅니다. 현재 ${normalizedCurrent.commits.length}개, 목표 ${normalizedGoal.commits.length}개입니다.`,
    }
  }

  if (JSON.stringify(normalizedCurrent.commits) !== JSON.stringify(normalizedGoal.commits)) {
    return {
      cleared: false,
      message: '커밋 부모 관계가 아직 목표 그래프와 다릅니다.',
    }
  }

  if (JSON.stringify(normalizedCurrent.branches) !== JSON.stringify(normalizedGoal.branches)) {
    return {
      cleared: false,
      message: '브랜치가 가리키는 커밋 위치가 아직 목표와 다릅니다.',
    }
  }

  if (normalizedCurrent.currentBranch !== normalizedGoal.currentBranch) {
    return {
      cleared: false,
      message: '현재 체크아웃된 브랜치가 목표와 다릅니다.',
    }
  }

  return {
    cleared: true,
    message: '목표 그래프와 현재 그래프가 일치합니다.',
  }
}

function normalizeGraph(graph: GitGraphSnapshot): NormalizedGraph {
  const orderedCommits = [...graph.commits].sort((a, b) => {
    const orderA = a.order ?? graph.commits.indexOf(a)
    const orderB = b.order ?? graph.commits.indexOf(b)

    return orderA - orderB
  })
  const normalizedIdByCommit = new Map<string, string>()

  orderedCommits.forEach((commit, index) => {
    normalizedIdByCommit.set(commit.id, `C${index}`)
  })

  const commits = orderedCommits.map((commit) => ({
    id: normalizedIdByCommit.get(commit.id) ?? commit.id,
    parents: commit.parents
      .map((parentId) => normalizedIdByCommit.get(parentId) ?? parentId)
      .sort(),
  }))
  const branches = graph.branches
    .filter((branch) => branch.head)
    .map((branch) => ({
      name: branch.name,
      head: normalizedIdByCommit.get(branch.head) ?? branch.head,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    commits,
    branches,
    currentBranch: graph.currentBranch,
  }
}
