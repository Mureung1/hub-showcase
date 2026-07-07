interface MechanismControlsProps {
  playing: boolean
  isDone: boolean
  stepIndex: number
  totalSteps: number
  speed: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
}

export default function MechanismControls({
  playing,
  isDone,
  stepIndex,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onReset,
  onSpeedChange,
}: MechanismControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex gap-2">
        {playing ? (
          <button
            onClick={onPause}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-300"
          >
            일시정지
          </button>
        ) : (
          <button
            onClick={onPlay}
            disabled={isDone}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-300 disabled:opacity-40"
          >
            재생
          </button>
        )}
        <button
          onClick={onStepForward}
          disabled={playing || isDone}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
        >
          한 단계
        </button>
        <button
          onClick={onReset}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          처음부터
        </button>
      </div>

      <span className="text-sm text-zinc-500">
        {stepIndex + 1} / {totalSteps} 단계
      </span>

      <label className="flex items-center gap-2 text-sm text-zinc-400">
        속도
        <input
          type="range"
          min={500}
          max={3000}
          step={100}
          value={3500 - speed}
          onChange={(e) => onSpeedChange(3500 - Number(e.target.value))}
        />
      </label>
    </div>
  )
}
