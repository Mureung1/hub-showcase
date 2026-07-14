import { useState, useEffect } from 'react'

interface EventModalProps {
  isOpen: boolean
  date?: Date
  onClose: () => void
  onSave: (event: {
    title: string
    type: 'EXAM' | 'PART_TIME' | 'OTHER'
    dtstart: string
    dtend: string
  }) => void
}

export default function EventModal({ isOpen, date, onClose, onSave }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'EXAM' | 'PART_TIME' | 'OTHER'>('EXAM')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (date && !isNaN(date.getTime())) {
      try {
        const dateStr = date.toISOString().split('T')[0]
        setStartDate(dateStr)
        setEndDate(dateStr)
      } catch (error) {
        console.error('날짜 형식 오류:', error)
        setStartDate('')
        setEndDate('')
      }
    } else {
      setStartDate('')
      setEndDate('')
    }
  }, [date, isOpen])

  const handleSave = async () => {
    if (!title || !startDate || !endDate) {
      alert('모든 필드를 입력해주세요')
      return
    }

    setIsSaving(true)
    try {
      onSave({
        title,
        type,
        dtstart: `${startDate}T00:00:00`,
        dtend: `${endDate}T23:59:59`,
      })
      setTitle('')
      setType('EXAM')
      setStartDate('')
      setEndDate('')
    } catch (error) {
      console.error('일정 저장 실패:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '440px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '20px' }}>
          📅 새 일정 추가
        </h2>

        {/* 제목 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            일정명
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: 자료구조 시험, 편의점 아르바이트"
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: '#f8f9fa',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 유형 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>
            일정 유형
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['EXAM', 'PART_TIME', 'OTHER'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: type === t ? 'none' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: type === t ? '#6366f1' : '#f8f9fa',
                  color: type === t ? '#fff' : '#111',
                  fontWeight: 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {t === 'EXAM' && '📚 시험'}
                {t === 'PART_TIME' && '💼 알바'}
                {t === 'OTHER' && '📌 기타'}
              </button>
            ))}
          </div>
        </div>

        {/* 시작 날짜 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            시작 날짜
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: '#f8f9fa',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 종료 날짜 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            종료 날짜
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: '#f8f9fa',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#fff',
              color: '#111',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: isSaving ? '#d1d5db' : '#6366f1',
              color: '#fff',
              fontWeight: 500,
              fontSize: '13px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 150ms',
            }}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </>
  )
}
