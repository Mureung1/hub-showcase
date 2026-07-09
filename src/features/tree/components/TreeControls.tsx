interface TreeControlsProps {
  playing: boolean
  isDone: boolean
  speed: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
}

export default function TreeControls({
  playing,
  isDone,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onReset,
  onSpeedChange,
}: TreeControlsProps) {
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

      <label className="flex items-center gap-2 text-sm text-zinc-400">
        속도
        <input
          type="range"
          min={100}
          max={1200}
          step={100}
          value={1300 - speed}
          onChange={(e) => onSpeedChange(1300 - Number(e.target.value))}
        />
      </label>
    </div>
  )
}
