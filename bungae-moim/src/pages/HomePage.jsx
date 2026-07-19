import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import MeetingCard from '../components/MeetingCard.jsx'
import { fetchMeetings } from '../api/meetings.js'

export default function HomePage() {
  const { currentUser, isLoggedIn } = useAppState()
  const [meetings, setMeetings] = useState([])
  // 모집중인 번개모임 "개수"는 목록 조회 하나만으로는 정확히 셀 수 없다. 목록 API는
  // 한 페이지(20건)만 내려주기 때문에, 20건을 넘는 순간 화면에 보이는 개수가 실제
  // 모집중 개수보다 작아진다. 그래서 total만 필요한 별도 조회를 status=recruiting
  // 필터로 따로 받는다(items는 쓰지 않고 total만 쓴다).
  const [flashRecruitingTotal, setFlashRecruitingTotal] = useState(0)

  // 서버가 이미 지난/취소된 모임을 빼고 주므로 화면에서 다시 거르지 않는다.
  // 홈은 요약 화면이라 실패해도 빈 목록으로 조용히 두고 에러 UI는 두지 않는다
  // (모임을 실제로 찾는 경로인 목록 페이지에는 에러 UI가 있다).
  useEffect(() => {
    let cancelled = false

    Promise.all([fetchMeetings(), fetchMeetings({ type: 'flash', status: 'recruiting' })])
      .then(([recentResult, flashResult]) => {
        if (cancelled) return
        setMeetings(recentResult.items)
        setFlashRecruitingTotal(flashResult.total)
      })
      .catch(() => {
        if (cancelled) return
        setMeetings([])
        setFlashRecruitingTotal(0)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // "최근 등록된 모임"은 문구 그대로 등록순이어야 한다. 서버 목록은 start_at(임박순)으로
  // 정렬해서 오므로, 여기서 화면 문구에 맞는 정렬 기준(createdAt 내림차순)으로 다시 정렬한다.
  // startAt으로 정렬하면 "임박한 20건 중 가장 나중에 시작하는 4건"이 되어 방금 등록한
  // 모임이 안 보일 수 있다.
  const recent = [...meetings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 4)

  return (
    <>
      <Card variant="glass">
        <div className="eyebrow">번개모임 &amp; 소모임</div>
        <h1 className="section-title" style={{ fontSize: 26, textWrap: 'balance' }}>
          지금 당장, 혹은 방학 내내
          <br />
          같이할 사람을 찾아보세요
        </h1>
        <p style={{ color: 'var(--ink-mute)', fontSize: 14, lineHeight: 1.5 }}>
          {isLoggedIn ? `${currentUser.nickname}님, 오늘은 어떤 모임을 찾아볼까요?` : '즉흥적인 번개모임부터 기간을 정한 소모임까지, 근처에서 찾아보세요.'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <PillButton to="/meetings" variant="accent" block>
            모임 찾기
          </PillButton>
          <PillButton to="/meetings/new" variant="primary" block>
            모임 등록하기
          </PillButton>
        </div>
      </Card>

      <Card variant="dark">
        <div className="eyebrow">오늘의 번개</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="display-number" style={{ fontSize: 48, color: 'var(--accent-soft)' }}>
            {flashRecruitingTotal}
          </span>
          <span style={{ fontSize: 14, color: 'var(--cream-mute)' }}>개의 번개모임이 지금 모집중이에요</span>
        </div>
        <PillButton to="/meetings?type=flash" variant="ghost" size="sm">
          바로 보러가기 →
        </PillButton>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="section-title" style={{ fontSize: 18 }}>
          최근 등록된 모임
        </h2>
        <Link to="/meetings" style={{ fontSize: 12.5, color: 'var(--ink-mute)', fontWeight: 700 }}>
          전체보기
        </Link>
      </div>

      {recent.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </>
  )
}
