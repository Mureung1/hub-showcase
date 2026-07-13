import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-[16px] border p-6 ${className}`}
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-card-strong)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {children}
    </div>
  )
}
