import './ProjectIntro.css'

const FEATURES = [
  {
    title: '대학생 주거·생계 지수',
    description:
      '대학가 원룸 월세 추이를 시각화하고, 월세를 내기 위해 필요한 최소 알바 시간을 계산합니다.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v9h13v-9" />
        <path d="M9.5 14.5h5" />
      </svg>
    ),
  },
  {
    title: '방학 리스크 시뮬레이터',
    description:
      '학기 중 대비 방학 중 유동인구 낙폭을 분석하고, 예상 고정비 입력 시 방학 기간 누적 적자를 시뮬레이션합니다.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6.5 9.5 12l3.5-3.5L20 15.5" />
        <circle cx="20" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: '업종 과포화 및 개폐업 트렌드',
    description:
      '대학가에서 생존율이 낮은 위험 업종과 새롭게 부상하는 트렌드 업종을 랭킹으로 보여줍니다.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 19v-5" />
        <path d="M12 19V8" />
        <path d="M18 19v-9" />
      </svg>
    ),
  },
]

function ProjectIntro() {
  return (
    <section className="project-intro">
      <p className="project-intro__eyebrow">
        <span className="project-intro__eyebrow-dot" aria-hidden="true" />
        대학가 상권 마이크로 데이터 분석
      </p>

      <img
        className="project-intro__mark"
        src="/favicon.svg"
        alt=""
        width="40"
        height="40"
      />

      <h1 className="project-intro__title">
        대학생 생계형 창업 &amp; 소상공인 타겟팅 가이드
      </h1>
      <p className="project-intro__lead">
        대학가 상권은{' '}
        <strong className="project-intro__highlight">
          방학이라는 연간 약 4개월의 비수기
        </strong>
        와{' '}
        <strong className="project-intro__highlight">
          대학생의 주거비·생활비 부담
        </strong>
        이 매출과 직결되는 독특한 상권입니다. 분산된 공공데이터를 대학가
        행정동 기준으로 융합해 소상공인의 창업 리스크와 대학생의 생활 부담을
        함께 진단합니다.
      </p>

      <ul className="project-intro__features">
        {FEATURES.map((feature, index) => (
          <li className="project-intro__feature-card" key={feature.title}>
            <span className="project-intro__feature-index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="project-intro__feature-icon">
              {feature.icon}
            </span>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProjectIntro
