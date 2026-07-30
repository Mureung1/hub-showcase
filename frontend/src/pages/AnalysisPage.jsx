import { useEffect, useRef, useState } from 'react'
import AnalysisResultPanel from '../components/listing-upload/AnalysisResultPanel'
import { useListingAnalysis } from '../hooks/useListingAnalysis'

function AnalysisPage({
  initialAnalysis = null,
  initialSelectedRouteMode = '',
  initialSelectedRouteKey = '',
  isSavedDetail = false,
  onBackToHome,
  onBackToUpload,
  onSaveAnalysis,
  analysisRequest,
}) {
  const hasStarted = useRef(false)
  const [selectedRouteMode, setSelectedRouteMode] = useState(initialSelectedRouteMode)
  const [selectedRouteKey, setSelectedRouteKey] = useState(initialSelectedRouteKey || initialSelectedRouteMode)
  const [saveError, setSaveError] = useState('')
  const {
    analysis,
    error,
    isAnalyzing,
    runAnalysis,
  } = useListingAnalysis()
  const displayedAnalysis = initialAnalysis || analysis
  const canSave = Boolean(!isSavedDetail && displayedAnalysis && analysisRequest)
  const pageTitle = isAnalyzing
    ? 'AI가 매물을 분석하고 있습니다'
    : isSavedDetail
      ? '저장한 매물 분석 결과'
      : '집토끼가 매물을 분석했어요'

  useEffect(() => {
    if (initialAnalysis || hasStarted.current || !analysisRequest) {
      return
    }

    hasStarted.current = true
    runAnalysis(analysisRequest)
  }, [analysisRequest, initialAnalysis, runAnalysis])

  function handleSave() {
    if (!canSave) {
      return
    }

    try {
      onSaveAnalysis?.({
        analysis: displayedAnalysis,
        analysisRequest,
        selectedRouteMode,
        selectedRouteKey,
      })
    } catch (caughtError) {
      setSaveError(caughtError.message || '분석 결과 저장 중 오류가 발생했습니다.')
    }
  }

  if (!analysisRequest) {
    return (
      <main className="user-info-page">
        <section className="user-info-shell" aria-labelledby="page-title">
          <header className="app-header">
            <p className="brand-name">집토끼</p>
            <h1 id="page-title">분석 요청 오류</h1>
            <p className="page-description">
              분석할 매물 정보가 없어 요청을 시작하지 못했습니다.
            </p>
          </header>

          <section className="form-card">
            <div className="analysis-error-panel" role="alert">
              <h3>분석 요청 정보가 없습니다</h3>
              <p>매물 스크린샷 업로드 화면에서 매물 정보를 확인한 뒤 다시 분석해주세요.</p>
              <div className="button-row align-end">
                <button className="primary-button" type="button" onClick={onBackToUpload}>
                  매물 정보로 돌아가기
                </button>
              </div>
            </div>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="user-info-page analysis-page">
      <section className="user-info-shell analysis-shell" aria-labelledby="page-title">
        <section className="form-card analysis-dashboard-card" aria-labelledby="page-title">
          <div className="analysis-dashboard-header">
            <div className="step-heading compact-heading">
              <h1 id="page-title">{pageTitle}</h1>
            </div>
            <div className="analysis-header-actions">
              {isSavedDetail && (
                <button className="secondary-button" type="button" onClick={onBackToHome}>
                  홈으로
                </button>
              )}
              {!isSavedDetail && (
                <button className="primary-button" type="button" disabled={!canSave} onClick={handleSave}>
                  저장
                </button>
              )}
              <button className="secondary-button" type="button" onClick={onBackToUpload}>
                다른 매물 분석하기
              </button>
            </div>
          </div>

          {isAnalyzing && (
            <div className="analysis-loading-panel" role="status" aria-live="polite">
              <div className="loading-spinner" aria-hidden="true" />
              <div>
                <h3>분석 중</h3>
                <p>잠시만 기다려주세요. OCR 텍스트와 입력한 조건을 함께 검토하고 있습니다.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="analysis-error-panel" role="alert">
              <h3>분석을 완료하지 못했습니다</h3>
              <p>{error}</p>
              <div className="button-row align-end">
                <button className="secondary-button" type="button" onClick={onBackToUpload}>
                  매물 정보로 돌아가기
                </button>
                <button className="primary-button" type="button" onClick={() => runAnalysis(analysisRequest)}>
                  다시 분석하기
                </button>
              </div>
            </div>
          )}

          {saveError && (
            <div className="analysis-error-panel" role="alert">
              <h3>저장하지 못했습니다</h3>
              <p>{saveError}</p>
            </div>
          )}

          <AnalysisResultPanel
            analysis={displayedAnalysis}
            analysisRequest={analysisRequest}
            initialSelectedRouteMode={initialSelectedRouteKey || initialSelectedRouteMode}
            onSelectedRouteModeChange={(nextRoute) => {
              setSelectedRouteMode(nextRoute?.mode || '')
              setSelectedRouteKey(nextRoute?.key || nextRoute?.mode || '')
              setSaveError('')
            }}
            requestWarnings={analysisRequest.warnings}
          />
        </section>
      </section>
    </main>
  )
}

export default AnalysisPage
