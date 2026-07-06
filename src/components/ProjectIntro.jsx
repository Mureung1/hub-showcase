import './ProjectIntro.css'

const FEATURES = [
  {
    title: '대학생 주거·생계 지수',
    description:
      '대학가 원룸 월세 추이를 시각화하고, 월세를 내기 위해 필요한 최소 알바 시간을 계산합니다.',
  },
  {
    title: '방학 리스크 시뮬레이터',
    description:
      '학기 중 대비 방학 중 유동인구 낙폭을 분석하고, 예상 고정비 입력 시 방학 기간 누적 적자를 시뮬레이션합니다.',
  },
  {
    title: '업종 과포화 및 개폐업 트렌드',
    description:
      '대학가에서 생존율이 낮은 위험 업종과 새롭게 부상하는 트렌드 업종을 랭킹으로 보여줍니다.',
  },
]

function ProjectIntro() {
  return (
    <section className="project-intro">
      <p className="project-intro__eyebrow">대학가 상권 마이크로 데이터 분석</p>
      <h1 className="project-intro__title">
        대학생 생계형 창업 &amp; 소상공인 타겟팅 가이드
      </h1>
      <p className="project-intro__lead">
        대학가 상권은 <strong>방학이라는 연간 약 4개월의 비수기</strong>와{' '}
        <strong>대학생의 주거비·생활비 부담</strong>이 매출과 직결되는 독특한
        상권입니다. 분산된 공공데이터를 대학가 행정동 기준으로 융합해 소상공인의
        창업 리스크와 대학생의 생활 부담을 함께 진단합니다.
      </p>

      <ul className="project-intro__features">
        {FEATURES.map((feature) => (
          <li className="project-intro__feature-card" key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProjectIntro
