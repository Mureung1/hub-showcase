import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BASE_URL } from '../api/client.ts'
import { createRecord, getTodayRecord } from '../api/records.ts'
import type { RecordData } from '../api/records.ts'

const MEMO_MAX_LENGTH = 200

function RecordPage() {
  const navigate = useNavigate()
  const [existingRecord, setExistingRecord] = useState<RecordData | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getTodayRecord()
      .then((res) => setExistingRecord(res.record))
      .catch(() => setExistingRecord(null))
      .finally(() => setIsChecking(false))
  }, [])

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setImageFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!imageFile) {
      setError('사진을 선택해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      await createRecord(imageFile, memo)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '기록에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isChecking) {
    return (
      <main className="mx-auto w-full max-w-sm px-6 py-16 text-center">
        <p className="text-sm text-muted">확인 중...</p>
      </main>
    )
  }

  if (existingRecord) {
    return (
      <main className="mx-auto w-full max-w-sm px-6 py-16 text-center">
        <h1 className="text-2xl">기록 작성</h1>
        <p className="mt-4 rounded-lg bg-done-bg px-4 py-3 text-sm text-done">오늘은 이미 기록을 남겼어요</p>
        <img
          alt="오늘의 기록"
          className="mt-4 rounded-lg border border-border"
          src={`${BASE_URL}${existingRecord.imageUrl}`}
        />
        <p className="mt-2 text-sm text-muted">{existingRecord.memo}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <h1 className="text-center text-2xl">기록 작성</h1>
      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          <span>
            사진 <span className="text-accent">*</span>
          </span>
          <input accept="image/*" onChange={handleImageChange} required type="file" />
        </label>
        {previewUrl && (
          <img alt="미리보기" className="w-full rounded-lg border border-border object-cover" src={previewUrl} />
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-center justify-between">
            <span>
              한 줄 메모 <span className="text-accent">*</span>
            </span>
            <span className="text-xs text-muted">
              {memo.length}/{MEMO_MAX_LENGTH}
            </span>
          </span>
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            maxLength={MEMO_MAX_LENGTH}
            onChange={(e) => setMemo(e.target.value)}
            required
            type="text"
            value={memo}
          />
        </label>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button
          className="rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          기록하기
        </button>
      </form>
    </main>
  )
}

export default RecordPage
