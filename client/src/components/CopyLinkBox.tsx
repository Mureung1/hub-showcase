import { useEffect, useRef, useState } from 'react'
import './CopyLinkBox.css'

type CopyLinkBoxProps = {
  link: string
}

const COPIED_DISPLAY_MS = 1000

function CopyLinkBox({ link }: CopyLinkBoxProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // claude: 모달이 열려있는 동안만 존재하는 컴포넌트라 타이머가 끝나기 전에 언마운트될 수 있다 - 정리 안 하면
  // 이미 사라진 컴포넌트에 setCopied를 호출하게 되므로, 언마운트 시 남은 타이머를 지운다.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link) // study: 브라우저 내장 API를 사용하여 클립보드에 복사 시킨다. await로 복사가 끝나기를 기다렸다가, Toast를 띄움.
      // claude: navigator.clipboard가 없는 환경(예: HTTP로 접속한 LAN 주소 - 보안 컨텍스트가 아니라 API 자체가 undefined)이거나
      // 권한 거부 시 여기서 에러가 나서 catch로 빠진다. 복사 완료 표시는 이제 Toast가 아니라 버튼 자체를
      // 잠깐 "복사됨"으로 바꿨다 되돌리는 방식으로 변경 - Toast는 다른 용도로 남겨둔다.
      if (timerRef.current) clearTimeout(timerRef.current)
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), COPIED_DISPLAY_MS)
    } catch {
      // claude: 복사 실패 시 조용히 무시 - "복사됨" 표시만 안 하고, 버튼은 원래 상태로 남는다.
    }
  }

  return (
    <div className="copy-link-box">
      <span className="copy-link-box__text">{link}</span>
      <button type="button" className="button--secondary copy-link-box__button" onClick={handleCopy}>
        {copied ? '복사됨 ✓' : '복사'}
      </button>
    </div>
  )
}

export default CopyLinkBox
