import { useEffect, useRef, useState } from 'react'

/* 클라이언트 검증 기준 — 4단계 서버 검증(png/jpg/pdf, 10MB)과 반드시 동일하게 유지 */
const ACCEPT_MIME = ['image/png', 'image/jpeg', 'application/pdf']
const ACCEPT_LABEL = 'PNG · JPG · PDF'
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${Math.ceil(bytes / 1024)}KB`
}

export default function FileDropzone({ file, onChange }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview(null)
  }, [file])

  function accept(candidate) {
    if (!ACCEPT_MIME.includes(candidate.type)) {
      setError('PNG, JPG, PDF 파일만 첨부할 수 있습니다.')
      return
    }
    if (candidate.size > MAX_SIZE) {
      setError('파일 크기는 10MB 이하여야 합니다.')
      return
    }
    setError('')
    onChange(candidate)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) accept(dropped)
  }

  function handlePick(e) {
    const picked = e.target.files?.[0]
    if (picked) accept(picked)
    e.target.value = '' // 같은 파일 재선택 허용
  }

  function clear() {
    setError('')
    onChange(null)
  }

  return (
    <div className="dropzone-wrap">
      {file ? (
        <div className="dropzone-file">
          {preview ? (
            <img className="dropzone-thumb" src={preview} alt="첨부 이미지 미리보기" />
          ) : (
            <span className="dropzone-thumb dropzone-thumb-pdf" aria-hidden="true">📄</span>
          )}
          <div className="dropzone-meta">
            <strong>{file.name}</strong>
            <span>{formatSize(file.size)}</span>
          </div>
          <button type="button" className="dropzone-remove" onClick={clear} aria-label="파일 제거">✕</button>
        </div>
      ) : (
        <div
          className={`dropzone${dragOver ? ' over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        >
          <span className="dropzone-icon" aria-hidden="true">📎</span>
          <p>
            파일을 끌어다 놓거나 <u>클릭해서 선택</u>
          </p>
          <span className="dropzone-hint">{ACCEPT_LABEL} · 최대 10MB (선택 사항)</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        onChange={handlePick}
        hidden
      />
      {error && <p className="dropzone-error">{error}</p>}
      {file && <p className="dropzone-hint">새로고침하면 파일 선택은 사라집니다. 업로드는 저장 단계에서 이뤄집니다.</p>}
    </div>
  )
}
