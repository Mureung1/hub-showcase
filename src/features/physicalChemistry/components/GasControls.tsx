import { GAS_PRESETS } from '../data/gases'

interface GasControlsProps {
  temperatureK: number
  onTemperatureChange: (temperatureK: number) => void
  gasId: string
  onGasChange: (gasId: string) => void
  onSnapshot: () => void
  onClearSnapshot: () => void
  hasSnapshot: boolean
}

export default function GasControls({
  temperatureK,
  onTemperatureChange,
  gasId,
  onGasChange,
  onSnapshot,
  onClearSnapshot,
  hasSnapshot,
}: GasControlsProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border p-4"
      style={{ borderColor: 'var(--color-border-card)', background: 'var(--color-bg-page)' }}
    >
      <div className="flex flex-wrap gap-2">
        {GAS_PRESETS.map((gas) => (
          <button
            key={gas.id}
            type="button"
            onClick={() => onGasChange(gas.id)}
            className="rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors"
            style={
              gasId === gas.id
                ? {
                    borderColor: 'var(--color-accent)',
                    background: 'var(--color-accent-fill)',
                    color: 'var(--color-accent-text)',
                  }
                : { borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-secondary)' }
            }
          >
            {gas.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        온도
        <input
          type="range"
          min={100}
          max={1000}
          step={10}
          value={temperatureK}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-16 shrink-0 text-right" style={{ color: 'var(--color-text-primary)' }}>
          {temperatureK} K
        </span>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSnapshot}
          className="rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-secondary)' }}
        >
          현재 조건을 비교선으로 저장
        </button>
        {hasSnapshot && (
          <button
            type="button"
            onClick={onClearSnapshot}
            className="rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-muted)' }}
          >
            비교선 지우기
          </button>
        )}
      </div>
    </div>
  )
}
