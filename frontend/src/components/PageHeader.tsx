import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: ReactNode
  backTo?: string
  action?: ReactNode
}

export default function PageHeader({ title, backTo, action }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-line bg-sand px-5 py-[18px]">
      <div className="flex items-center gap-[10px]">
        {backTo ? (
          <Link to={backTo} aria-label="뒤로 가기" className="text-lg text-green-700">
            ←
          </Link>
        ) : null}
        <div className="font-display text-[17px] font-bold text-green-900">{title}</div>
      </div>
      {action}
    </header>
  )
}
