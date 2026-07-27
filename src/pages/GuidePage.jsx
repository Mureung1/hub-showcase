import { useNavigate } from 'react-router-dom'

// 기능이 늘어나면서(로그인/북마크/참고링크 등) 랜딩 화면의 4단계 요약만으로는 "뭘 누르면 뭐가 나오는지"가
// 잘 안 보인다는 피드백으로 추가한 상세 안내 페이지. 개발자 관점(라우트 경로, 판정 로직 등)이 아니라
// 사용자가 실제로 화면에서 보는 것 기준으로 쉽게 풀어 쓴다 — 새 기능이 추가되면 이 문구도 같이 갱신할 것.
// 이미지(public/guide/*.png)는 실제 앱 화면을 Playwright로 캡처한 스크린샷 — 로그인이 필요한 북마크
// 화면은 캡처하지 않아서 그 섹션은 글로만 설명한다.
const GUIDE_SECTIONS = [
  {
    title: '① 조건 설정하기',
    image: '/guide/filter.png',
    items: ['원하는 직종과 인턴 여부를 골라요. 특별히 원하는 게 없으면 그냥 넘어가도 괜찮아요.'],
  },
  {
    title: '② 내 스펙 입력하기',
    image: '/guide/spec.png',
    items: [
      '학력·전공·경력·자격증·외국어 성적을 입력해요.',
      '컴퓨터활용능력은 참고용이에요 — 지원 가능 여부를 가르는 데는 쓰이지 않고, 나중에 결과에서 살짝 보여드려요.',
    ],
  },
  {
    title: '③ 결과 확인하기',
    image: '/guide/result.png',
    items: [
      '지금 지원할 수 있는 공고가 몇 %인지 한눈에 보여드려요.',
      '무엇을 보완하면 좋을지 알려주는 안내가 처음에 한 번 떠요.',
      '전체 / 지원 가능 / 부족한 공고만 나눠 보거나, 원하는 순서로 정렬할 수 있어요.',
      '공고를 누르면 어떤 부분이 충족되고 부족한지 자세히 보여줘요. 부족한 부분에는 준비할 수 있는 사이트 링크도 같이 있어요.',
      '별 모양(☆)을 누르면 관심 공고로 저장돼요. 이건 로그인 후에 쓸 수 있어요.',
    ],
  },
  {
    title: '④ 로그인하고 저장한 공고 보기',
    items: [
      '로그인은 저장 기능을 쓸 때만 필요해요. 조건 입력부터 결과 확인까지는 로그인 없이도 전부 이용할 수 있어요.',
      '저장해둔 공고는 지금 내 스펙으로 다시 계산해서 보여드려요.',
      '목록 맨 위에 어떤 걸 먼저 준비하면 좋을지 알려드리고, 눌러서 바로 관련 사이트로 갈 수 있어요.',
    ],
  },
  {
    title: '⑤ 그 밖에 알아두면 좋은 것들',
    items: [
      '화면 위쪽 단계 표시에서 이미 지나온 단계는 눌러서 다시 갈 수 있어요.',
      '"홈"은 입력한 내용을 그대로 두고 처음으로, "초기화"는 전부 지우고 새로 시작해요.',
      '로고 옆 버튼으로 밝은/어두운 화면을 바꿀 수 있어요.',
    ],
  },
]

function GuidePage() {
  const navigate = useNavigate()

  return (
    <div className="screen-wide">
      <h1>이용 방법</h1>
      <p className="sub">어떤 순서로 진행되고, 무엇을 누르면 어떤 일이 일어나는지 정리했어요.</p>

      {GUIDE_SECTIONS.map((section) => (
        <div className={`form-card guide-section${section.image ? ' has-image' : ''}`} key={section.title}>
          {section.image && (
            <img className="guide-section-image" src={section.image} alt={`${section.title} 화면 예시`} />
          )}
          <div className="guide-section-body">
            <p className="guide-section-title">{section.title}</p>
            <ul className="guide-list">
              {section.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      <div className="guide-cta">
        <button className="btn-hero" onClick={() => navigate('/filter')}>
          갭 분석 시작하기
        </button>
      </div>
    </div>
  )
}

export default GuidePage
