import { useMemo, useState } from 'react'
import { TREE_DATASETS } from '../../features/tree/data/datasets'
import { buildTree } from '../../features/tree/lib/buildTree'
import { layoutTree } from '../../features/tree/lib/layout'
import { generateInsertSteps, generateTraversalSteps } from '../../features/tree/lib/generateSteps'
import { useTreePlayer } from '../../features/tree/hooks/useTreePlayer'
import TreeVisualizer from '../../features/tree/components/TreeVisualizer'
import PendingQueue from '../../features/tree/components/PendingQueue'
import TreeControls from '../../features/tree/components/TreeControls'
import DatasetTabs from '../../features/tree/components/DatasetTabs'
import TraversalOrderPicker from '../../features/tree/components/TraversalOrderPicker'
import ModeTabs, { type TreeMode } from '../../features/tree/components/ModeTabs'
import CodePanel from '../../features/sorting/components/CodePanel'
import { INSERT_PSEUDOCODE, TRAVERSAL_PSEUDOCODE } from '../../features/tree/data/pseudocode'
import type { TraversalOrder } from '../../features/tree/types'
import Card from '../../components/Card'
import CodeWindow from '../../components/CodeWindow'

export default function TreePage() {
  const [datasetId, setDatasetId] = useState(TREE_DATASETS[0].id)
  const [order, setOrder] = useState<TraversalOrder>('inorder')
  const [mode, setMode] = useState<TreeMode>('insert')

  const dataset = TREE_DATASETS.find((d) => d.id === datasetId) ?? TREE_DATASETS[0]

  const root = useMemo(() => buildTree(dataset.insertionOrder), [dataset])
  const { positions, width, height } = useMemo(() => layoutTree(root), [root])

  const insertSteps = useMemo(() => generateInsertSteps(dataset.insertionOrder), [dataset])
  const insertPlayer = useTreePlayer(insertSteps)

  const traversalSteps = useMemo(() => generateTraversalSteps(root, order), [root, order])
  const traversalPlayer = useTreePlayer(traversalSteps)

  const player = mode === 'insert' ? insertPlayer : traversalPlayer
  const codeLines = mode === 'insert' ? INSERT_PSEUDOCODE : TRAVERSAL_PSEUDOCODE[order]

  return (
    <div>
      <div className="mb-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium"
          style={{ background: 'var(--color-accent-fill)', color: 'var(--color-accent-text)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
          기능 A · 코드-시각화 동기화
        </span>
      </div>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        트리 시각화
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        값이 삽입되며 트리가 만들어지는 과정과, 순회하며 노드를 방문하는 과정을 확인하세요.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <DatasetTabs datasets={TREE_DATASETS} activeId={datasetId} onSelect={setDatasetId} />
        <div className="flex flex-wrap items-center gap-3">
          {mode === 'traverse' && <TraversalOrderPicker activeOrder={order} onSelect={setOrder} />}
          <ModeTabs mode={mode} onSelect={setMode} />
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="shrink-0">
              <div className="pb-4">
                <PendingQueue upcomingValues={player.step?.upcomingValues ?? []} />
              </div>
              <div className="pb-4">
                {player.step && (
                  <div
                    className="rounded-[var(--radius-control)] border p-2"
                    style={{
                      borderColor: 'var(--color-border-card)',
                      backgroundColor: 'var(--color-bg-page)',
                      backgroundImage:
                        'radial-gradient(circle at 50% 38%, rgba(34,211,238,0.08), transparent 62%), radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
                      backgroundSize: 'auto, 22px 22px',
                    }}
                  >
                    <TreeVisualizer step={player.step} positions={positions} width={width} height={height} />
                  </div>
                )}
              </div>

              <TreeControls
                playing={player.playing}
                isDone={player.isDone}
                speed={player.speed}
                stepIndex={player.stepIndex}
                totalSteps={player.totalSteps}
                onPlay={player.play}
                onPause={player.pause}
                onStepForward={player.stepForward}
                onReset={player.reset}
                onSpeedChange={player.setSpeed}
              />
            </div>

            <div className="min-w-[320px] flex-1">
              <CodeWindow title={`tree-${dataset.id}.tsx`}>
                <CodePanel lines={codeLines} activeLine={player.step?.line ?? null} />
              </CodeWindow>

              <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {player.step?.description}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
