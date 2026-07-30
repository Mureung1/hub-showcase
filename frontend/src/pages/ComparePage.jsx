import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeListing } from '../utils/analysisApi'
import { loadKakaoMapSdk } from '../utils/kakaoMapLoader'
import { createComparisonAnalysisRequest, loadCurrentUserInfo } from '../utils/compareUtils'

const scoreCategories = [
  ['area', '면적'],
  ['cost', '비용'],
  ['living', '환경'],
  ['preference', '우선'],
  ['safety', '신뢰'],
  ['transport', '통학'],
]

function formatWon(value) {
  return typeof value === 'number' ? `${Math.round(value).toLocaleString()}원` : '확인 필요'
}

function formatScore(value) {
  return typeof value === 'number' ? `${value}점` : '확인 필요'
}

function parseManwon(value) {
  const text = String(value || '').replace(/,/g, '').trim()
  const match = text.match(/[0-9.]+/)
  if (!match) {
    return null
  }

  const numberValue = Number(match[0])
  if (!Number.isFinite(numberValue)) {
    return null
  }

  return text.includes('원') && !text.includes('만원') ? numberValue / 10000 : numberValue
}

function getRouteKey(route, index = 0) {
  return route?.id || `${route?.mode || 'route'}-${index}`
}

function getListingTitle(item, fallback) {
  return item.analysisRequest?.listingInfo?.fields?.address
    || item.analysisRequest?.listingSummary?.address
    || fallback
}

function getListingPrice(item) {
  const fields = item.analysisRequest?.listingInfo?.fields || {}
  return [
    fields.deposit ? `보증금 ${fields.deposit}` : '',
    fields.monthlyRent ? `월세 ${fields.monthlyRent}` : '',
    fields.maintenanceFee ? `관리비 ${fields.maintenanceFee}` : '',
  ].filter(Boolean).join(' / ') || '가격 정보 확인 필요'
}

function getSelectedRoute(item, analysis) {
  const routes = analysis?.travelContext?.routes || []
  return routes.find((route, index) => getRouteKey(route, index) === item.selectedRouteKey)
    || routes.find((route) => route.mode === item.selectedRouteMode)
    || routes[0]
    || null
}

function createMonthlyCommuteCost(route, userInfo) {
  if (!route || typeof route.fareWon !== 'number') {
    return 0
  }

  const days = Number(userInfo?.commuteDaysPerWeek)
  return Number.isFinite(days) && days > 0 ? Math.round(route.fareWon * 2 * days * 4.345) : 0
}

function createCostMetrics(item, analysis, userInfo) {
  const fields = item.analysisRequest?.listingInfo?.fields || {}
  const rent = parseManwon(fields.monthlyRent)
  const maintenance = parseManwon(fields.maintenanceFee)
  const rentWon = rent === null ? null : rent * 10000
  const maintenanceWon = maintenance === null ? null : maintenance * 10000
  const commuteWon = createMonthlyCommuteCost(getSelectedRoute(item, analysis), userInfo)
  const hasUnknownHousingCost = rentWon === null || maintenanceWon === null

  return {
    rentWon,
    maintenanceWon,
    commuteWon,
    totalWon: hasUnknownHousingCost ? null : rentWon + maintenanceWon + commuteWon,
  }
}

function createPreferenceLabels(userInfo) {
  return [
    ...(userInfo?.housingTypes || []),
    ...(userInfo?.priorities || []),
    ...(userInfo?.avoidConditions || []).map((value) => `피함: ${value}`),
    ...(userInfo?.transportation || []),
    userInfo?.maxTravelTime ? `${userInfo.maxTravelTime}분 이내` : '',
  ].filter(Boolean)
}

function getPreferenceStatus(label, analysis, item, userInfo) {
  const fields = item.analysisRequest?.listingInfo?.fields || {}
  const contextText = [
    fields.listingType,
    fields.roomStructure,
    fields.duplexType,
    fields.direction,
    fields.options,
    fields.features,
    analysis?.priceAnalysis,
    analysis?.commuteAnalysis,
    analysis?.convenienceAnalysis,
    analysis?.reliabilityAnalysis,
    analysis?.summary,
  ].filter(Boolean).join(' ')

  if (label.startsWith('피함: ')) {
    const avoidLabel = label.replace('피함: ', '')
    return contextText.includes(avoidLabel) ? 'bad' : 'good'
  }

  if (label === `${userInfo?.maxTravelTime}분 이내`) {
    const route = getSelectedRoute(item, analysis)
    if (!route || typeof route.durationMinutes !== 'number') {
      return 'unknown'
    }
    return route.durationMinutes <= Number(userInfo.maxTravelTime) ? 'good' : 'bad'
  }

  if ((userInfo?.transportation || []).includes(label)) {
    return analysis?.travelContext?.routes?.some((route) => route.mode === label) ? 'good' : 'unknown'
  }

  return contextText.includes(label) ? 'good' : 'unknown'
}

function CompareMap({ items }) {
  const mapRef = useRef(null)
  const [message, setMessage] = useState('')
  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY
  const mappableItems = useMemo(() => items.filter((item) => {
    const location = item.analysis?.travelContext?.listingLocation
    return Number.isFinite(Number(location?.x)) && Number.isFinite(Number(location?.y))
  }), [items])

  useEffect(() => {
    if (!mappableItems.length) {
      setMessage('지도에 표시할 좌표가 없습니다.')
      return undefined
    }

    let isMounted = true

    async function renderMap() {
      setMessage('지도를 불러오고 있습니다.')

      try {
        const kakao = await loadKakaoMapSdk(appKey)
        if (!isMounted || !mapRef.current) {
          return
        }

        const firstLocation = mappableItems[0].analysis.travelContext.listingLocation
        const center = new kakao.maps.LatLng(Number(firstLocation.y), Number(firstLocation.x))
        const map = new kakao.maps.Map(mapRef.current, { center, level: 5 })
        const bounds = new kakao.maps.LatLngBounds()

        mappableItems.forEach((item, index) => {
          const location = item.analysis.travelContext.listingLocation
          const position = new kakao.maps.LatLng(Number(location.y), Number(location.x))
          bounds.extend(position)
          new kakao.maps.Marker({
            map,
            position,
            title: getListingTitle(item, `매물 ${index + 1}`),
          })
        })

        map.setBounds(bounds)
        window.setTimeout(() => {
          if (!isMounted) {
            return
          }
          map.relayout()
          map.setBounds(bounds)
          setMessage('')
        }, 120)
      } catch (error) {
        if (isMounted) {
          setMessage(error.message)
        }
      }
    }

    renderMap()

    return () => {
      isMounted = false
    }
  }, [appKey, mappableItems])

  return (
    <section className="compare-map-card dashboard-card" aria-labelledby="compare-map-title">
      <h2 id="compare-map-title">지도</h2>
      <div className="compare-map" ref={mapRef} aria-label="비교 매물 위치 지도" />
      {message && <p className="helper-text">{message}</p>}
    </section>
  )
}

function CompareRadarChart({ analyses }) {
  const center = 120
  const radius = 74

  function createPoints(scores) {
    return scoreCategories.map(([key], index) => {
      const score = Math.max(0, Math.min(Number(scores?.[key]) || 0, 100))
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / scoreCategories.length
      return `${center + Math.cos(angle) * radius * (score / 100)},${center + Math.sin(angle) * radius * (score / 100)}`
    }).join(' ')
  }

  return (
    <section className="compare-radar-card dashboard-card" aria-labelledby="compare-radar-title">
      <h2 id="compare-radar-title">항목별 점수</h2>
      <svg aria-label="매물 1과 매물 2의 항목별 점수 비교 차트" role="img" viewBox="0 0 240 240">
        {[0.33, 0.66, 1].map((scale) => (
          <polygon
            fill="none"
            key={scale}
            points={scoreCategories.map((category, index) => {
              void category
              const angle = -Math.PI / 2 + (Math.PI * 2 * index) / scoreCategories.length
              return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`
            }).join(' ')}
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        ))}
        {scoreCategories.map(([, label], index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / scoreCategories.length
          return (
            <text
              fill="var(--color-text-secondary)"
              fontSize="12"
              key={label}
              textAnchor="middle"
              x={center + Math.cos(angle) * (radius + 26)}
              y={center + Math.sin(angle) * (radius + 26) + 3}
            >
              {label}
            </text>
          )
        })}
        <polygon fill="var(--color-success-soft)" fillOpacity="0.55" points={createPoints(analyses[0]?.categoryScores)} stroke="var(--color-success)" strokeWidth="3" />
        <polygon fill="var(--color-primary-soft)" fillOpacity="0.6" points={createPoints(analyses[1]?.categoryScores)} stroke="var(--color-primary)" strokeWidth="3" />
      </svg>
      <div className="compare-legend">
        <span><i className="listing-one" />매물 1</span>
        <span><i className="listing-two" />매물 2</span>
      </div>
    </section>
  )
}

function getDirectionKey(direction) {
  const text = String(direction || '')
  if (text.includes('남')) {
    return 'south'
  }
  if (text.includes('동')) {
    return 'east'
  }
  if (text.includes('서')) {
    return 'west'
  }
  if (text.includes('북')) {
    return 'north'
  }
  return 'unknown'
}

function ScoreRows({ analyses }) {
  return (
    <section className="compare-score-list dashboard-card" aria-labelledby="compare-score-title">
      <h2 id="compare-score-title">상세항목점수 나열</h2>
      <div className="compare-score-rows">
        {scoreCategories.map(([key, label]) => (
          <div className="compare-score-row" key={key}>
            <strong>{formatScore(analyses[0]?.categoryScores?.[key])}</strong>
            <span>{label}</span>
            <strong>{formatScore(analyses[1]?.categoryScores?.[key])}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function CostCompareSection({ compareItems, userInfo }) {
  const costs = compareItems.map((item) => createCostMetrics(item.savedItem, item.analysis, userInfo))
  const rows = [
    ['rentWon', '월세'],
    ['maintenanceWon', '관리비'],
    ['commuteWon', '교통비'],
    ['totalWon', '월 예상 총액'],
  ]

  return (
    <section className="compare-section dashboard-card" aria-labelledby="compare-cost-title">
      <h2 id="compare-cost-title">비용</h2>
      <div className="compare-bars">
        {rows.map(([key, label]) => {
          const leftValue = costs[0][key]
          const rightValue = costs[1][key]
          const leftWidthValue = typeof leftValue === 'number' ? leftValue : 0
          const rightWidthValue = typeof rightValue === 'number' ? rightValue : 0
          const maxValue = Math.max(leftWidthValue, rightWidthValue, 1)
          return (
            <div className="compare-cost-row" key={key}>
              <strong>{formatWon(leftValue)}</strong>
              <div>
                <span>{label}</span>
                <div className="compare-cost-track">
                  <i className="left" style={{ width: `${leftWidthValue > 0 ? Math.max(4, (leftWidthValue / maxValue) * 50) : 0}%` }} />
                  <i className="right" style={{ width: `${rightWidthValue > 0 ? Math.max(4, (rightWidthValue / maxValue) * 50) : 0}%` }} />
                </div>
              </div>
              <strong>{formatWon(rightValue)}</strong>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DirectionCompareSection({ compareItems }) {
  return (
    <section className="compare-section dashboard-card" aria-labelledby="compare-direction-title">
      <h2 id="compare-direction-title">방향</h2>
      <div className="compare-direction-grid">
        {compareItems.map((item, index) => {
          const direction = item.savedItem.analysisRequest?.listingInfo?.fields?.direction || '확인 필요'
          return (
            <div className="compare-direction-item" key={item.savedItem.id}>
              <span>매물 {index + 1}</span>
              <div className={`compare-direction-compass ${getDirectionKey(direction)}`} aria-hidden="true">
                <i />
              </div>
              <strong>{direction}</strong>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function PreferenceCompareSection({ compareItems, userInfo }) {
  const labels = createPreferenceLabels(userInfo)

  return (
    <section className="compare-section dashboard-card" aria-labelledby="compare-preference-title">
      <h2 id="compare-preference-title">사용자 우선항목들</h2>
      {labels.length > 0 ? (
        <div className="compare-preference-list">
          {labels.map((label) => {
            const leftStatus = getPreferenceStatus(label, compareItems[0].analysis, compareItems[0].savedItem, userInfo)
            const rightStatus = getPreferenceStatus(label, compareItems[1].analysis, compareItems[1].savedItem, userInfo)
            return (
              <div className="compare-preference-row" key={label}>
                <strong className={leftStatus}>{leftStatus === 'good' ? 'O' : leftStatus === 'bad' ? 'X' : '!'}</strong>
                <span>{label}</span>
                <strong className={rightStatus}>{rightStatus === 'good' ? 'O' : rightStatus === 'bad' ? 'X' : '!'}</strong>
              </div>
            )
          })}
        </div>
      ) : (
        <p>선택한 우선사항이 없습니다.</p>
      )}
    </section>
  )
}

function createSavedCompareItems(savedItems) {
  return savedItems.map((savedItem) => ({
    savedItem,
    analysis: savedItem.analysis,
    analysisRequest: savedItem.analysisRequest,
  }))
}

function ComparePage({ hasUserInfoMismatch = false, onBackToHome, savedItems, useCurrentUserInfo }) {
  const baseCompareItems = useMemo(() => createSavedCompareItems(savedItems), [savedItems])
  const [reanalyzedItems, setReanalyzedItems] = useState(null)
  const compareItems = reanalyzedItems || baseCompareItems
  const [isAnalyzing, setIsAnalyzing] = useState(useCurrentUserInfo)
  const [error, setError] = useState('')
  const currentUserInfo = useMemo(() => loadCurrentUserInfo(), [])
  const isSavedCriteriaFallback = Boolean(error && useCurrentUserInfo)
  const displayUserInfo = useCurrentUserInfo && !isSavedCriteriaFallback
    ? currentUserInfo
    : compareItems[0]?.analysisRequest?.userInfo

  useEffect(() => {
    setReanalyzedItems(null)
  }, [baseCompareItems])

  useEffect(() => {
    if (!useCurrentUserInfo) {
      setIsAnalyzing(false)
      setError('')
      return undefined
    }

    let isMounted = true

    async function analyzeCurrentCriteria() {
      setReanalyzedItems(null)
      setIsAnalyzing(true)
      setError('')

      try {
        const nextItems = await Promise.all(savedItems.map(async (savedItem) => {
          const request = createComparisonAnalysisRequest(savedItem, currentUserInfo)
          const analysis = await analyzeListing(request)
          return {
            savedItem,
            analysis,
            analysisRequest: request,
          }
        }))

        if (isMounted) {
          setReanalyzedItems(nextItems)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message || '현재 사용자 정보 기준 재분석에 실패했습니다.')
        }
      } finally {
        if (isMounted) {
          setIsAnalyzing(false)
        }
      }
    }

    analyzeCurrentCriteria()

    return () => {
      isMounted = false
    }
  }, [currentUserInfo, savedItems, useCurrentUserInfo])

  if (savedItems.length !== 2 || compareItems.length !== 2) {
    return (
      <main className="user-info-page compare-page">
        <section className="compare-shell">
          <section className="dashboard-card">
            <h1>비교할 매물을 다시 선택해주세요</h1>
            <button className="primary-button" type="button" onClick={onBackToHome}>홈으로</button>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="user-info-page compare-page">
      <section className="compare-shell" aria-labelledby="compare-title">
        <header className="compare-header">
          <p className="brand-name">집토끼</p>
          <div>
            <div className="compare-title-row">
              <h1 id="compare-title">매물 비교</h1>
              <pre className="compare-title-ascii" aria-hidden="true">
{`  (\\__/)
（｀•.• )づ__/)
（つ　 /( •.•   )
  しーＪ (nnノ)`}
              </pre>
            </div>
            <p>
              {useCurrentUserInfo && !isSavedCriteriaFallback
                ? '현재 사용자 정보 기준으로 비교합니다.'
                : '저장 당시 분석 기준으로 비교합니다.'}
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={onBackToHome}>홈으로</button>
        </header>

        <div className="compare-listing-heads">
          {compareItems.map((item, index) => (
            <section className="compare-listing-head" key={item.savedItem.id}>
              <span>매물 {index + 1}</span>
              <h2>{getListingTitle(item.savedItem, `매물 ${index + 1}`)}</h2>
              <p>{getListingPrice(item.savedItem)}</p>
              <strong>{formatScore(item.analysis?.overallScore)}</strong>
            </section>
          ))}
        </div>

        {isAnalyzing && (
          <section className="analysis-loading-panel" role="status" aria-live="polite">
            <div className="loading-spinner" aria-hidden="true" />
            <div>
              <h3>현재 사용자 정보 기준으로 다시 분석 중</h3>
              <p>두 매물을 같은 판단 기준으로 비교하기 위해 재분석하고 있습니다.</p>
            </div>
          </section>
        )}

        {error && (
          <section className="analysis-error-panel" role="alert">
            <h3>재분석을 완료하지 못했습니다</h3>
            <p>{error}</p>
            <p>아래 비교는 저장 당시 분석 결과를 기준으로 표시됩니다.</p>
          </section>
        )}

        {hasUserInfoMismatch && !useCurrentUserInfo && (
          <section className="analysis-error-panel criteria-warning-panel" role="note">
            <h3>사용자 정보 기준이 다릅니다</h3>
            <p>현재 사용자 정보로 다시 분석하지 않아 저장 당시 분석 결과를 기준으로 비교합니다.</p>
          </section>
        )}

        <CompareMap items={compareItems} />
        <CompareRadarChart analyses={compareItems.map((item) => item.analysis)} />
        <ScoreRows analyses={compareItems.map((item) => item.analysis)} />
        <CostCompareSection compareItems={compareItems} userInfo={displayUserInfo} />
        <DirectionCompareSection compareItems={compareItems} />
        <PreferenceCompareSection compareItems={compareItems} userInfo={displayUserInfo} />
      </section>
    </main>
  )
}

export default ComparePage
