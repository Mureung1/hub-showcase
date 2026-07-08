import { useMemo, useState } from 'react'
import { SORT_ALGORITHMS } from '../../features/sorting/data/algorithms'
import { createCells, generateRandomValues } from '../../features/sorting/lib/array'
import { useSortPlayer } from '../../features/sorting/hooks/useSortPlayer'
import ArrayVisualizer from '../../features/sorting/components/ArrayVisualizer'
import SortControls from '../../features/sorting/components/SortControls'
import CodePanel from '../../features/sorting/components/CodePanel'
import AlgorithmTabs from '../../features/sorting/components/AlgorithmTabs'
import Panel from '../../components/Panel'

const DEFAULT_SIZE = 12

export default function SortingPage() {
  const [activeAlgoId, setActiveAlgoId] = useState(SORT_ALGORITHMS[0].id)
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE)
  const [values, setValues] = useState(() => generateRandomValues(DEFAULT_SIZE))

  const activeAlgorithm =
    SORT_ALGORITHMS.find((a) => a.id === activeAlgoId) ?? SORT_ALGORITHMS[0]

  const steps = useMemo(
    () => activeAlgorithm.sort(createCells(values)),
    [values, activeAlgorithm],
  )
  const player = useSortPlayer(steps)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">정렬 알고리즘 시각화</h1>
      <p className="mt-1 text-sm text-zinc-400">
        배열 칸을 직접 비교하고 자리를 바꾸는 과정을 애니메이션으로 확인하세요.
      </p>

      <div className="mt-4">
        <AlgorithmTabs
          algorithms={SORT_ALGORITHMS}
          activeId={activeAlgoId}
          onSelect={setActiveAlgoId}
        />
      </div>

      <div className="mt-6">
        <Panel title={`cs / ${activeAlgorithm.id}.tsx`}>
          <div className="flex items-center justify-center py-6">
            <ArrayVisualizer
              cells={player.cells}
              comparingIndices={player.comparingIndices}
              swappingIndices={player.swappingIndices}
              sortedIndices={player.sortedIndices}
              pivotIndex={player.pivotIndex}
            />
          </div>

          <SortControls
            playing={player.playing}
            isDone={player.isDone}
            speed={player.speed}
            arraySize={arraySize}
            onPlay={player.play}
            onPause={player.pause}
            onStepForward={player.stepForward}
            onReset={player.reset}
            onShuffle={() => setValues(generateRandomValues(arraySize))}
            onSpeedChange={player.setSpeed}
            onArraySizeChange={(size) => {
              setArraySize(size)
              setValues(generateRandomValues(size))
            }}
          />

          <div className="mt-4 border-t border-zinc-800 pt-4">
            <CodePanel lines={activeAlgorithm.pseudocode} activeLine={player.activeLine} />
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="설명">
          <h2 className="text-sm font-semibold text-zinc-100">{activeAlgorithm.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {activeAlgorithm.description}
          </p>
          <p className="mt-2 text-sm text-zinc-500">{activeAlgorithm.complexity}</p>
        </Panel>
      </div>
    </div>
  )
}
