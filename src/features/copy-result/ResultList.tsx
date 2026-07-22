import { useEffect, useRef } from 'react'
import {
  findFirstPlaceholderRange,
  hasPlaceholder,
  isPlaceholder,
  splitPlaceholderText,
} from '../../entities/message'
import type { Candidate, ToneLevel } from '../../entities/message'
import { candidateMaxLength } from '../../shared/generation'

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
  editedText: string | null
  editing: boolean
  copied: boolean
  copyNoticeShown: boolean
  fallbackShown: boolean
  copyFailed: boolean
  disabled: boolean
  editable: boolean
  onChangeText: (toneLevel: ToneLevel, text: string) => void
  onCopy: (candidate: Candidate) => void
  onRestoreText: (toneLevel: ToneLevel) => void
  onToggleEdit: (toneLevel: ToneLevel) => void
  setTextRef: (toneLevel: ToneLevel, element: HTMLElement | null) => void
}

function ResultCard({
  candidate,
  editedText,
  editing,
  copied,
  copyNoticeShown,
  fallbackShown,
  copyFailed,
  disabled,
  editable,
  onChangeText,
  onCopy,
  onRestoreText,
  onToggleEdit,
  setTextRef,
}: ResultCardProps) {
  const displayedText = editedText ?? candidate.text
  const displayedCandidate = { ...candidate, text: displayedText }
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const wasEditingRef = useRef(false)
  const toneDescriptionId = `result-tone-${candidate.toneLevel}`
  const displayedTextHasPlaceholder = hasPlaceholder(displayedText)

  useEffect(() => {
    const editOpened = editing && !wasEditingRef.current
    wasEditingRef.current = editing
    if (!editOpened || !editorRef.current) return

    editorRef.current.focus()
    const placeholderRange = findFirstPlaceholderRange(displayedText)
    if (placeholderRange) {
      editorRef.current.setSelectionRange(placeholderRange.start, placeholderRange.end)
    }
  }, [displayedText, editing])

  return (
    <article className="result-card">
      <div className="result-meta">
        <div className="result-meta-label">
          <span id={toneDescriptionId}>{candidate.toneLabel}</span>
          {displayedTextHasPlaceholder && <em>빈칸을 채워주세요</em>}
        </div>
        <div className="result-meta-actions">
          {editable && editing && (
            <button
              aria-describedby={toneDescriptionId}
              className="result-edit-restore"
              disabled={disabled}
              onClick={() => onRestoreText(candidate.toneLevel)}
              type="button"
            >
              원래 문장으로
            </button>
          )}
          {editable && (
            <button
              aria-describedby={toneDescriptionId}
              className="result-edit-toggle"
              disabled={disabled}
              onClick={() => onToggleEdit(candidate.toneLevel)}
              type="button"
            >
              {editing ? '수정 닫기' : displayedTextHasPlaceholder ? '빈칸 채우기' : '직접 수정'}
            </button>
          )}
          <button
            aria-describedby={toneDescriptionId}
            className="result-copy-button"
            disabled={disabled || displayedText.trim().length === 0}
            onClick={() => onCopy(displayedCandidate)}
            type="button"
          >
            {copied ? '복사됨 ✓' : fallbackShown ? '텍스트 선택됨' : copyFailed ? '복사 실패' : '복사'}
          </button>
        </div>
      </div>
      {editing ? (
        <textarea
          aria-label={`${candidate.toneLabel} 초안 직접 수정`}
          className="result-edit-textarea"
          disabled={disabled}
          maxLength={candidateMaxLength}
          onChange={(event) => onChangeText(candidate.toneLevel, event.target.value)}
          ref={(element) => {
            editorRef.current = element
            setTextRef(candidate.toneLevel, element)
          }}
          value={displayedText}
        />
      ) : (
        <p ref={(element) => setTextRef(candidate.toneLevel, element)}>{renderCandidateText(displayedText)}</p>
      )}
      {editing && displayedText.trim().length === 0 && (
        <p className="result-edit-error" role="alert">
          보낼 말을 입력해야 복사할 수 있어요.
        </p>
      )}
      {copyNoticeShown &&
        (displayedTextHasPlaceholder ? (
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
  editedTexts: Partial<Record<ToneLevel, string>>
  editingTones: readonly ToneLevel[]
  copiedTone: ToneLevel | null
  copiedNoticeTone: ToneLevel | null
  fallbackTone: ToneLevel | null
  copyFailedTone: ToneLevel | null
  disabled: boolean
  editable: boolean
  onChangeText: (toneLevel: ToneLevel, text: string) => void
  onCopy: (candidate: Candidate) => void
  onRestoreText: (toneLevel: ToneLevel) => void
  onToggleEdit: (toneLevel: ToneLevel) => void
  setTextRef: (toneLevel: ToneLevel, element: HTMLElement | null) => void
}

function ResultList({
  candidates,
  editedTexts,
  editingTones,
  copiedTone,
  copiedNoticeTone,
  fallbackTone,
  copyFailedTone,
  disabled,
  editable,
  onChangeText,
  onCopy,
  onRestoreText,
  onToggleEdit,
  setTextRef,
}: ResultListProps) {
  return (
    <div className="result-list">
      {candidates.map((candidate) => (
        <ResultCard
          candidate={candidate}
          editedText={editedTexts[candidate.toneLevel] ?? null}
          editing={editingTones.includes(candidate.toneLevel)}
          copied={copiedTone === candidate.toneLevel}
          copyNoticeShown={copiedNoticeTone === candidate.toneLevel}
          copyFailed={copyFailedTone === candidate.toneLevel}
          disabled={disabled}
          editable={editable}
          fallbackShown={fallbackTone === candidate.toneLevel}
          key={candidate.toneLevel}
          onChangeText={onChangeText}
          onCopy={onCopy}
          onRestoreText={onRestoreText}
          onToggleEdit={onToggleEdit}
          setTextRef={setTextRef}
        />
      ))}
    </div>
  )
}

export default ResultList
