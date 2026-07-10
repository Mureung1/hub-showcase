import { useId, useMemo } from 'react'
import {
  calculateCommitGraphLayout,
  type CommitGraphBranch,
  type CommitGraphCommit,
  type CommitGraphLayoutOptions,
} from '../layout/calculateCommitGraphLayout'
import styles from './CommitGraphSvg.module.css'

type CommitGraphSvgProps = {
  commits: CommitGraphCommit[]
  branches: CommitGraphBranch[]
  currentBranch: string | null
  layoutOptions?: CommitGraphLayoutOptions
  className?: string
}

export default function CommitGraphSvg({
  commits,
  branches,
  currentBranch,
  layoutOptions,
  className,
}: CommitGraphSvgProps) {
  const markerId = useId().replaceAll(':', '')
  const layout = useMemo(
    () => calculateCommitGraphLayout(commits, branches, currentBranch, layoutOptions),
    [branches, commits, currentBranch, layoutOptions],
  )

  if (commits.length === 0) {
    return <div className={`${styles.emptyState} ${className ?? ''}`}>아직 커밋이 없습니다.</div>
  }

  return (
    <svg
      className={`${styles.graph} ${className ?? ''}`}
      role="img"
      aria-label="Git 커밋 그래프"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className={styles.arrowHead} />
        </marker>
      </defs>

      <g className={styles.edges}>
        {layout.edges.map((edge) => (
          <path
            className={styles.edge}
            d={edge.path}
            key={edge.id}
            markerEnd={`url(#${markerId})`}
          />
        ))}
      </g>

      <g className={styles.branchLabels}>
        {layout.branchLabels.map((branchLabel) => (
          <g className={styles.branchLabelGroup} key={branchLabel.id}>
            {branchLabel.isCurrent ? (
              <path
                className={styles.currentBranchPointer}
                d={branchLabel.pointerPath}
                markerEnd={`url(#${markerId})`}
              />
            ) : null}
            <g
              className={
                branchLabel.isCurrent
                  ? `${styles.branchBubble} ${styles.currentBranchBubble}`
                  : styles.branchBubble
              }
              style={{ transform: `translate(${branchLabel.x}px, ${branchLabel.y}px)` }}
            >
              <rect width="78" height="28" rx="8" />
              <text x="39" y="19">
                {branchLabel.text}
              </text>
            </g>
          </g>
        ))}
      </g>

      <g className={styles.nodes}>
        {layout.nodes.map((node) => (
          <g
            className={styles.nodeGroup}
            key={node.id}
            style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
          >
            <circle className={styles.nodeCircle} r={layout.nodeRadius} />
            <text className={styles.nodeText} y="5">
              {node.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}

export type { CommitGraphBranch, CommitGraphCommit, CommitGraphLayoutOptions }
