import NotificationList from './components/NotificationList'

// 확정 스키마(plan.md 7-1) 형태 mock — s2.html 4개 카드
const mockNotifications = [
  {
    id: 'n1',
    title: '2026-2학기 국가장학금 1차 신청 마감',
    summary: '7월 12일(일) 18:00 마감. 신입생도 1차 신청 대상 — 놓치면 2차는 성적 기준이 붙어요.',
    deadline: '2026-07-12 (일) 18:00',
    priority: 'urgent',
    source: '포털',
    source_category: '장학안내',
    origin_url: '',
    keywords: ['장학금'],
    done: false,
    ddayLabel: 'D-2 · 중요', // 임시 — deadline→D-day 계산은 이후 task
  },
  {
    id: 'n2',
    title: 'SW중심대학 여름 부트캠프 참가자 모집',
    summary: 'AI·로봇 트랙 포함. 학과 사무실 발신 — 선착순 마감이라 조기 종료될 수 있어요.',
    deadline: '',
    priority: 'interest',
    source: '이메일',
    source_category: '',
    origin_url: '',
    keywords: ['취업'],
    done: false,
    ddayLabel: 'D-5',
  },
  {
    id: 'n3',
    title: '2학기 수강신청 장바구니 오픈 안내',
    summary: '7월 19일(일) 10:00 오픈. 시간표 초안을 미리 짜두면 오픈 당일이 편해요.',
    deadline: '',
    priority: 'interest',
    source: '포털',
    source_category: '',
    origin_url: '',
    keywords: ['학사'],
    done: false,
    ddayLabel: 'D-9',
  },
  {
    id: 'n4',
    title: '등록금 납부 확인서 발급 안내',
    summary: '',
    deadline: '',
    priority: 'interest',
    source: '이메일',
    source_category: '',
    origin_url: '',
    keywords: [],
    done: true,
    ddayLabel: '완료 ✓',
  },
]

function App() {
  return (
    <div style={{ padding: 'var(--space-5)' }}>
      <NotificationList notifications={mockNotifications} />
    </div>
  )
}

export default App
