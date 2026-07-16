import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import PillTabs from '../components/PillTabs.jsx'
import { CATEGORIES, REGIONS } from '../data/mockData.js'
import { createMeeting } from '../api/meetings.js'

const TYPE_OPTIONS = [
  { value: 'flash', label: '번개모임' },
  { value: 'small', label: '소모임' },
]

const OPEN_CHAT_PATTERN = /^https:\/\/open\.kakao\.com\//

// 기본 날짜는 미래로 둔다. 과거 날짜로 등록하면 목록의 '지난 모임 제외' 필터에 걸려
// 방금 만든 모임이 목록에 안 보이기 때문이다.
function futureDateStr(daysAhead) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

export default function MeetingCreatePage() {
  const { isLoggedIn } = useAppState()
  const navigate = useNavigate()

  const [type, setType] = useState('flash')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[1])
  const [sido, setSido] = useState(Object.keys(REGIONS)[0])
  const [sigungu, setSigungu] = useState(Object.keys(REGIONS[Object.keys(REGIONS)[0]])[0])
  const [eupmyeondong, setEupmyeondong] = useState('')
  const [date, setDate] = useState(() => futureDateStr(1))
  const [time, setTime] = useState('19:00')
  const [endDate, setEndDate] = useState(() => futureDateStr(60))
  const [capacity, setCapacity] = useState(4)
  const [adultOnly, setAdultOnly] = useState(false)
  const [openChatUrl, setOpenChatUrl] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const sigunguOptions = Object.keys(REGIONS[sido] ?? {})
  const eupmyeondongOptions = REGIONS[sido]?.[sigungu] ?? []

  if (!isLoggedIn) {
    return (
      <>
        <PageHeader title="모임 등록" back />
        <Card variant="dark">
          <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>모임을 등록하려면 먼저 로그인해주세요.</p>
          <PillButton to="/login" variant="accent" block>
            로그인하러 가기
          </PillButton>
        </Card>
      </>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title.trim()) return setError('모임 제목을 입력해주세요.')
    if (!OPEN_CHAT_PATTERN.test(openChatUrl)) return setError('오픈채팅 링크는 open.kakao.com 주소여야 해요.')
    if (type === 'flash' && (!capacity || capacity < 2)) return setError('번개모임 정원은 2명 이상이어야 해요.')

    setError('')
    setSubmitting(true)

    try {
      await createMeeting({
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

      // 등록 성공 → 목록으로. 목록에서 방금 만든 모임이 바로 조회되는지 확인하는 흐름.
      navigate('/meetings')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title="모임 등록" eyebrow="새 모임 만들기" back />

      <form onSubmit={handleSubmit}>
        <Card variant="glass">
          <PillTabs options={TYPE_OPTIONS} value={type} onChange={setType} ariaLabel="모임 유형" />
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
            <input type="checkbox" checked={adultOnly} onChange={(e) => setAdultOnly(e.target.checked)} />
            성인만 참여 가능
          </label>

          {error && <span style={{ color: 'var(--warning)', fontSize: 13 }}>{error}</span>}

          <PillButton type="submit" variant="accent" block disabled={submitting}>
            {submitting ? '등록 중…' : '모임 등록하기'}
          </PillButton>
        </Card>
      </form>
    </>
  )
}
