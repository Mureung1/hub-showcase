export default function ProcessSection() {
  return (
    <section className="process-section">
      <div className="process-bg-line">
        <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <path
            d="M 200,0 C 200,150 350,180 200,320 C 50,450 100,520 250,650 C 350,750 200,780 200,800"
            stroke="#d4ff00"
            strokeWidth="2"
            strokeDasharray="1000"
            strokeDashoffset="0"
            id="path-guide"
          />
        </svg>
      </div>

      <div className="process-container">
        <div className="process-step step-left" style={{ top: '10%' }}>
          <div className="step-num">01.</div>
          <div className="step-content">
            <h3 className="step-title">&bull; forecast</h3>
            <p className="step-desc">발매 전 한정판 스니커즈와 수집품 카드를 보고 3초 만에 업/다운 예측 투표를 진행합니다.</p>
          </div>
        </div>

        <div className="process-step step-right" style={{ top: '32%' }}>
          <div className="step-num">02.</div>
          <div className="step-content">
            <h3 className="step-title">o drop</h3>
            <p className="step-desc">금요일 오전 실제 시장에 오프라인/온라인 한정판 드롭이 개시되며 투표는 공식 잠금 처리됩니다.</p>
          </div>
        </div>

        <div className="process-step step-left" style={{ top: '55%' }}>
          <div className="step-num">03.</div>
          <div className="step-content">
            <h3 className="step-title">o market tracking</h3>
            <p className="step-desc">발매 주말 동안 KREAM, StockX 등의 실제 체결가를 크롤링하여 주말 공식 종가 데이터를 확정합니다.</p>
          </div>
        </div>

        <div className="process-step step-right" style={{ top: '78%' }}>
          <div className="step-num">04.</div>
          <div className="step-content">
            <h3 className="step-title">o reward & rank</h3>
            <p className="step-desc">예측 방향이 적중한 유저에게 스코어를 부여하고, 주간 전광판 랭커에게 경품 리워드를 순차 자동 지급합니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
