// 활성 분석 결과가 없는 직무를 열었을 때 쓰는 안내 카드.
// 서버가 503 NO_ACTIVE_ANALYSIS 를 내면 화면은 빈 채로 두지 않고 이 카드를 보여 준다.
// 통계·합격 전략·준비 로드맵 세 화면이 같은 문구를 쓰도록 한곳에 뒀다.
function AnalysisNotice({ jobName, onBack }) {
  return (
    <section className="notice-card" role="status">
      <span className="badge">준비 중인 직무</span>
      <h2>이 직무는 아직 분석 결과가 준비되지 않았습니다</h2>
      <p>
        {jobName ? <strong>{jobName}</strong> : '선택한 직무'} 의 채용공고 분석은 아직 활성 버전이 없습니다.
        분석이 끝난 직무를 먼저 살펴보시고, 이 직무는 결과가 올라온 뒤 다시 확인해 주세요.
      </p>
      <button type="button" className="btn btn-primary" onClick={onBack}>
        ← 직무 다시 선택
      </button>
    </section>
  )
}

export default AnalysisNotice
