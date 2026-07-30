import { useEffect, useMemo, useState } from 'react'
import KakaoRouteMap from './KakaoRouteMap'

const scoreCategories = [
  ['area', '면적'],
  ['cost', '주거비용'],
  ['living', '주거환경'],
  ['preference', '우선사항'],
  ['safety', '안전/신뢰'],
  ['transport', '통학'],
]

function formatWon(value) {
  return typeof value === 'number' ? `${Math.round(value).toLocaleString()}원` : '확인 필요'
}

function formatScore(value) {
  return typeof value === 'number' ? `${value}점` : '점수 확인 필요'
}

function formatAreaValue(label, value) {
  return value ? `${label} ${value}` : `${label} 확인 필요`
}

function parseSquareMeters(value) {
  const text = String(value || '').replace(/,/g, '').trim()
  const match = text.match(/[0-9.]+/)
  if (!match) {
    return null
  }

  const numberValue = Number(match[0])
  return Number.isFinite(numberValue) ? numberValue : null
}

function createPerceivedAreaText(fields) {
  const exclusiveArea = parseSquareMeters(fields.exclusiveArea)

  if (!exclusiveArea) {
    return '체감 면적은 전용면적 정보가 확인되면 일반 교실과 비교해 다시 계산할 수 있어요.'
  }

  const classroomCount = exclusiveArea / 63
  if (classroomCount < 0.25) {
    return '전용면적 기준으로 일반 교실의 약 1/4보다 작은 크기예요.'
  }

  if (classroomCount < 0.45) {
    return '전용면적 기준으로 일반 교실의 약 1/3 크기예요.'
  }

  if (classroomCount < 0.75) {
    return '전용면적 기준으로 일반 교실의 약 절반 크기예요.'
  }

  if (classroomCount < 1.25) {
    return '전용면적 기준으로 일반 교실 1개 정도 크기예요.'
  }

  return `전용면적 기준으로 일반 교실 약 ${classroomCount.toFixed(1)}개 정도 크기예요.`
}

function createAreaChartValues(fields) {
  const supplyArea = parseSquareMeters(fields.supplyArea)
  const exclusiveArea = parseSquareMeters(fields.exclusiveArea)
  const ratio = supplyArea && exclusiveArea
    ? Math.max(18, Math.min(92, Math.round((exclusiveArea / supplyArea) * 100)))
    : 62

  return {
    supplyArea,
    exclusiveArea,
    ratio,
  }
}

function createDirectionInfo(direction) {
  const text = String(direction || '').trim()
  if (!text) {
    return {
      label: '방향 확인 필요',
      key: '',
      description: '채광과 환기는 실제 방문 때 창문 방향과 앞 건물 간격을 함께 확인해야 해요.',
    }
  }

  if (text.includes('남')) {
    return {
      label: text,
      key: 'south',
      description: '남향은 낮 시간 채광이 안정적인 편이라 자취방 선호도가 높은 방향이에요.',
    }
  }

  if (text.includes('동')) {
    return {
      label: text,
      key: 'east',
      description: '동향은 아침 햇빛이 잘 들어오고 오후에는 비교적 덜 더운 편이에요.',
    }
  }

  if (text.includes('서')) {
    return {
      label: text,
      key: 'west',
      description: '서향은 오후 햇빛이 강할 수 있어 여름 냉방 부담과 블라인드 필요성을 확인해보세요.',
    }
  }

  if (text.includes('북')) {
    return {
      label: text,
      key: 'north',
      description: '북향은 직사광선이 적어 채광이 약할 수 있으니 낮 시간 밝기를 직접 확인하는 게 좋아요.',
    }
  }

  return {
    label: text,
    key: '',
    description: '방향 표기만으로 단정하기 어려워 창문 위치, 앞 건물, 실제 채광을 함께 확인해야 해요.',
  }
}

function AreaVisual({ fields }) {
  const { supplyArea, exclusiveArea, ratio } = createAreaChartValues(fields)

  return (
    <div className="area-visual" aria-label="공급면적과 전용면적 비교">
      <div className="area-box supply">
        <span>공급면적</span>
        <div className="area-box exclusive" style={{ width: `${ratio}%`, height: `${ratio}%` }}>
          <span>전용면적</span>
        </div>
      </div>
      <dl>
        <div>
          <dt>공급</dt>
          <dd>{supplyArea ? `${supplyArea}㎡` : '확인 필요'}</dd>
        </div>
        <div>
          <dt>전용</dt>
          <dd>{exclusiveArea ? `${exclusiveArea}㎡` : '확인 필요'}</dd>
        </div>
      </dl>
    </div>
  )
}

function DirectionVisual({ direction }) {
  const info = createDirectionInfo(direction)

  return (
    <div className="direction-visual">
      <div className={`direction-compass ${info.key || 'unknown'}`} aria-hidden="true">
        <span className="north-label">북</span>
        <span className="east-label">동</span>
        <span className="south-label">남</span>
        <span className="west-label">서</span>
        <span className="direction-pointer" />
      </div>
      <div>
        <strong>{info.label}</strong>
        <p>{info.description}</p>
      </div>
    </div>
  )
}

function getScoreTone(value) {
  if (typeof value !== 'number') {
    return 'muted'
  }

  if (value >= 75) {
    return 'high'
  }

  if (value >= 40) {
    return 'middle'
  }

  return 'low'
}

function ScoreValue({ value }) {
  return (
    <p className={`detail-score-value ${getScoreTone(value)}`}>
      {formatScore(value)}
    </p>
  )
}

function parseManwon(value) {
  const text = String(value || '').replace(/,/g, '').trim()
  const match = text.match(/[0-9.]+/)
  if (!match) {
    return 0
  }

  const numberValue = Number(match[0])
  if (!Number.isFinite(numberValue)) {
    return 0
  }

  return text.includes('원') && !text.includes('만원') ? numberValue / 10000 : numberValue
}

function createSelectedCommuteCost(route, travelContext, commuteDaysPerWeek) {
  if (!route) {
    return travelContext?.commuteCostEstimate?.monthlyEstimateWon || 0
  }

  if (typeof route.fareWon === 'number') {
    const days = Number(commuteDaysPerWeek)
    if (!Number.isFinite(days) || days <= 0) {
      return 0
    }

    return Math.round(route.fareWon * 2 * days * 4.345)
  }

  if (route.mode === '대중교통') {
    return travelContext?.commuteCostEstimate?.monthlyEstimateWon || 0
  }

  return 0
}

function createCostSummary(fields, travelContext, selectedRoute, userInfo) {
  const rent = parseManwon(fields.monthlyRent)
  const maintenance = parseManwon(fields.maintenanceFee)
  const commuteWon = createSelectedCommuteCost(selectedRoute, travelContext, userInfo?.commuteDaysPerWeek)
  const housingWon = (rent + maintenance) * 10000

  return {
    totalWon: housingWon + commuteWon,
    rentWon: rent * 10000,
    maintenanceWon: maintenance * 10000,
    commuteWon,
  }
}

function createDonutSegments(costSummary) {
  const circumference = 2 * Math.PI * 42
  const items = [
    ['rentWon', '월세', 'var(--color-primary)'],
    ['maintenanceWon', '관리비', 'var(--color-warning)'],
    ['commuteWon', '교통비', 'var(--color-success)'],
  ]
  const total = items.reduce((sum, [key]) => sum + Math.max(0, costSummary[key] || 0), 0)
  let offset = 0

  return items.map(([key, label, color]) => {
    const value = Math.max(0, costSummary[key] || 0)
    const length = total > 0 ? (value / total) * circumference : 0
    const segment = {
      key,
      label,
      value,
      color,
      dasharray: `${length} ${circumference}`,
      dashoffset: -offset,
    }
    offset += length
    return segment
  })
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

function createPreferenceContext({ analysis, fields, travelContext }) {
  return [
    fields?.listingType,
    fields?.address,
    fields?.direction,
    fields?.parkingAvailable,
    fields?.roomStructure,
    fields?.duplexType,
    fields?.buildingUse,
    fields?.options,
    fields?.distanceFromSchool,
    analysis?.summary,
    analysis?.commuteAnalysis,
    analysis?.transportationCostAnalysis,
    analysis?.convenienceAnalysis,
    analysis?.reliabilityAnalysis,
    ...(analysis?.risks || []),
    ...(analysis?.checklist || []),
    ...(travelContext?.warnings || []),
  ].filter(Boolean).join(' ')
}

function createBadge(label, status) {
  const statusText = {
    satisfied: '만족',
    unmet: '불만족',
    unknown: '확인 필요',
  }[status]

  return {
    label,
    status,
    statusText,
  }
}

function evaluateHousingType(value, fields) {
  const listingType = `${fields?.listingType || ''} ${fields?.buildingUse || ''} ${fields?.options || ''}`
  if (!value || value === '상관없음') {
    return 'satisfied'
  }

  return listingType.includes(value) ? 'satisfied' : 'unknown'
}

function evaluatePriority(value, fields, contextText) {
  if (value === '채광') {
    const direction = String(fields?.direction || '')
    if (direction.includes('남') || direction.includes('동')) {
      return 'satisfied'
    }
    if (direction.includes('북')) {
      return 'unmet'
    }
    return 'unknown'
  }

  if (value === '주차') {
    const parking = String(fields?.parkingAvailable || '')
    if (includesAny(parking, ['가능', '있음', '대'])) {
      return 'satisfied'
    }
    if (includesAny(parking, ['불가', '없음'])) {
      return 'unmet'
    }
    return 'unknown'
  }

  if (value === '역세권') {
    if (includesAny(contextText, ['역세권', '역 근처', '역과 가까', '도보권', '대중교통 접근'])) {
      return 'satisfied'
    }
    if (includesAny(contextText, ['역과 멀', '대중교통 불편', '교통이 불편'])) {
      return 'unmet'
    }
    return 'unknown'
  }

  if (value === '방음') {
    if (includesAny(contextText, ['방음 양호', '방음이 좋', '조용'])) {
      return 'satisfied'
    }
    if (includesAny(contextText, ['소음', '방음 취약', '큰길 주변'])) {
      return 'unmet'
    }
    return 'unknown'
  }

  if (value === '치안') {
    if (includesAny(contextText, ['치안 양호', '안전', '밝은 길'])) {
      return 'satisfied'
    }
    if (includesAny(contextText, ['치안 확인', '유흥가', '어두운', '안전 확인'])) {
      return 'unknown'
    }
    return 'unknown'
  }

  if (value === '편의시설') {
    if (includesAny(contextText, ['편의시설', '마트', '편의점', '상권', '생활 편의'])) {
      return 'satisfied'
    }
    return 'unknown'
  }

  if (value === '엘리베이터') {
    if (includesAny(contextText, ['엘리베이터 있음', '엘리베이터 가능', '엘리베이터'])) {
      return 'satisfied'
    }
    return 'unknown'
  }

  if (value === '반려동물 가능') {
    if (includesAny(contextText, ['반려동물 가능', '펫 가능', '애완동물 가능'])) {
      return 'satisfied'
    }
    if (includesAny(contextText, ['반려동물 불가', '펫 불가', '애완동물 불가'])) {
      return 'unmet'
    }
    return 'unknown'
  }

  return 'unknown'
}

function evaluateAvoidCondition(value, fields, contextText) {
  if (value === '저층') {
    const floor = String(fields?.floor || '')
    if (/1\s*\/|1층|2\s*\/|2층/.test(floor)) {
      return 'unmet'
    }
    return floor ? 'satisfied' : 'unknown'
  }

  if (includesAny(contextText, [value])) {
    return 'unmet'
  }

  return 'unknown'
}

function evaluateTransportation(value, travelContext) {
  if (!value) {
    return 'unknown'
  }

  if (value === '자동차' || value === '자전거') {
    return 'unknown'
  }

  return travelContext?.routes?.some((route) => route.mode === value) ? 'satisfied' : 'unknown'
}

function evaluateMaxTravelTime(maxTravelTime, travelContext) {
  const maxMinutes = Number(maxTravelTime)
  const fastestRoute = Math.min(...(travelContext?.routes || []).map((route) => route.durationMinutes).filter(Number.isFinite))
  if (!Number.isFinite(maxMinutes) || !Number.isFinite(fastestRoute)) {
    return 'unknown'
  }

  return fastestRoute <= maxMinutes ? 'satisfied' : 'unmet'
}

function createPreferenceBadges({ analysis, fields, travelContext, userInfo }) {
  const contextText = createPreferenceContext({ analysis, fields, travelContext })
  const badges = [
    ...(userInfo?.housingTypes || []).map((value) => createBadge(value, evaluateHousingType(value, fields))),
    ...(userInfo?.priorities || []).map((value) => createBadge(value, evaluatePriority(value, fields, contextText))),
    ...(userInfo?.avoidConditions || []).map((value) => createBadge(`피함: ${value}`, evaluateAvoidCondition(value, fields, contextText))),
    ...(userInfo?.transportation || []).map((value) => createBadge(value, evaluateTransportation(value, travelContext))),
  ]

  if (userInfo?.maxTravelTime) {
    badges.push(createBadge(`${userInfo.maxTravelTime}분 이내`, evaluateMaxTravelTime(userInfo.maxTravelTime, travelContext)))
  }

  return badges
}

function CostBarChart({ costSummary }) {
  const items = [
    {
      key: 'rentWon',
      label: '월세',
      value: Math.max(0, costSummary.rentWon || 0),
      color: 'var(--color-primary)',
    },
    {
      key: 'maintenanceWon',
      label: '관리비',
      value: Math.max(0, costSummary.maintenanceWon || 0),
      color: 'var(--color-warning)',
    },
  ]
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="cost-bar-chart" aria-label="월세와 관리비 막대 차트">
      {items.map((item) => (
        <div className="cost-bar-row" key={item.key}>
          <div className="cost-bar-label">
            <span>{item.label}</span>
            <strong>{formatWon(item.value)}</strong>
          </div>
          <div className="cost-bar-track">
            <span
              className="cost-bar-value"
              style={{
                background: item.color,
                width: `${Math.max(4, Math.round((item.value / maxValue) * 100))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function PreferenceBadgeList({ analysis, fields, travelContext, userInfo }) {
  const badges = createPreferenceBadges({ analysis, fields, travelContext, userInfo })

  if (!badges.length) {
    return <p>선택한 우선사항이 없습니다.</p>
  }

  return (
    <div className="preference-badge-list" aria-label="사용자 선택 우선사항">
      {badges.map((badge) => (
        <span className={`preference-badge ${badge.status}`} key={`${badge.status}-${badge.label}`}>
          {badge.label}
          <small>{badge.statusText}</small>
        </span>
      ))}
    </div>
  )
}

function normalizeDecision(decision) {
  return decision === '주의' ? '조건부추천' : decision
}

function getRabbitLines(decision) {
  if (decision === '추천') {
    return ['{\\___/}', '(⸝⸝> ̫ <⸝⸝)', '/  ^  ^  \\']
  }

  if (decision === '비추천') {
    return ['(\\_/)', '( ʚ̴̶̷̆ ̯ʚ̴̶̷̆ )', '/⊃    \\']
  }

  return ['(\\_(\\', '(„• ֊ •„)', 'O  O']
}

function RabbitAscii({ decision }) {
  return (
    <pre className="rabbit-ascii" aria-hidden="true">
      {getRabbitLines(decision).join('\n')}
    </pre>
  )
}

function RadarScoreChart({ scores }) {
  const usableScores = scoreCategories.map(([key]) => Number(scores?.[key]))
  const hasScores = usableScores.every((value) => Number.isFinite(value))

  if (!hasScores) {
    return (
      <div className="radar-empty">
        <strong>항목 점수</strong>
        <span>새 분석부터 표시됩니다.</span>
      </div>
    )
  }

  const center = 110
  const radius = 68
  const points = usableScores.map((score, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / usableScores.length
    const distance = (Math.max(0, Math.min(score, 100)) / 100) * radius
    return [
      center + Math.cos(angle) * distance,
      center + Math.sin(angle) * distance,
    ]
  })
  const polygonPoints = points.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <div className="radar-chart" aria-label="항목별 레이더 점수">
      <svg aria-hidden="true" viewBox="0 0 220 220">
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
          const labelRadius = radius + 25
          return (
            <text
              fill="var(--color-text-secondary)"
              fontSize="12"
              key={label}
              textAnchor="middle"
              x={center + Math.cos(angle) * labelRadius}
              y={center + Math.sin(angle) * labelRadius + 3}
            >
              {label}
            </text>
          )
        })}
        <polygon
          fill="var(--color-primary-soft)"
          fillOpacity="0.65"
          points={polygonPoints}
          stroke="var(--color-primary)"
          strokeWidth="3"
        />
      </svg>
      <ul className="radar-score-list">
        {scoreCategories.map(([key, label]) => (
          <li key={key}>
            <span>{label}</span>
            <strong>{formatScore(scores[key])}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CostSummaryCard({ costSummary }) {
  const segments = createDonutSegments(costSummary)

  return (
    <section className="dashboard-card cost-summary-card" aria-labelledby="monthly-cost-title">
      <h3 id="monthly-cost-title">월 예상 비용</h3>
      <strong className="cost-total-value">{formatWon(costSummary.totalWon)}</strong>
      <div className="cost-breakdown-layout">
        <div className="cost-donut-chart" aria-label={`월 예상 비용 총 ${formatWon(costSummary.totalWon)}`}>
          <svg aria-hidden="true" viewBox="0 0 112 112">
            <circle cx="56" cy="56" fill="none" r="42" stroke="var(--color-border)" strokeWidth="16" />
            {segments.map((segment) => (
              segment.value > 0 && (
                <circle
                  cx="56"
                  cy="56"
                  fill="none"
                  key={segment.key}
                  r="42"
                  stroke={segment.color}
                  strokeDasharray={segment.dasharray}
                  strokeDashoffset={segment.dashoffset}
                  strokeLinecap="round"
                  strokeWidth="16"
                  transform="rotate(-90 56 56)"
                />
              )
            ))}
          </svg>
        </div>
        <dl>
          {segments.map((segment) => (
            <div key={segment.key}>
              <dt>
                <span className="cost-legend-dot" style={{ background: segment.color }} />
                {segment.label}
              </dt>
              <dd>{formatWon(segment.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function DetailCard({ children, title }) {
  return (
    <section className="dashboard-card detail-card">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function ListBlock({ items }) {
  if (!items?.length) {
    return <p>확인 필요</p>
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function getRouteKey(route, index = 0) {
  return route?.id || `${route?.mode || 'route'}-${index}`
}

function RouteMethodTabs({ routes, selectedRoute, setSelectedMode }) {
  return (
    <div className="route-mode-tabs" aria-label="통학 방법 선택">
      {routes?.map((route, index) => {
        const routeKey = getRouteKey(route, index)
        const selectedRouteKey = selectedRoute ? getRouteKey(selectedRoute, routes.indexOf(selectedRoute)) : ''

        return (
          <button
            aria-pressed={selectedRouteKey === routeKey}
            className={selectedRouteKey === routeKey ? 'route-mode-tab selected' : 'route-mode-tab'}
            key={routeKey}
            onClick={() => setSelectedMode(routeKey)}
            type="button"
          >
            {route.mode}
          </button>
        )
      })}
    </div>
  )
}

function RouteInfo({ route, travelContext, userInfo }) {
  if (!route) {
    return <p className="helper-text">계산된 통학 경로가 없습니다.</p>
  }

  const monthlyCommuteWon = createSelectedCommuteCost(route, travelContext, userInfo?.commuteDaysPerWeek)

  return (
    <div className="route-info-panel">
      <div className="route-summary-card">
        <div>
          <span>시간</span>
          <strong>약 {route.durationMinutes}분</strong>
        </div>
        <div>
          <span>거리</span>
          <strong>{route.distanceKm}km</strong>
        </div>
        <div>
          <span>편도</span>
          <strong>{typeof route.fareWon === 'number' ? formatWon(route.fareWon) : '확인 필요'}</strong>
        </div>
        <div>
          <span>환승</span>
          <strong>{route.transfers ? `${route.transfers}회` : '없음'}</strong>
        </div>
      </div>

      {route.mode === '대중교통' && route.steps?.length > 0 && (
        <ol className="route-step-list">
          {route.steps.map((step) => (
            <li key={step.id}>
              <strong>{step.guidance || step.vehicles?.join(', ') || step.type || '이동'}</strong>
              <span>
                약 {step.durationMinutes}분 · {step.distanceKm}km
                {step.vehicles?.length > 0 ? ` · ${step.vehicles.join(', ')}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}

      {monthlyCommuteWon > 0 && (
        <p className="helper-text">
          월 통학비 추정: {formatWon(monthlyCommuteWon)}
        </p>
      )}
    </div>
  )
}

function TravelDashboard({ selectedMode, setSelectedMode, travelContext, userInfo }) {
  const firstMode = travelContext?.routes?.[0] ? getRouteKey(travelContext.routes[0], 0) : ''
  const selectedRoute = travelContext?.routes?.find((route, index) => getRouteKey(route, index) === selectedMode)
    || travelContext?.routes?.find((route) => route.mode === selectedMode)
    || travelContext?.routes?.[0]

  useEffect(() => {
    const hasSelectedRoute = travelContext?.routes?.some((route, index) => (
      getRouteKey(route, index) === selectedMode || route.mode === selectedMode
    ))
    if (firstMode && !hasSelectedRoute) {
      setSelectedMode(firstMode)
    }
  }, [firstMode, selectedMode, setSelectedMode, travelContext?.routes])

  if (!travelContext) {
    return null
  }

  if (travelContext.status === 'unavailable') {
    return (
      <section className="dashboard-card travel-card">
        <h3>통학 경로</h3>
        <p>{travelContext.reason}</p>
      </section>
    )
  }

  return (
    <section className="dashboard-card travel-card">
      <div className="travel-card-header">
        <h3>통학 경로</h3>
        <RouteMethodTabs routes={travelContext.routes} selectedRoute={selectedRoute} setSelectedMode={setSelectedMode} />
      </div>
      <KakaoRouteMap route={selectedRoute} travelContext={travelContext} />
      <RouteInfo route={selectedRoute} travelContext={travelContext} userInfo={userInfo} />
    </section>
  )
}

function ScoreHero({ analysis }) {
  const decision = normalizeDecision(analysis.decision)
  const highlights = [
    analysis.priceAnalysis,
    analysis.maintenanceFeeAnalysis,
    analysis.commuteAnalysis,
  ].filter(Boolean).slice(0, 3)

  return (
    <section className="dashboard-card score-hero-card" aria-labelledby="analysis-result-title">
      <div className="score-copy">
        <p className="analysis-label">종합 점수</p>
        <div className="score-title-row">
          <h2 id="analysis-result-title">{analysis.overallScore}점</h2>
          <RabbitAscii decision={decision} />
        </div>
        <strong>{decision}</strong>
        <p>{analysis.summary}</p>
      </div>
      <RadarScoreChart scores={analysis.categoryScores} />
      <div className="score-highlight-list">
        <h3>핵심 요약</h3>
        <ListBlock items={highlights} />
      </div>
    </section>
  )
}

function AnalysisResultPanel({
  analysis,
  analysisRequest,
  initialSelectedRouteMode = '',
  onSelectedRouteModeChange,
  requestWarnings = [],
}) {
  const [selectedMode, setSelectedMode] = useState(initialSelectedRouteMode)
  const fields = analysisRequest?.listingInfo?.fields || {}
  const selectedRoute = analysis?.travelContext?.routes?.find((route, index) => getRouteKey(route, index) === selectedMode)
    || analysis?.travelContext?.routes?.find((route) => route.mode === selectedMode)
    || analysis?.travelContext?.routes?.[0]
  const warningItems = [
    ...new Set([
      ...requestWarnings,
      ...(analysis?.travelContext?.warnings || []),
    ]),
  ]
  const costSummary = useMemo(
    () => createCostSummary(
      analysisRequest?.listingInfo?.fields || {},
      analysis?.travelContext,
      selectedRoute,
      analysisRequest?.userInfo,
    ),
    [analysis?.travelContext, analysisRequest, selectedRoute],
  )

  if (!analysis) {
    return null
  }

  function handleSelectedModeChange(nextMode) {
    setSelectedMode(nextMode)
    const nextRoute = analysis?.travelContext?.routes?.find((route, index) => getRouteKey(route, index) === nextMode)
      || analysis?.travelContext?.routes?.find((route) => route.mode === nextMode)
    onSelectedRouteModeChange?.({
      key: nextMode,
      mode: nextRoute?.mode || nextMode,
    })
  }

  return (
    <section className="analysis-result-panel dashboard-result-panel" aria-labelledby="analysis-result-title">
      <div className="dashboard-top-grid">
        <TravelDashboard
          selectedMode={selectedMode}
          setSelectedMode={handleSelectedModeChange}
          travelContext={analysis.travelContext}
          userInfo={analysisRequest?.userInfo}
        />
        <CostSummaryCard costSummary={costSummary} />
      </div>

      <ScoreHero analysis={analysis} />

      {warningItems.length > 0 && (
        <section className="dashboard-card">
          <h3>확인 필요 안내</h3>
          <ListBlock items={warningItems} />
        </section>
      )}

      <a className="detail-jump-link" href="#analysis-detail-section">
        상세정보 보기
        <span aria-hidden="true" />
      </a>

      <div className="detail-card-grid" id="analysis-detail-section">
        <DetailCard title="면적">
          <AreaVisual fields={fields} />
          <p>{formatAreaValue('공급면적', fields.supplyArea)}</p>
          <p>{formatAreaValue('전용면적', fields.exclusiveArea)}</p>
          <p>{fields.areaRatio ? `전용률 ${fields.areaRatio}` : '전용률 확인 필요'}</p>
          <p>{createPerceivedAreaText(fields)}</p>
          <p>공급면적은 공용 공간을 포함한 계약상 면적이고, 전용면적은 실제로 방 안에서 사용하는 면적이에요.</p>
          <ScoreValue value={analysis.categoryScores?.area} />
        </DetailCard>

        <DetailCard title="주거비용">
          <p>{analysis.priceAnalysis}</p>
          <p>{analysis.maintenanceFeeAnalysis}</p>
          <CostBarChart costSummary={costSummary} />
          <ScoreValue value={analysis.categoryScores?.cost} />
        </DetailCard>

        <DetailCard title="주거환경">
          <DirectionVisual direction={fields.direction} />
          <p>{analysis.convenienceAnalysis}</p>
          <p>{analysis.reliabilityAnalysis}</p>
          <ScoreValue value={analysis.categoryScores?.living} />
        </DetailCard>

        <DetailCard title="우선사항 반영">
          <PreferenceBadgeList
            analysis={analysis}
            fields={fields}
            travelContext={analysis.travelContext}
            userInfo={analysisRequest.userInfo}
          />
          <p>{analysis.commuteAnalysis}</p>
          <p>{analysis.transportationCostAnalysis}</p>
          <ScoreValue value={analysis.categoryScores?.preference} />
        </DetailCard>
      </div>

      <div className="bottom-detail-grid">
        <DetailCard title="이외 특이사항">
          <ListBlock items={analysis.risks} />
        </DetailCard>
        <DetailCard title="계약 시 유의 사항">
          <ListBlock items={analysis.checklist} />
        </DetailCard>
        <DetailCard title="매물 체크리스트">
          <ListBlock items={analysis.nextQuestions} />
        </DetailCard>
      </div>
    </section>
  )
}

export default AnalysisResultPanel
