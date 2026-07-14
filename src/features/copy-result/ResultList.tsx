import { hasPlaceholder, isPlaceholder, splitPlaceholderText } from '../../entities/message'
import type { Candidate, ToneLevel } from '../../entities/message'

const renderCandidateText = (value: string) =>
  splitPlaceholderText(value).map((part, index) =>
    isPlaceholder(part) ? (
      <mark className="placeholder" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  )

type ResultCardProps = {
  candidate: Candidate
  copied: boolean
  copyNoticeShown: boolean
  fallbackShown: boolean
  copyFailed: boolean
  disabled: boolean
  onCopy: (candidate: Candidate) => void
  setTextRef: (toneLevel: ToneLevel, element: HTMLParagraphElement | null) => void
}

function ResultCard({
  candidate,
  copied,
  copyNoticeShown,
  fallbackShown,
  copyFailed,
  disabled,
  onCopy,
  setTextRef,
}: ResultCardProps) {
  return (
    <article className="result-card">
      <div className="result-meta">
        <span>{candidate.toneLabel}</span>
        {hasPlaceholder(candidate.text) && <em>빈칸을 채워주세요</em>}
      </div>
      <p ref={(element) => setTextRef(candidate.toneLevel, element)}>{renderCandidateText(candidate.text)}</p>
      <button disabled={disabled} onClick={() => onCopy(candidate)} type="button">
        {copied ? '복사됨 ✓' : fallbackShown ? '텍스트 선택됨' : copyFailed ? '복사 실패' : '복사'}
      </button>
      {copyNoticeShown &&
        (hasPlaceholder(candidate.text) ? (
          <p className="copy-feedback" role="status">
            복사했어요. 보내기 전에 빈칸을 채워 보내주세요.
          </p>
        ) : (
          <p className="copy-feedback sr-only" role="status">
            복사했어요.
          </p>
        ))}
      {fallbackShown && (
        <p className="copy-feedback" role="status">
          텍스트를 선택했어요. 길게 눌러 복사해주세요.
        </p>
      )}
      {copyFailed && (
        <p className="copy-feedback copy-feedback--error" role="alert">
          복사하지 못했어요. 텍스트를 길게 눌러 복사해주세요.
        </p>
      )}
    </article>
  )
}

type ResultListProps = {
  candidates: Candidate[]
  copiedTone: ToneLevel | null
  copiedNoticeTone: ToneLevel | null
  fallbackTone: ToneLevel | null
  copyFailedTone: ToneLevel | null
  disabled: boolean
  onCopy: (candidate: Candidate) => void
  setTextRef: (toneLevel: ToneLevel, element: HTMLParagraphElement | null) => void
}

function ResultList({
  candidates,
  copiedTone,
  copiedNoticeTone,
  fallbackTone,
  copyFailedTone,
  disabled,
  onCopy,
  setTextRef,
}: ResultListProps) {
  return (
    <div className="result-list">
      {candidates.map((candidate) => (
        <ResultCard
          candidate={candidate}
          copied={copiedTone === candidate.toneLevel}
          copyNoticeShown={copiedNoticeTone === candidate.toneLevel}
          copyFailed={copyFailedTone === candidate.toneLevel}
          disabled={disabled}
          fallbackShown={fallbackTone === candidate.toneLevel}
          key={candidate.toneLevel}
          onCopy={onCopy}
          setTextRef={setTextRef}
        />
      ))}
    </div>
  )
}

export default ResultList
