import './ScreenHint.css'

type ScreenHintProps = {
  text: string
  className?: string
}
// study: 기본적으로는 className = undefined 라 필터링 후 screen-hint 라는 className으로 사용됨, 
// 그러나 홈 화면에서 유일하게 screen-hint--center로 사용됨.
function ScreenHint({ text, className }: ScreenHintProps) {
  return <p className={['screen-hint', className].filter(Boolean).join(' ')}>{text}</p>
}

export default ScreenHint
