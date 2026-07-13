import { Link } from 'react-router-dom'

// 3 · 분석 결과 + 조건 입력
const PROFILE_STATS = [
  { k: '주 언어', v: 'JavaScript · Python' },
  { k: '최근 활동', v: '활발 · 기여 레포 8개' },
  { k: '추정 실력', v: '초급' },
  { k: '관심 영역', v: '웹 프론트엔드' },
]

const LANGUAGES = [
  { label: 'JavaScript', on: true },
  { label: 'Python', on: false },
  { label: 'TypeScript', on: false },
  { label: 'Go', on: false },
  { label: 'Java', on: false },
]

const DIFFICULTIES = [
  { label: '입문', on: false },
  { label: '쉬움', on: true },
  { label: '보통', on: false },
]

const TOPICS = [
  { label: '웹 / 프론트', on: true },
  { label: '백엔드', on: false },
  { label: '모바일', on: false },
  { label: 'AI / ML', on: false },
  { label: '데이터', on: false },
  { label: 'DevOps / 인프라', on: false },
  { label: '개발도구', on: false },
]

const CONTRIBUTION_TYPES = [
  { label: '코드', on: true },
  { label: '문서', on: true },
]

function Chip({ label, on }) {
  return <span className={on ? 'chip chip-on' : 'chip'}>{label}</span>
}

function Profile() {
  return (
    <div className="panel">
      <div className="eyebrow">분석 완료</div>
      <h1 className="hero">이런 개발자시네요</h1>

      <div className="profile-card">
        <div className="pc-handle">@sunho-kim</div>
        <div className="pc-headline">JavaScript · Python 중심의 개발자</div>
        <div className="pc-stats">
          {PROFILE_STATS.map((stat) => (
            <div className="pc-stat" key={stat.k}>
              <div className="k">{stat.k}</div>
              <div className="v">{stat.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cond-intro">
        <div className="ci-title">이 조건으로 찾아드릴게요</div>
        <div className="ci-sub">
          분석 결과에 맞춰 미리 골라뒀어요. 바꾸고 싶으면 눌러서 수정하세요.
        </div>
      </div>

      <label className="label">언어</label>
      <div className="chips">
        {LANGUAGES.map((item) => (
          <Chip key={item.label} label={item.label} on={item.on} />
        ))}
      </div>

      <label className="label">
        난이도 <span className="hint">· 초급이시라 '쉬움'을 추천해요</span>
      </label>
      <div className="chips">
        {DIFFICULTIES.map((item) => (
          <Chip key={item.label} label={item.label} on={item.on} />
        ))}
      </div>

      <label className="label">관심 분야</label>
      <div className="chips">
        {TOPICS.map((item) => (
          <Chip key={item.label} label={item.label} on={item.on} />
        ))}
      </div>

      <label className="label">
        기여 유형 <span className="hint">· 여러 개 선택 가능</span>
      </label>
      <div className="chips">
        {CONTRIBUTION_TYPES.map((item) => (
          <Chip key={item.label} label={item.label} on={item.on} />
        ))}
      </div>

      <Link to="/search" className="btn btn-primary btn-block">
        이 조건으로 이슈 찾기
      </Link>
    </div>
  )
}

export default Profile
