interface TreeControlsProps {
  playing: boolean
  isDone: boolean
  speed: number
  stepIndex: number
  totalSteps: number
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
  stepIndex,
  totalSteps,
  onPlay,
  onPause,
  onStepForward,
  onReset,
  onSpeedChange,
}: TreeControlsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-6 rounded-[var(--radius-card)] border p-4"
      style={{ borderColor: 'var(--color-border-card)', background: 'var(--color-bg-page)' }}
    >
      <div className="flex gap-2">
        {playing ? (
          <button
            onClick={onPause}
            className="rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: '#0b0d12' }}
          >
            일시정지
          </button>
        ) : (
          <button
            onClick={onPlay}
            disabled={isDone}
            className="rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--color-accent)', color: '#0b0d12', boxShadow: 'var(--shadow-glow-accent)' }}
          >
            재생
          </button>
        )}
        <button
          onClick={onStepForward}
          disabled={playing || isDone}
          className="rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-medium disabled:opacity-40"
          style={{ borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-secondary)' }}
        >
          한 단계
        </button>
        <button
          onClick={onReset}
          className="rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-secondary)' }}
        >
          처음부터
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
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

      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {stepIndex + 1} / {totalSteps}
        <div
          className="h-[5px] w-20 overflow-hidden rounded-[2px]"
          style={{ background: 'var(--color-border-card-strong)' }}
        >
          <div
            className="h-full rounded-[2px]"
            style={{
              width: `${((stepIndex + 1) / totalSteps) * 100}%`,
              background: 'var(--color-accent)',
              boxShadow: '0 0 6px rgba(34,211,238,0.6)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
