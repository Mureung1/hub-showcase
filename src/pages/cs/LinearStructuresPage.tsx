import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLinearStructure } from '../../features/linearStructures/hooks/useLinearStructure'
import StructureVisualizer from '../../features/linearStructures/components/StructureVisualizer'
import StructureControls from '../../features/linearStructures/components/StructureControls'
import StructureTabs from '../../features/linearStructures/components/StructureTabs'
import type { LogTone, StructureType } from '../../features/linearStructures/types'
import Panel from '../../components/Panel'

interface LinearStructuresPageProps {
  type: StructureType
}

const CONCEPTS: Record<StructureType, { title: string; description: string; analogy: string }> = {
  stack: {
    title: '스택 (Stack)',
    description:
      '나중에 넣은 값이 먼저 나오는 후입선출(LIFO) 구조입니다. Push로 맨 위에 쌓고, Pop으로 맨 위부터 꺼냅니다.',
    analogy: '비유: 책을 쌓았다가 위에서부터 꺼내는 것, 브라우저의 뒤로가기 버튼',
  },
  queue: {
    title: '큐 (Queue)',
    description:
      '먼저 넣은 값이 먼저 나오는 선입선출(FIFO) 구조입니다. Enqueue로 뒤에 추가하고, Dequeue로 앞에서 꺼냅니다.',
    analogy: '비유: 줄을 서서 먼저 온 사람부터 처리하는 것, 프린터 인쇄 대기열',
  },
  deque: {
    title: '덱 (Deque)',
    description:
      '앞뒤 양쪽에서 모두 삽입·삭제가 가능한 구조입니다. 스택과 큐의 동작을 모두 표현할 수 있습니다.',
    analogy: '비유: 카드 덱에서 위쪽이든 아래쪽이든 원하는 쪽에서 카드를 뽑는 것',
  },
}

const PANEL_TITLE: Record<StructureType, string> = {
  stack: 'cs / stack.tsx',
  queue: 'cs / queue.tsx',
  deque: 'cs / deque.tsx',
}

const TONE_CLASS: Record<LogTone, string> = {
  neutral: 'text-zinc-400',
  ok: 'text-emerald-400',
  error: 'text-rose-400',
}

const SEED_VALUES = ['5', '21', '49']

export default function LinearStructuresPage({ type }: LinearStructuresPageProps) {
  const navigate = useNavigate()
  const {
    items,
    logs,
    addFront,
    addRear,
    removeFront,
    removeRear,
    peekFront,
    peekRear,
    seed,
    reset,
  } = useLinearStructure()

  useEffect(() => {
    seed(SEED_VALUES)
  }, [type])

  const concept = CONCEPTS[type]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">자료구조 시뮬레이터</h1>
      <p className="mt-1 text-sm text-zinc-400">
        값을 입력하고 직접 조작하면서 스택·큐·덱의 동작 방식을 확인하세요.
      </p>

      <div className="mt-4">
        <StructureTabs activeType={type} onSelect={(next) => navigate(`/cs/${next}`)} />
      </div>

      <div className="mt-6">
        <Panel title={PANEL_TITLE[type]}>
          <div className="py-6">
            <StructureVisualizer items={items} type={type} />
          </div>
          <StructureControls
            type={type}
            onAddFront={addFront}
            onAddRear={addRear}
            onRemoveFront={removeFront}
            onRemoveRear={removeRear}
            onPeekFront={peekFront}
            onPeekRear={peekRear}
            onReset={reset}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Panel title="연산 기록">
          <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {logs.map((log) => (
              <p key={log.id} className={TONE_CLASS[log.tone]}>
                {log.message}
              </p>
            ))}
          </div>
        </Panel>
        <Panel title="개념 설명">
          <h2 className="text-sm font-semibold text-zinc-100">{concept.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{concept.description}</p>
          <p className="mt-2 text-sm text-zinc-500">{concept.analogy}</p>
        </Panel>
      </div>
    </div>
  )
}
