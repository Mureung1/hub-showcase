import parkingFullLot from '../assets/parking-full-lot.png';

const mainFeatures = [
  {
    icon: 'P',
    title: '공공주차장 위치 정보 제공',
  },
  {
    icon: '24',
    title: '실시간 주차 가능 대수 확인',
  },
  {
    icon: '₩',
    title: '요금, 운영시간, 주소 정보 제공',
  },
  {
    icon: '구',
    title: '지역별 주차장 탐색',
  },
];

const expansionFeatures = [
  '지도 기반 주차장 검색',
  '즐겨찾기 주차장 저장',
  '주차장 혼잡도 표시',
  '현재 위치 기반 주변 주차장 추천',
  '전국 주요 광역시 주차장 정보 확대',
];

function ChaSeWarInfo() {
  return (
    <main className="page-shell">
      <section className="intro-card" aria-labelledby="project-title">
        <div className="visual-column">
          <div className="parking-visual" aria-hidden="true">
            <img
              src={parkingFullLot}
              alt=""
              className="parking-image"
            />
          </div>
        </div>

        <div className="info-column">
          <p className="eyebrow">SEOUL PARKING INFO</p>
          <h1 id="project-title">차세워</h1>
          <p className="english-name">ChaSeWar</p>
          <p className="tagline">주차 전쟁에서 한 발 앞선 선택을 돕는 서비스</p>

          <div className="summary-row">
            <strong>주제</strong>
            <span>서울시 공공주차장 정보와 실시간 주차 가능 대수를 제공하는 서비스</span>
          </div>

          <section className="content-section" aria-labelledby="main-features-title">
            <h2 id="main-features-title">주요 기능</h2>
            <ul className="feature-list">
              {mainFeatures.map((feature) => (
                <li key={feature.title}>
                  <span className="feature-icon" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <span>{feature.title}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="content-section" aria-labelledby="expansion-features-title">
            <h2 id="expansion-features-title">확장 기능</h2>
            <ul className="expansion-list">
              {expansionFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}

export default ChaSeWarInfo;
