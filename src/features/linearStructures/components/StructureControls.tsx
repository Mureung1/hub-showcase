import { useState } from 'react'
import type { StructureType } from '../types'

interface StructureControlsProps {
  type: StructureType
  onAddFront: (value: string) => void
  onAddRear: (value: string) => void
  onRemoveFront: () => void
  onRemoveRear: () => void
  onPeekFront: () => void
  onPeekRear: () => void
  onReset: () => void
}

const primaryBtn =
  'rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-300'
const secondaryBtn =
  'rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800'

export default function StructureControls({
  type,
  onAddFront,
  onAddRear,
  onRemoveFront,
  onRemoveRear,
  onPeekFront,
  onPeekRear,
  onReset,
}: StructureControlsProps) {
  const [value, setValue] = useState('')

  const submitAddRear = () => {
    onAddRear(value)
    setValue('')
  }
  const submitAddFront = () => {
    onAddFront(value)
    setValue('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitAddRear()
        }}
        placeholder="값 입력"
        className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
      />

      {type === 'stack' && (
        <>
          <button onClick={submitAddRear} className={primaryBtn}>
            Push
          </button>
          <button onClick={onRemoveRear} className={secondaryBtn}>
            Pop
          </button>
          <button onClick={onPeekRear} className={secondaryBtn}>
            Peek
          </button>
        </>
      )}

      {type === 'queue' && (
        <>
          <button onClick={submitAddRear} className={primaryBtn}>
            Enqueue
          </button>
          <button onClick={onRemoveFront} className={secondaryBtn}>
            Dequeue
          </button>
          <button onClick={onPeekFront} className={secondaryBtn}>
            Peek
          </button>
        </>
      )}

      {type === 'deque' && (
        <>
          <button onClick={submitAddFront} className={primaryBtn}>
            앞에 추가
          </button>
          <button onClick={submitAddRear} className={primaryBtn}>
            뒤에 추가
          </button>
          <button onClick={onRemoveFront} className={secondaryBtn}>
            앞 제거
          </button>
          <button onClick={onRemoveRear} className={secondaryBtn}>
            뒤 제거
          </button>
          <button onClick={onPeekFront} className={secondaryBtn}>
            앞 Peek
          </button>
          <button onClick={onPeekRear} className={secondaryBtn}>
            뒤 Peek
          </button>
        </>
      )}

      <button onClick={onReset} className={secondaryBtn}>
        초기화
      </button>
    </div>
  )
}
