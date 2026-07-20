import './ScreenHint.css'

type ScreenHintProps = {
  text: string
  className?: string
}

function ScreenHint({ text, className }: ScreenHintProps) {
  return <p className={['screen-hint', className].filter(Boolean).join(' ')}>{text}</p>
}

export default ScreenHint
