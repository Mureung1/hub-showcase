import { useToast } from './ToastProvider.tsx'
import './CopyLinkBox.css'

type CopyLinkBoxProps = {
  link: string
}

function CopyLinkBox({ link }: CopyLinkBoxProps) {
  const showToast = useToast()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link) // study: 브라우저 내장 API를 사용하여 클립보드에 복사 시킨다. await로 복사가 끝나기를 기다렸다가, Toast를 띄움.
    showToast('링크가 복사됐어요')
  }

  return (
    <div className="copy-link-box">
      <span className="copy-link-box__text">{link}</span>
      <button type="button" className="button--secondary copy-link-box__button" onClick={handleCopy}>
        복사
      </button>
    </div>
  )
}

export default CopyLinkBox
