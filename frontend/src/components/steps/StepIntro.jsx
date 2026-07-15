// Step 0: 소개(히어로). 상태를 갖지 않고 콜백만 받는 저결합 화면 컴포넌트.
export function StepIntro({ hasCompleteResult, canClear, onStart, onResume, onClearData, onShowAnalysis }) {
  return (
    <section className="panel hero">
      <div>
        <p className="eyebrow">Study routine prototype</p>
        <p className="script-accent">Study &amp; Recover</p>
        <h1>나에게 맞는 공부·회복 루틴을 오늘 바로 찾기</h1>
        <p className="lead">
          MBTI와 공부·스트레스 설문을 함께 보고, 성향을 단정하지 않은 채 학습 선호와 피로 패턴을 행동지표로 정리합니다.
        </p>
        <div className="notice">
          MBTI는 사람을 고정적으로 판단하는 도구가 아니라 학습 선호를 탐색하는 출발점입니다. 스트레스 기능은 피로 신호와 회복 루틴을 다루는 생활관리 기능입니다.
        </div>
        <p className="hint">현재 점수와 추천은 검증된 심리검사나 진단 결과가 아니라, 설명 가능한 규칙 기반 프로토타입의 시도 제안입니다.</p>
        <div className="actions">
          <button className="primary" onClick={onStart} type="button">
            시작하기
          </button>
          {hasCompleteResult && (
            <button className="secondary" onClick={onResume} type="button">
              이전 결과 이어보기
            </button>
          )}
          {canClear && (
            <button className="secondary" onClick={onClearData} type="button">
              이 브라우저의 저장 데이터 삭제
            </button>
          )}
          <button className="secondary" onClick={onShowAnalysis} type="button">
            연구 데이터 분석 보기
          </button>
        </div>
      </div>
      <div className="hero-card">
        <p className="eyebrow">핵심 기능</p>
        <div className="mini-grid">
          <div className="mini">성향·상태 점검</div>
          <div className="mini">학습법 매칭</div>
          <div className="mini">오늘의 루틴</div>
          <div className="mini">baseline 비교</div>
        </div>
        <p>
          추천은 MBTI 유형명만으로 정하지 않습니다. 공부 성향과 스트레스 반응을 함께 반영해 추천 이유를 표시합니다.
        </p>
      </div>
    </section>
  );
}
