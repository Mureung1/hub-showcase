import { useEffect, useRef } from 'react'
import AnalysisResultPanel from '../components/listing-upload/AnalysisResultPanel'
import { useListingAnalysis } from '../hooks/useListingAnalysis'

function AnalysisPage({ analysisRequest, onBackToUpload }) {
  const hasStarted = useRef(false)
  const {
    analysis,
    error,
    isAnalyzing,
    runAnalysis,
  } = useListingAnalysis()

  useEffect(() => {
    if (hasStarted.current) {
      return
    }

    hasStarted.current = true
    runAnalysis(analysisRequest)
  }, [analysisRequest, runAnalysis])

  return (
    <main className="user-info-page">
      <section className="user-info-shell" aria-labelledby="page-title">
        <header className="app-header">
          <p className="brand-name">자취방 의사결정 도우미</p>
          <h1 id="page-title">AI 분석 결과</h1>
          <p className="page-description">
            OCR 원문과 매물 정보를 사용자 조건과 함께 분석해 의사결정에 필요한 항목을 정리합니다.
          </p>
        </header>

        <section className="form-card" aria-labelledby="analysis-page-title">
          <div className="progress-header">
            <span className="step-count">3 / 5</span>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-value" style={{ width: '60%' }} />
            </div>
          </div>

          <div className="step-heading">
            <h2 id="analysis-page-title">{isAnalyzing ? 'AI가 매물을 분석하고 있습니다' : '분석 결과를 확인해주세요'}</h2>
            <p>
              {isAnalyzing
                ? '비용, 통학, 매물 신뢰도, 계약 전 체크리스트를 구조화하고 있습니다.'
                : '결과는 참고용이며 계약 전에는 실제 매물과 계약 조건을 직접 확인해야 합니다.'}
            </p>
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

          <AnalysisResultPanel analysis={analysis} />

          {analysis && (
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={onBackToUpload}>
                매물 정보로 돌아가기
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default AnalysisPage
