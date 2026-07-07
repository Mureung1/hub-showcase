import { useMemo, useState } from 'react'
import { bubbleSort } from '../../features/sorting/algorithms/bubbleSort'
import { createCells, generateRandomValues } from '../../features/sorting/lib/array'
import { useSortPlayer } from '../../features/sorting/hooks/useSortPlayer'
import ArrayVisualizer from '../../features/sorting/components/ArrayVisualizer'
import SortControls from '../../features/sorting/components/SortControls'
import CodePanel from '../../features/sorting/components/CodePanel'
import { getHighlightedLine } from '../../features/sorting/data/pseudocode'
import Panel from '../../components/Panel'

const DEFAULT_SIZE = 12

export default function SortingPage() {
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE)
  const [values, setValues] = useState(() => generateRandomValues(DEFAULT_SIZE))

  const steps = useMemo(() => bubbleSort(createCells(values)), [values])
  const player = useSortPlayer(steps)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">버블 정렬 시각화</h1>
      <p className="mt-1 text-sm text-zinc-400">
        배열 칸을 직접 비교하고 자리를 바꾸는 과정을 애니메이션으로 확인하세요.
      </p>

      <div className="mt-6">
        <Panel title="cs / bubble-sort.tsx">
          <div className="flex items-center justify-center py-6">
            <ArrayVisualizer
              cells={player.cells}
              comparingIndices={player.comparingIndices}
              swappingIndices={player.swappingIndices}
              sortedIndices={player.sortedIndices}
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
            <CodePanel activeLine={getHighlightedLine(player.stepType)} />
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="설명">
          <h2 className="text-sm font-semibold text-zinc-100">버블 정렬 (Bubble Sort)</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            인접한 두 원소를 비교해 순서가 잘못되어 있으면 자리를 바꾸는 과정을 배열
            전체에 반복합니다. 한 번의 패스가 끝날 때마다 가장 큰 값이 배열의
            뒤쪽으로 밀려나며, 더 이상 교환이 일어나지 않으면 정렬이 완료됩니다.
          </p>
          <p className="mt-2 text-sm text-zinc-500">평균/최악 시간복잡도: O(n²)</p>
        </Panel>
      </div>
    </div>
  )
}
