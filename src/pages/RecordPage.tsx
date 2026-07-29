import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { resolveImageUrl } from '../api/client.ts'
import { createRecord, getTodayRecord } from '../api/records.ts'
import type { RecordData } from '../api/records.ts'
import Layout from '../components/Layout.tsx'

const MEMO_MAX_LENGTH = 60

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
      <Layout title="기록 작성">
        <p className="text-sm text-muted">확인 중...</p>
      </Layout>
    )
  }

  if (existingRecord) {
    return (
      <Layout title="기록 작성">
        <p className="mb-4 rounded-2xl bg-done-bg px-[18px] py-3 text-center text-sm text-done">
          오늘은 이미 기록을 남겼어요
        </p>
        <section className="rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <img
            alt="오늘의 기록"
            className="w-full rounded-xl border border-border object-cover"
            src={resolveImageUrl(existingRecord.imageUrl)}
          />
          <p className="mt-3 text-sm text-heading">{existingRecord.memo}</p>
        </section>
      </Layout>
    )
  }

  return (
    <Layout title="기록 작성">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="photo">
            사진
          </label>
          <div className="rounded-[14px] border-[1.5px] border-dashed border-border bg-card p-4 text-center text-[13px] text-muted">
            오늘의 챌린지 사진을 올려주세요
            <input
              accept="image/*"
              className="mx-auto mt-2.5 block text-[13px] text-muted"
              id="photo"
              onChange={handleImageChange}
              required
              type="file"
            />
          </div>
          {previewUrl && (
            <img
              alt="미리보기"
              className="mt-3 w-full rounded-xl border border-border object-cover"
              src={previewUrl}
            />
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="memo">
            한 줄 메모
          </label>
          <textarea
            className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="memo"
            maxLength={MEMO_MAX_LENGTH}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘의 순간을 한 줄로 남겨보세요"
            required
            rows={2}
          />
          <p className="mt-1 text-right text-xs text-muted">
            {memo.length} / {MEMO_MAX_LENGTH}
          </p>
        </div>

        {error && <p className="text-sm text-accent">{error}</p>}

        <button
          className="w-full rounded-full bg-accent px-5 py-[13px] text-[15px] font-semibold text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          기록 완료하기
        </button>
      </form>
    </Layout>
  )
}

export default RecordPage
