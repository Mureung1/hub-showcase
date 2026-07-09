interface PendingQueueProps {
  upcomingValues: number[]
}

export default function PendingQueue({ upcomingValues }: PendingQueueProps) {
  if (upcomingValues.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
      <span>다음 삽입 예정</span>
      {upcomingValues.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300"
        >
          {value}
        </span>
      ))}
    </div>
  )
}
