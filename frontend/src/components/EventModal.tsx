import { useState, useEffect } from 'react'

interface EventModalProps {
  isOpen: boolean
  mode: 'add' | 'edit' | 'select'
  date?: Date
  endDate?: Date
  event?: any
  overlappingEvents?: any[]
  onClose: () => void
  onSelectEvent?: (event: any) => void
  onSave: (event: {
    title: string
    type: 'EXAM' | 'PART_TIME' | 'OTHER'
    dtstart: string
    dtend: string
    isAllDay?: boolean
    startTime?: string
    endTime?: string
    memo?: string
    hideFromRecommendation?: boolean
  }) => void
  onDelete?: () => void
}

export default function EventModal({ isOpen, mode, date, endDate, event, onClose, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'EXAM' | 'PART_TIME' | 'OTHER'>('EXAM')
  const [startDate, setStartDate] = useState('')
  const [endDateStr, setEndDateStr] = useState('')
  const [isAllDay, setIsAllDay] = useState(true)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [memo, setMemo] = useState('')
  const [hideFromRecommendation, setHideFromRecommendation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Date 객체를 로컬 시간 기준 YYYY-MM-DD로 변환
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    if (mode === 'edit' && event) {
      // 수정 모드: 기존 일정 정보로 폼 채우기
      setTitle(event.title || '')
      setType(event.type || 'EXAM')
      setStartDate(event.start?.split('T')[0] || '')
      setEndDateStr(event.end?.split('T')[0] || '')
      setIsAllDay(event.isAllDay ?? true)
      setStartTime(event.startTime || '09:00')
      setEndTime(event.endTime || '18:00')
      setMemo(event.memo || '')
      setHideFromRecommendation(event.hideFromRecommendation ?? false)
    } else if (mode === 'add' && date) {
      // 추가 모드: 선택된 날짜로 폼 초기화
      try {
        const startDateStr = formatLocalDate(date)
        const endDateStr = endDate ? formatLocalDate(endDate) : startDateStr

        console.log('📅 날짜 설정:', { startDateStr, endDateStr })

        setStartDate(startDateStr)
        setEndDateStr(endDateStr)
        setTitle('')
        setType('EXAM')
        setIsAllDay(true)
        setStartTime('09:00')
        setEndTime('18:00')
        setMemo('')
        setHideFromRecommendation(false)
      } catch (error) {
        console.error('날짜 형식 오류:', error)
      }
    }
  }, [mode, date, endDate, event, isOpen])

  const handleSave = async () => {
    if (!title || !startDate || !endDateStr) {
      alert('모든 필드를 입력해주세요')
      return
    }

    setIsSaving(true)
    try {
      // 시간 기반 일정 검증: 여러 날짜 선택 불가
      if (!isAllDay && startDate !== endDateStr) {
        alert('시간으로 일정을 지정할 때는 같은 날에만 만들 수 있습니다\n여러 날짜 선택 시 "하루 종일"로 변경해주세요')
        setIsSaving(false)
        return
      }

      // endTime이 startTime보다 빠르면 자동 수정
      let finalEndTime = endTime
      if (!isAllDay && startTime >= endTime) {
        finalEndTime = '23:59'
      }

      let dtstart = ''
      let dtend = ''

      if (isAllDay) {
        // all-day 이벤트: endDate를 1일 증가 (iCalendar/FullCalendar 배타적 끝 표준)
        const [year, month, day] = endDateStr.split('-').map(Number)
        const actualEndDate = new Date(year, month - 1, day + 1, 0, 0, 0)
        const endYear = actualEndDate.getFullYear()
        const endMonth = String(actualEndDate.getMonth() + 1).padStart(2, '0')
        const endDay = String(actualEndDate.getDate()).padStart(2, '0')
        const nextDateStr = `${endYear}-${endMonth}-${endDay}`

        dtstart = `${startDate}T00:00:00`
        dtend = `${nextDateStr}T00:00:00`
      } else {
        // 시간 기반 이벤트: 같은 날
        dtstart = `${startDate}T${startTime}:00`
        dtend = `${startDate}T${finalEndTime}:00`
      }

      console.log('💾 저장할 일정:', {
        title,
        type,
        startDate,
        endDateStr,
        dtstart,
        dtend,
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : finalEndTime,
      })

      onSave({
        title,
        type,
        dtstart,
        dtend,
        isAllDay,
        startTime: !isAllDay ? startTime : undefined,
        endTime: !isAllDay ? finalEndTime : undefined,
        memo: memo || undefined,
        hideFromRecommendation,
      })
    } catch (error) {
      console.error('일정 저장 실패:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  // 'select' 모드: 겹치는 일정 목록 표시
  if (mode === 'select' && overlappingEvents) {
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
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
          }}
          onClick={e => e.stopPropagation()}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '16px' }}>
            🗓️ 겹치는 일정 선택
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            수정할 일정을 선택하세요 ({overlappingEvents.length}개)
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {overlappingEvents.map((evt, idx) => (
              <button
                key={idx}
                onClick={() => onSelectEvent?.(evt)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8f9fa',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  fontSize: '13px',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.backgroundColor = '#f0f9ff'
                  ;(e.target as HTMLElement).style.borderColor = '#3b82f6'
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'
                  ;(e.target as HTMLElement).style.borderColor = '#e5e7eb'
                }}
              >
                <div style={{ fontWeight: 600, color: '#111', marginBottom: '4px' }}>
                  {evt.type === 'EXAM' && '📚'} {evt.type === 'PART_TIME' && '💼'} {evt.type === 'OTHER' && '📌'} {evt.title}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {new Date(evt.start).toLocaleDateString('ko-KR')} {evt.start !== evt.end && `~ ${new Date(evt.end).toLocaleDateString('ko-KR')}`}
                </div>
                {evt.memo && (
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    메모: {evt.memo}
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              width: '100%',
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
        </div>
      </>
    )
  }

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
          maxWidth: '550px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '20px' }}>
          {mode === 'add' ? '📅 새 일정 추가' : '✏️ 일정 수정'}
        </h2>

        {/* 제목 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            일정명 *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: 기말고사, 편의점 아르바이트"
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
            일정 유형 *
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
                {t === 'EXAM' && '📚 시험/학업'}
                {t === 'PART_TIME' && '💼 아르바이트'}
                {t === 'OTHER' && '📌 기타'}
              </button>
            ))}
          </div>
        </div>

        {/* 시작/종료 날짜 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              시작 날짜 *
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
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              종료 날짜 *
            </label>
            <input
              type="date"
              value={endDateStr}
              onChange={e => setEndDateStr(e.target.value)}
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
        </div>

        {/* 하루 종일 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
            />
            <span style={{ fontWeight: 600, color: '#111' }}>하루 종일</span>
          </label>
        </div>

        {/* 시간 선택 (하루 종일 미선택 시) */}
        {!isAllDay && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                시작 시간
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
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
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                종료 시간
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
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
          </div>
        )}

        {/* 메모 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            메모
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 전공 4과목 공부..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: '#f8f9fa',
              boxSizing: 'border-box',
              minHeight: '70px',
              resize: 'none',
              outline: 'none',
            }}
          />
        </div>

        {/* 추천 공고 숨기기 옵션 */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
        }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={hideFromRecommendation}
              onChange={(e) => setHideFromRecommendation(e.target.checked)}
              style={{ marginTop: '2px' }}
            />
            <div>
              <span style={{ fontWeight: 600, color: '#111' }}>이 기간에는 캘린더 추천 공고 숨기기</span>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>
                알고리즘이 유휴 시간 분석 시 이 기간을 최우선 제외합니다
              </p>
            </div>
          </label>
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

          {mode === 'edit' && onDelete && (
            <button
              onClick={() => {
                if (confirm('이 일정을 삭제하시겠습니까?')) {
                  onDelete()
                }
              }}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#ef4444',
                color: '#fff',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              🗑️ 삭제
            </button>
          )}

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
            {isSaving ? '처리 중...' : mode === 'add' ? '저장' : '수정'}
          </button>
        </div>
      </div>
    </>
  )
}
