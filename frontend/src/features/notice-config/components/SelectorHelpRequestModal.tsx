import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { SelectorHelpRequest } from '../types/noticeConfigTypes'

interface SelectorHelpRequestModalProps {
  initialSiteName: string
  initialUrl: string
  onClose: () => void
  onSubmit: (request: SelectorHelpRequest) => Promise<void>
}

const initialRequest: SelectorHelpRequest = {
  email: '',
  siteName: '',
  url: '',
}

export function SelectorHelpRequestModal({
  initialSiteName,
  initialUrl,
  onClose,
  onSubmit,
}: SelectorHelpRequestModalProps) {
  const [request, setRequest] = useState<SelectorHelpRequest>({
    ...initialRequest,
    siteName: initialSiteName,
    url: initialUrl,
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle')

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const canSubmit =
    request.email.trim().length > 0 &&
    request.siteName.trim().length > 0 &&
    request.url.trim().length > 0

  const updateRequest = (field: keyof SelectorHelpRequest, value: string) => {
    setRequest((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!canSubmit || status === 'submitting') {
      return
    }

    setStatus('submitting')
    await onSubmit(request)
    setStatus('submitted')
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="selectorHelpRequestTitle"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="selectorHelpRequestTitle">개발자에게 요청하기</h2>
          <button className="modal-close-button" type="button" aria-label="요청 창 닫기" onClick={onClose}>
            <X size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </header>

        <p>
          Selector 설정이 어려운 경우 공지 사이트 정보를 남겨주세요.
        </p>

        <label htmlFor="requestEmail">응답받을 이메일</label>
        <input
          id="requestEmail"
          type="email"
          value={request.email}
          placeholder="example@email.com"
          onChange={(event) => updateRequest('email', event.target.value)}
        />

        <label htmlFor="requestSiteName">요청 사이트 제목</label>
        <input
          id="requestSiteName"
          value={request.siteName}
          placeholder="예: 경북대학교 컴퓨터학부"
          onChange={(event) => updateRequest('siteName', event.target.value)}
        />

        <label htmlFor="requestUrl">공지 사이트 URL</label>
        <input
          id="requestUrl"
          value={request.url}
          placeholder="https://example.ac.kr/notice"
          onChange={(event) => updateRequest('url', event.target.value)}
        />

        {status === 'submitted' && (
          <p className="request-success">
            요청이 접수되었습니다. 이메일 안내 기능은 실제 서비스 연동 시 제공됩니다.
          </p>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={!canSubmit || status === 'submitting'}
            onClick={handleSubmit}
          >
            {status === 'submitting' ? '요청 중...' : '요청하기'}
          </button>
        </div>
      </section>
    </div>
  )
}
