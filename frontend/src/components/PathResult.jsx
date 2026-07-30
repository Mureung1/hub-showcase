function PathResult({ result, isLoading, error }) {
  if (isLoading) {
    return <div className="cert-list__status">계산 중...</div>
  }

  if (error) {
    return <div className="cert-list__status cert-list__status--error">{error}</div>
  }

  if (!result) {
    return (
      <div className="cert-list__status">
        자격증을 2개 이상 선택하고 순서를 계산해보세요.
      </div>
    )
  }

  if (result.hasCycle) {
    return (
      <div className="path-result path-result--cycle">
        <div className="path-result__cycle-title">순환 참조로 순서를 정할 수 없습니다</div>
        <div className="path-result__cycle-desc">
          아래 자격증들 사이의 선수조건이 서로 맞물려 있어요.
        </div>
        <div className="path-result__items">
          {result.stuckCertifications.map((cert) => (
            <div key={cert.id} className="path-result__item path-result__item--cycle">
              {cert.name}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="path-result">
      <div className="path-result__items">
        {result.order.map((cert, index) => (
          <div key={cert.id} className="path-result__item">
            <span className="path-result__order">{index + 1}</span>
            <span className="path-result__name">{cert.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PathResult
