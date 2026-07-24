interface MechanismControlsProps {
  isFirst: boolean
  isDone: boolean
  stepIndex: number
  totalSteps: number
  onStepBackward: () => void
  onStepForward: () => void
  onReset: () => void
}

export default function MechanismControls({
  isFirst,
  isDone,
  stepIndex,
  totalSteps,
  onStepBackward,
  onStepForward,
  onReset,
}: MechanismControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex gap-2">
        <button
          onClick={onStepBackward}
          disabled={isFirst}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
        >
          전 단계
        </button>
        <button
          onClick={onStepForward}
          disabled={isDone}
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-300 disabled:opacity-40"
        >
          다음 단계
        </button>
        <button
          onClick={onReset}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          처음부터
        </button>
      </div>

      <span className="text-sm text-zinc-500">
        {stepIndex + 1} / {totalSteps} 프레임
      </span>
    </div>
  )
}
