interface SortControlsProps {
  playing: boolean
  isDone: boolean
  speed: number
  arraySize: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onReset: () => void
  onShuffle: () => void
  onSpeedChange: (speed: number) => void
  onArraySizeChange: (size: number) => void
}

export default function SortControls({
  playing,
  isDone,
  speed,
  arraySize,
  onPlay,
  onPause,
  onStepForward,
  onReset,
  onShuffle,
  onSpeedChange,
  onArraySizeChange,
}: SortControlsProps) {
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
        <button
          onClick={onShuffle}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          새 배열
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-400">
        속도
        <input
          type="range"
          min={50}
          max={1000}
          step={50}
          value={1050 - speed}
          onChange={(e) => onSpeedChange(1050 - Number(e.target.value))}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-400">
        배열 크기
        <input
          type="range"
          min={4}
          max={30}
          value={arraySize}
          onChange={(e) => onArraySizeChange(Number(e.target.value))}
        />
        <span className="w-6 tabular-nums text-zinc-300">{arraySize}</span>
      </label>
    </div>
  )
}
