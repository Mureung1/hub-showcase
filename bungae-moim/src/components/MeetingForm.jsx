import { useState } from 'react'
import Card from './Card.jsx'
import PillButton from './PillButton.jsx'
import PillTabs from './PillTabs.jsx'
import { CATEGORIES, REGIONS } from '../data/mockData.js'

const TYPE_OPTIONS = [
  { value: 'flash', label: '번개모임' },
  { value: 'small', label: '소모임' },
]

const OPEN_CHAT_PATTERN = /^https:\/\/open\.kakao\.com\//

export default function MeetingForm({ initialValues, disabled = {}, submitLabel, onSubmit }) {
  const [type, setType] = useState(initialValues.type)
  const [title, setTitle] = useState(initialValues.title)
  const [category, setCategory] = useState(initialValues.category)
  const [sido, setSido] = useState(initialValues.sido)
  const [sigungu, setSigungu] = useState(initialValues.sigungu)
  const [eupmyeondong, setEupmyeondong] = useState(initialValues.eupmyeondong)
  const [date, setDate] = useState(initialValues.date)
  const [time, setTime] = useState(initialValues.time)
  const [endDate, setEndDate] = useState(initialValues.endDate)
  const [capacity, setCapacity] = useState(initialValues.capacity)
  const [adultOnly, setAdultOnly] = useState(initialValues.adultOnly)
  const [openChatUrl, setOpenChatUrl] = useState(initialValues.openChatUrl)
  const [description, setDescription] = useState(initialValues.description)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const sigunguOptions = Object.keys(REGIONS[sido] ?? {})
  const eupmyeondongOptions = REGIONS[sido]?.[sigungu] ?? []

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title.trim()) return setError('모임 제목을 입력해주세요.')
    if (!OPEN_CHAT_PATTERN.test(openChatUrl)) return setError('오픈채팅 링크는 open.kakao.com 주소여야 해요.')
    if (type === 'flash' && (!capacity || capacity < 2)) return setError('번개모임 정원은 2명 이상이어야 해요.')

    setError('')
    setSubmitting(true)
    try {
      await onSubmit({
        type,
        title: title.trim(),
        category,
        description: description.trim(),
        regionSido: sido,
        regionSigungu: sigungu,
        regionEupmyeondong: eupmyeondong || null,
        startAt: type === 'flash' ? `${date}T${time}:00+09:00` : `${date}T00:00:00+09:00`,
        endAt: type === 'small' ? `${endDate}T00:00:00+09:00` : null,
        capacity: type === 'flash' ? Number(capacity) : null,
        adultOnly,
        openChatUrl,
      })
      // 성공 시 상위가 네비게이션한다. 실패하면 아래 catch가 에러를 표시.
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card variant="glass">
        <PillTabs
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
          ariaLabel="모임 유형"
          disabled={disabled.type}
        />
        <span className="field-hint">
          {type === 'flash'
            ? '번개모임은 정원을 채우면 자동 마감되고, 참여 신청 즉시 확정돼요.'
            : '소모임은 정원 제한 없이 모임장이 승인한 인원 모두 참여할 수 있어요.'}
        </span>

        <div className="field">
          <label htmlFor="title">모임 제목</label>
          <input
            id="title"
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 오늘 저녁 풋살 4명 모집"
            required
            /* 서버 검증(=DB 컬럼 varchar(100))과 같은 한도. 여기서 막아야 사용자가
               다 입력하고 제출한 뒤에야 거절당하는 일이 없다. */
            maxLength={100}
          />
        </div>

        <div className="field">
          <label htmlFor="category">카테고리</label>
          <select id="category" className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.filter((c) => c !== '전체').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>지역</label>
          <div className="field-row field-row--three">
            <select
              className="field-select"
              value={sido}
              onChange={(e) => {
                const nextSido = e.target.value
                setSido(nextSido)
                const firstSigungu = Object.keys(REGIONS[nextSido])[0]
                setSigungu(firstSigungu)
                setEupmyeondong('')
              }}
              aria-label="시/도"
            >
              {Object.keys(REGIONS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="field-select"
              value={sigungu}
              onChange={(e) => {
                setSigungu(e.target.value)
                setEupmyeondong('')
              }}
              aria-label="시/군/구"
            >
              {sigunguOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="field-select"
              value={eupmyeondong}
              onChange={(e) => setEupmyeondong(e.target.value)}
              aria-label="읍/면/동 (선택)"
            >
              <option value="">읍/면/동</option>
              {eupmyeondongOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {type === 'flash' ? (
          <div className="field-row">
            <div className="field">
              <label htmlFor="date">날짜</label>
              <input id="date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="time">시간</label>
              <input id="time" type="time" className="field-input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="field-row">
            <div className="field">
              <label htmlFor="startDate">시작일</label>
              <input id="startDate" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="endDate">종료일</label>
              <input
                id="endDate"
                type="date"
                className="field-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {type === 'flash' && (
          <div className="field">
            <label htmlFor="capacity">정원</label>
            <input
              id="capacity"
              type="number"
              min={2}
              max={50}
              className="field-input"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              disabled={disabled.capacity}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="openChatUrl">오픈채팅 링크</label>
          <input
            id="openChatUrl"
            className="field-input"
            value={openChatUrl}
            onChange={(e) => setOpenChatUrl(e.target.value)}
            placeholder="https://open.kakao.com/o/xxxxxxx"
          />
          <span className="field-hint">등록 시 open.kakao.com 형식인지만 간단히 확인해요.</span>
        </div>

        <div className="field">
          <label htmlFor="description">설명</label>
          <textarea
            id="description"
            className="field-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="모임에 대해 자세히 설명해주세요"
          />
        </div>

        <label className="field-check">
          <input
            type="checkbox"
            checked={adultOnly}
            onChange={(e) => setAdultOnly(e.target.checked)}
            disabled={disabled.adultOnly}
          />
          성인만 참여 가능
        </label>

        {error && <span style={{ color: 'var(--warning)', fontSize: 13 }}>{error}</span>}

        <PillButton type="submit" variant="accent" block disabled={submitting}>
          {submitting ? '처리 중…' : submitLabel}
        </PillButton>
      </Card>
    </form>
  )
}
