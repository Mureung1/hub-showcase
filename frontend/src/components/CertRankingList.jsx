import CertRankingCard from './CertRankingCard.jsx'

function CertRankingList({ rankings, isLoading, error }) {
  return (
    <div className="cert-list">
      <div className="cert-list__heading">자격증 랭킹 · 언급률 기준</div>

      {isLoading && <div className="cert-list__status">분석 중...</div>}

      {!isLoading && error && (
        <div className="cert-list__status cert-list__status--error">{error}</div>
      )}

      {!isLoading && !error && rankings === null && (
        <div className="cert-list__status">목표 직무를 입력하고 분석을 시작해보세요.</div>
      )}

      {!isLoading && !error && rankings !== null && rankings.length === 0 && (
        <div className="cert-list__status">해당 직무에 대한 데이터를 찾을 수 없습니다.</div>
      )}

      {!isLoading && !error && rankings !== null && rankings.length > 0 && (
        <div className="cert-list__items">
          {rankings.map((item) => (
            <CertRankingCard key={item.certificationName} {...item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CertRankingList
