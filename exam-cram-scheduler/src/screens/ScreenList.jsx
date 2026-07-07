import { Link } from 'react-router-dom'

const screens = [
  {
    num: '01',
    path: '/screen/home',
    title: '홈 화면',
    desc: '서비스 소개와 시작하기 버튼. 처음 들어온 사용자에게 무엇을 하는 도구인지 한 줄로 설명.',
  },
  {
    num: '02',
    path: '/screen/input',
    title: '정보 입력 화면',
    desc: '자연어 입력창 + 평소 수면패턴·시험 날짜·남은 공부시간 등 파라미터 폼.',
  },
  {
    num: '03',
    path: '/screen/processing',
    title: '처리 중 화면',
    desc: '자연어 파싱 및 Two-Process Model 계산이 진행되는 동안 보여주는 상태 화면.',
  },
  {
    num: '04',
    path: '/screen/result',
    title: '결과 화면',
    desc: '시간대별 예측 각성도 그래프 + 추천 수면·카페인 스케줄 타임라인.',
  },
  {
    num: '05',
    path: '/screen/adjust',
    title: '스케줄 조정 화면',
    desc: '추천안을 보고 사용자가 슬라이더로 조건을 수동 조정, 재계산 요청.',
  },
]

export default function ScreenList() {
  return (
    <div className="page-col">
      <div className="page-header">
        <h1>화면 목록</h1>
        <p>총 5개 화면 · 자세한 흐름은 상단 "화면 흐름" 탭에서 확인</p>
      </div>
      <div className="screen-grid">
        {screens.map((s) => (
          <Link key={s.path} to={s.path} className="screen-card">
            <div className="num">{s.num}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
