export type CommitGraphCommit = {
  id: string
  parents: string[]
  branch?: string
  order?: number
}

export type CommitGraphBranch = {
  name: string
  head: string
}

export type CommitGraphLayoutOptions = {
  laneGap?: number
  rowGap?: number
  paddingX?: number
  paddingY?: number
  nodeRadius?: number
}

export type CommitGraphNode = {
  id: string
  x: number
  y: number
  lane: string
  label: string
}

export type CommitGraphEdge = {
  id: string
  from: string
  to: string
  path: string
}

export type CommitGraphBranchLabel = {
  id: string
  name: string
  text: string
  commitId: string
  x: number
  y: number
  pointerPath: string
  isCurrent: boolean
}

export type CommitGraphLayout = {
  width: number
  height: number
  nodeRadius: number
  nodes: CommitGraphNode[]
  edges: CommitGraphEdge[]
  branchLabels: CommitGraphBranchLabel[]
}

const defaultOptions = {
  laneGap: 132,
  rowGap: 92,
  paddingX: 72,
  paddingY: 76,
  nodeRadius: 24,
}

export function calculateCommitGraphLayout(
  commits: CommitGraphCommit[],
  branches: CommitGraphBranch[],
  currentBranch: string | null,
  options: CommitGraphLayoutOptions = {},
): CommitGraphLayout {
  const mergedOptions = { ...defaultOptions, ...options }
  const orderedCommits = [...commits].sort((a, b) => {
    const orderA = a.order ?? commits.indexOf(a)
    const orderB = b.order ?? commits.indexOf(b)

    return orderA - orderB
  })
  const commitMap = new Map(orderedCommits.map((commit) => [commit.id, commit]))
  const laneNames = getLaneNames(orderedCommits, branches)
  const laneByCommit = getCommitLanes(orderedCommits, branches, laneNames, commitMap)
  const rankByCommit = getCommitRanks(orderedCommits, commitMap)
  const nodeByCommit = new Map<string, CommitGraphNode>()

  const nodes = orderedCommits.map((commit) => {
    const lane = laneByCommit.get(commit.id) ?? laneNames[0] ?? 'main'
    const laneIndex = Math.max(laneNames.indexOf(lane), 0)
    const rank = rankByCommit.get(commit.id) ?? 0
    const node = {
      id: commit.id,
      x: mergedOptions.paddingX + laneIndex * mergedOptions.laneGap,
      y: mergedOptions.paddingY + rank * mergedOptions.rowGap,
      lane,
      label: commit.id,
    }

    nodeByCommit.set(commit.id, node)

    return node
  })

  const edges = orderedCommits.flatMap((commit) =>
    commit.parents.flatMap((parentId) => {
      const parentNode = nodeByCommit.get(parentId)
      const childNode = nodeByCommit.get(commit.id)

      if (!parentNode || !childNode) {
        return []
      }

      return {
        id: `${parentId}-${commit.id}`,
        from: parentId,
        to: commit.id,
        path: getEdgePath(parentNode, childNode, mergedOptions.nodeRadius),
      }
    }),
  )

  const branchLabels = getBranchLabels(
    branches,
    currentBranch,
    nodeByCommit,
    mergedOptions.nodeRadius,
  )
  const maxLaneIndex = Math.max(laneNames.length - 1, 0)
  const maxRank = Math.max(...nodes.map((node) => rankByCommit.get(node.id) ?? 0), 0)
  const maxLabelRight = Math.max(...branchLabels.map((label) => label.x + 92), 0)
  const width = Math.max(
    mergedOptions.paddingX * 2 + maxLaneIndex * mergedOptions.laneGap + 220,
    maxLabelRight + mergedOptions.paddingX,
  )
  const height = mergedOptions.paddingY * 2 + maxRank * mergedOptions.rowGap + 96

  return {
    width,
    height,
    nodeRadius: mergedOptions.nodeRadius,
    nodes,
    edges,
    branchLabels,
  }
}

function getLaneNames(commits: CommitGraphCommit[], branches: CommitGraphBranch[]) {
  const laneNames = new Set<string>()

  const primaryBranch =
    branches.find((branch) => branch.name === 'main') ??
    branches.find((branch) => branch.name === 'master') ??
    branches[0]

  if (primaryBranch) {
    laneNames.add(primaryBranch.name)
  }

  branches.forEach((branch) => laneNames.add(branch.name))
  commits.forEach((commit) => {
    if (commit.branch) {
      laneNames.add(commit.branch)
    }
  })

  if (laneNames.size === 0) {
    laneNames.add('main')
  }

  return [...laneNames]
}

function getCommitLanes(
  commits: CommitGraphCommit[],
  branches: CommitGraphBranch[],
  laneNames: string[],
  commitMap: Map<string, CommitGraphCommit>,
) {
  const laneByCommit = new Map<string, string>()
  const branchOrder = [
    ...branches.filter((branch) => branch.name === laneNames[0]),
    ...branches.filter((branch) => branch.name !== laneNames[0]),
  ]

  branchOrder.forEach((branch) => {
    let commit = commitMap.get(branch.head)

    while (commit) {
      if (laneByCommit.has(commit.id)) {
        break
      }

      laneByCommit.set(commit.id, commit.branch ?? branch.name)
      commit = commit.parents[0] ? commitMap.get(commit.parents[0]) : undefined
    }
  })

  commits.forEach((commit) => {
    if (commit.branch) {
      laneByCommit.set(commit.id, commit.branch)
    }
  })

  commits.forEach((commit) => {
    if (!laneByCommit.has(commit.id)) {
      laneByCommit.set(commit.id, laneNames[0] ?? 'main')
    }
  })

  return laneByCommit
}

function getCommitRanks(commits: CommitGraphCommit[], commitMap: Map<string, CommitGraphCommit>) {
  const rankByCommit = new Map<string, number>()

  function getRank(commitId: string): number {
    const existingRank = rankByCommit.get(commitId)

    if (existingRank !== undefined) {
      return existingRank
    }

    const commit = commitMap.get(commitId)

    if (!commit || commit.parents.length === 0) {
      rankByCommit.set(commitId, 0)
      return 0
    }

    const rank = Math.max(...commit.parents.map((parentId) => getRank(parentId))) + 1
    rankByCommit.set(commitId, rank)

    return rank
  }

  commits.forEach((commit) => getRank(commit.id))

  return rankByCommit
}

function getEdgePath(parentNode: CommitGraphNode, childNode: CommitGraphNode, nodeRadius: number) {
  const startY = parentNode.y + nodeRadius
  const endY = childNode.y - nodeRadius

  if (parentNode.x === childNode.x) {
    return `M ${parentNode.x} ${startY} L ${childNode.x} ${endY}`
  }

  const midY = startY + (endY - startY) / 2

  return [
    `M ${parentNode.x} ${startY}`,
    `C ${parentNode.x} ${midY}`,
    `${childNode.x} ${midY}`,
    `${childNode.x} ${endY}`,
  ].join(' ')
}

function getBranchLabels(
  branches: CommitGraphBranch[],
  currentBranch: string | null,
  nodeByCommit: Map<string, CommitGraphNode>,
  nodeRadius: number,
) {
  const labelCountByCommit = new Map<string, number>()

  return branches.flatMap((branch) => {
    const node = nodeByCommit.get(branch.head)

    if (!node) {
      return []
    }

    const stackedIndex = labelCountByCommit.get(branch.head) ?? 0
    labelCountByCommit.set(branch.head, stackedIndex + 1)

    const x = node.x + nodeRadius + 24
    const y = node.y - 18 + stackedIndex * 34
    const pointerPath = `M ${x} ${y + 14} L ${node.x + nodeRadius + 2} ${node.y}`
    const isCurrent = branch.name === currentBranch

    return {
      id: branch.name,
      name: branch.name,
      text: isCurrent ? `${branch.name}*` : branch.name,
      commitId: branch.head,
      x,
      y,
      pointerPath,
      isCurrent,
    }
  })
}
