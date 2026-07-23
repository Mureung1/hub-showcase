import { useEffect, useRef, useState } from 'react'
import {
  emailCandidateToClipboardText,
  hasPlaceholder,
  isPlaceholder,
  splitPlaceholderText,
  type EmailCandidate,
  type ToneLevel,
} from '../../entities/message'

type EmailCopyKind = 'subject' | 'body' | 'all'

type EmailCopyTarget = {
  kind: EmailCopyKind
  toneLevel: ToneLevel
}

const copyKindLabels: Record<EmailCopyKind, string> = {
  subject: '제목',
  body: '본문',
  all: '전체 메일',
}

const copyTextFor = (candidate: EmailCandidate, kind: EmailCopyKind) => {
  if (kind === 'subject') return candidate.subject
  if (kind === 'body') return candidate.body
  return emailCandidateToClipboardText(candidate)
}

const renderEmailText = (value: string) =>
  splitPlaceholderText(value).map((part, index) =>
    isPlaceholder(part) ? (
      <mark className="placeholder" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  )

const isSameTarget = (first: EmailCopyTarget | null, second: EmailCopyTarget) =>
  first?.kind === second.kind && first.toneLevel === second.toneLevel

type EmailResultListProps = {
  candidates: EmailCandidate[]
  onCopySucceeded?: (toneLevel: ToneLevel) => void
}

function EmailResultList({ candidates, onCopySucceeded }: EmailResultListProps) {
  const [copiedTarget, setCopiedTarget] = useState<EmailCopyTarget | null>(null)
  const [copyNoticeTarget, setCopyNoticeTarget] = useState<EmailCopyTarget | null>(null)
  const [fallbackTarget, setFallbackTarget] = useState<EmailCopyTarget | null>(null)
  const [copyFailedTarget, setCopyFailedTarget] = useState<EmailCopyTarget | null>(null)
  const copySourceRefs = useRef(new Map<string, HTMLElement>())
  const copyResetTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(copyResetTimer.current), [])

  const copySourceKey = (target: EmailCopyTarget) => `${target.toneLevel}-${target.kind}`

  const setCopySourceRef = (target: EmailCopyTarget, element: HTMLElement | null) => {
    const key = copySourceKey(target)
    if (element) {
      copySourceRefs.current.set(key, element)
      return
    }
    copySourceRefs.current.delete(key)
  }

  const selectCopySource = (target: EmailCopyTarget) => {
    try {
      const source = copySourceRefs.current.get(copySourceKey(target))
      const selection = window.getSelection()
      if (!source || !selection) return false

      const range = document.createRange()
      range.selectNodeContents(source)
      selection.removeAllRanges()
      selection.addRange(range)
      return true
    } catch {
      return false
    }
  }

  const copyEmailPart = async (candidate: EmailCandidate, kind: EmailCopyKind) => {
    const target: EmailCopyTarget = { kind, toneLevel: candidate.toneLevel }

    try {
      if (!navigator.clipboard) throw new Error('Clipboard API를 사용할 수 없습니다.')
      await navigator.clipboard.writeText(copyTextFor(candidate, kind))
      window.clearTimeout(copyResetTimer.current)
      setCopiedTarget(target)
      setCopyNoticeTarget(target)
      setFallbackTarget(null)
      setCopyFailedTarget(null)
      onCopySucceeded?.(candidate.toneLevel)
      copyResetTimer.current = window.setTimeout(() => setCopiedTarget(null), 1500)
    } catch {
      setCopiedTarget(null)
      setCopyNoticeTarget(null)
      if (selectCopySource(target)) {
        setFallbackTarget(target)
        setCopyFailedTarget(null)
        return
      }
      setFallbackTarget(null)
      setCopyFailedTarget(target)
    }
  }

  return (
    <div className="email-result-list">
      {candidates.map((candidate) => {
        const candidateHasPlaceholder = hasPlaceholder(candidate.subject) || hasPlaceholder(candidate.body)
        const allCopyTarget: EmailCopyTarget = { kind: 'all', toneLevel: candidate.toneLevel }
        const isAllCopyFallback = isSameTarget(fallbackTarget, allCopyTarget)

        return (
          <article
            aria-label={`${candidate.toneLabel} 이메일 후보`}
            className="email-result-card"
            key={candidate.toneLevel}
          >
            <div className="result-meta">
              <span>{candidate.toneLabel}</span>
              {candidateHasPlaceholder && <em>빈칸을 채워주세요</em>}
            </div>

            <section className="email-result-section">
              <strong>제목</strong>
              <p ref={(element) => setCopySourceRef({ kind: 'subject', toneLevel: candidate.toneLevel }, element)}>
                {renderEmailText(candidate.subject)}
              </p>
            </section>
            <section className="email-result-section">
              <strong>본문</strong>
              <p ref={(element) => setCopySourceRef({ kind: 'body', toneLevel: candidate.toneLevel }, element)}>
                {renderEmailText(candidate.body)}
              </p>
            </section>
            <pre
              aria-hidden={isAllCopyFallback ? undefined : true}
              className={`email-copy-source${isAllCopyFallback ? ' email-copy-source--visible' : ' sr-only'}`}
              ref={(element) => setCopySourceRef(allCopyTarget, element)}
              tabIndex={isAllCopyFallback ? 0 : -1}
            >
              {copyTextFor(candidate, 'all')}
            </pre>

            <div className="email-copy-actions">
              {(['subject', 'body', 'all'] as const).map((kind) => {
                const target: EmailCopyTarget = { kind, toneLevel: candidate.toneLevel }
                const label = copyKindLabels[kind]
                const isCopied = isSameTarget(copiedTarget, target)
                const isFallback = isSameTarget(fallbackTarget, target)
                const isFailed = isSameTarget(copyFailedTarget, target)
                const actionLabel = isCopied
                  ? `${label} 복사됨 ✓`
                  : isFallback
                    ? `${label} 텍스트 선택됨`
                    : isFailed
                      ? `${label} 복사 실패`
                      : `${label} 복사`

                return (
                  <button
                    aria-label={`${candidate.toneLabel} 이메일 ${actionLabel}`}
                    key={kind}
                    onClick={() => void copyEmailPart(candidate, kind)}
                    type="button"
                  >
                    {actionLabel}
                  </button>
                )
              })}
            </div>

            {copyNoticeTarget?.toneLevel === candidate.toneLevel && (
              <p
                className={candidateHasPlaceholder ? 'copy-feedback' : 'copy-feedback sr-only'}
                role="status"
              >
                {candidateHasPlaceholder
                  ? '복사했어요. 보내기 전에 빈칸을 채워 보내주세요.'
                  : '복사했어요.'}
              </p>
            )}
            {fallbackTarget?.toneLevel === candidate.toneLevel && (
              <p className="copy-feedback" role="status">
                {fallbackTarget.kind === 'all'
                  ? '펼친 전체 메일을 선택했어요. 길게 눌러 복사해주세요.'
                  : '텍스트를 선택했어요. 길게 눌러 복사해주세요.'}
              </p>
            )}
            {copyFailedTarget?.toneLevel === candidate.toneLevel && (
              <p className="copy-feedback copy-feedback--error" role="alert">
                복사하지 못했어요. 텍스트를 길게 눌러 복사해주세요.
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}

export default EmailResultList
