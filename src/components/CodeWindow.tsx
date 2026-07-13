import type { ReactNode } from 'react'

interface CodeWindowProps {
  title: string
  children: ReactNode
}

export default function CodeWindow({ title, children }: CodeWindowProps) {
  return (
    <div
      className="overflow-hidden rounded-[10px] border"
      style={{ borderColor: 'var(--color-border-card)', background: 'var(--color-bg-page)' }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--color-border-card)' }}
      >
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#f0997b' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#efa427' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#5dcaa5' }} />
        </div>
        <span
          className="font-mono text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {title}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}
