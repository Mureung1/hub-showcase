interface PendingQueueProps {
  upcomingValues: number[]
}

export default function PendingQueue({ upcomingValues }: PendingQueueProps) {
  if (upcomingValues.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
      <span>다음 삽입 예정</span>
      {upcomingValues.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs"
          style={{
            borderColor: 'var(--color-border-card-strong)',
            background: 'var(--color-bg-page)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {value}
        </span>
      ))}
    </div>
  )
}
