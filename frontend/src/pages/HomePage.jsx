import SavedListingsMap from '../components/home/SavedListingsMap'

function formatSavedAt(value) {
  if (!value) {
    return '저장 시각 확인 필요'
  }

  return new Date(value).toLocaleString('ko-KR')
}

function getListingTitle(item, index) {
  return item.analysisRequest?.listingInfo?.fields?.address
    || item.analysisRequest?.listingSummary?.address
    || `저장 매물 ${index + 1}`
}

function getListingPrice(item) {
  const fields = item.analysisRequest?.listingInfo?.fields || {}
  return [
    fields.deposit ? `보증금 ${fields.deposit}` : '',
    fields.monthlyRent ? `월세 ${fields.monthlyRent}` : '',
    fields.maintenanceFee ? `관리비 ${fields.maintenanceFee}` : '',
  ].filter(Boolean).join(' / ') || '가격 정보 확인 필요'
}

function hasMapLocation(item) {
  const location = item.analysis?.travelContext?.listingLocation
  return Number.isFinite(Number(location?.x)) && Number.isFinite(Number(location?.y))
}

function SavedListingItem({ index, isCompareMode, isSelected, item, onDelete, onOpen, onToggleCompareSelection }) {
  const decision = item.analysis?.decision || '판단 확인 필요'
  const score = typeof item.analysis?.overallScore === 'number' ? `${item.analysis.overallScore}점` : '점수 확인 필요'
  const title = getListingTitle(item, index)
  const isMappable = hasMapLocation(item)

  return (
    <article className={isSelected ? 'saved-listing-card selected-for-compare' : 'saved-listing-card'}>
      <div>
        <strong>{title}</strong>
        <p>{getListingPrice(item)}</p>
      </div>
      <dl>
        <div>
          <dt>점수</dt>
          <dd>{score}</dd>
        </div>
        <div>
          <dt>결과</dt>
          <dd>{decision}</dd>
        </div>
        <div>
          <dt>통학</dt>
          <dd>{item.selectedRouteMode || item.selectedRouteKey || '기본 경로'}</dd>
        </div>
      </dl>
      <span className={isMappable ? 'map-status available' : 'map-status unavailable'}>
        {isMappable ? '지도 표시 가능' : '지도 표시 불가'}
      </span>
      {isCompareMode && (
        <button
          aria-pressed={isSelected}
          className={isSelected ? 'compare-select-button selected' : 'compare-select-button'}
          type="button"
          onClick={() => onToggleCompareSelection(item.id)}
        >
          {isSelected ? '선택됨' : '비교 선택'}
        </button>
      )}
      <small>{formatSavedAt(item.savedAt)}</small>
      {!isCompareMode && (
        <div className="saved-listing-actions">
          <button className="secondary-button compact-action-button" type="button" onClick={() => onOpen(item.id)}>
            상세보기
          </button>
          <button
            aria-label={`저장 매물 삭제: ${title}`}
            className="danger-button compact-action-button"
            type="button"
            onClick={() => onDelete(item.id)}
          >
            삭제
          </button>
        </div>
      )}
    </article>
  )
}

function HomePage({
  compareSelectedIds = [],
  isCompareMode = false,
  onAddListing,
  onCancelCompare,
  onCompare,
  onConfirmCompare,
  onDeleteSavedAnalysis,
  onEditUserInfo,
  onOpenSavedAnalysis,
  onToggleCompareSelection,
  savedItems,
}) {
  const canCompare = savedItems.length >= 2
  const canConfirmCompare = compareSelectedIds.length === 2

  return (
    <main className="user-info-page home-page">
      <section className="home-shell" aria-labelledby="home-title">
        <header className="home-header">
          <p className="brand-name">집토끼</p>
          <div className="home-title-row">
            <h1 id="home-title">저장한 매물을 모아봤어요</h1>
            <pre className="home-title-ascii" aria-hidden="true">
{`　　∧ ∧
　 (´･ω･)
　 /　 ⌒ヽ
　(人＿＿つ_つ`}
            </pre>
          </div>
        </header>

        <SavedListingsMap savedItems={savedItems} />

        <section className="saved-listings-section" aria-labelledby="saved-listings-title">
          <h2 id="saved-listings-title">저장 매물</h2>
          {isCompareMode && (
            <p className="compare-mode-guide">비교할 매물 2개를 선택해주세요. {compareSelectedIds.length} / 2</p>
          )}
          {savedItems.length > 0 ? (
            <div className="saved-listing-list">
              {savedItems.map((item, index) => (
                <SavedListingItem
                  index={index}
                  isCompareMode={isCompareMode}
                  isSelected={compareSelectedIds.includes(item.id)}
                  item={item}
                  key={item.id}
                  onDelete={onDeleteSavedAnalysis}
                  onOpen={onOpenSavedAnalysis}
                  onToggleCompareSelection={onToggleCompareSelection}
                />
              ))}
            </div>
          ) : (
            <div className="empty-saved-list">
              <h3>저장된 매물이 없습니다</h3>
              <p>매물 스크린샷을 분석한 뒤 저장하면 이곳에서 다시 확인할 수 있습니다.</p>
            </div>
          )}
        </section>

        <div className={isCompareMode ? 'home-action-row compare-actions' : 'home-action-row'}>
          {isCompareMode ? (
            <>
              <button className="secondary-button" type="button" onClick={onCancelCompare}>
                선택 취소
              </button>
              <button className="primary-button" type="button" onClick={onConfirmCompare} disabled={!canConfirmCompare}>
                선택한 매물 비교
              </button>
              {!canConfirmCompare && (
                <p className="home-action-hint">비교할 매물 2개를 선택해주세요.</p>
              )}
            </>
          ) : (
            <>
              <button className="secondary-button" type="button" onClick={onCompare} disabled={!canCompare}>
                매물 비교하기
              </button>
              <button className="primary-button" type="button" onClick={onAddListing}>
                매물 추가
              </button>
              <button className="secondary-button" type="button" onClick={onEditUserInfo}>
                사용자 정보 수정
              </button>
              {!canCompare && (
                <p className="home-action-hint">저장 매물이 2개 이상이면 비교할 수 있습니다.</p>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default HomePage
