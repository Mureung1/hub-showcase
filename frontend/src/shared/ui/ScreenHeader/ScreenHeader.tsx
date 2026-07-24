import { ChevronLeft } from 'lucide-react'
import './ScreenHeader.css'

type ScreenHeaderProps = {
  title: string
  onBack: () => void
}

export default function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <header className="screen-back-header">
      <button
        type="button"
        className="screen-back-button"
        aria-label="뒤로가기"
        onClick={onBack}
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <span className="screen-back-header-label">{title}</span>
    </header>
  )
}
