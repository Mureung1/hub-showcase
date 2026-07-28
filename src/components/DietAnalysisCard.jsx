// 달력 탭 "AI 식습관 분석" 카드(PRD 4주차 3절, 5주차 §5로 개편). 버튼을 눌러야만 실행되고(자동 실행
// 금지), 같은 기간 옵션에 대한 분석은 하루 1회만 실제 호출한다 — 그래서 화면 어디에도 "다시 분석"류의
// 재실행 버튼이 없다(FR-3.3). 무효화는 날짜가 바뀌거나 기간 옵션을 바꿀 때만 자연히 일어난다.
//
// 5주차부터 응답을 findings 배열(good/warn/tip)로 받는다 — JSON 파싱에 실패하면(스키마 강제가
// 씹혔거나 모델이 규칙을 안 지킨 극히 드문 경우) 화면을 깨뜨리는 대신 원문을 문단 카드로 보여준다.
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import Skeleton from './Skeleton.jsx'
import Spinner from './Spinner.jsx'
import { getMealsByDateRange } from '../lib/dataStore.js'
import { formatAnalyzedAt, getTodayDietAnalysis, saveDietAnalysis } from '../lib/dietAnalysisCache.js'
import { buildDietSummary } from '../lib/dietSummary.js'
import { geminiCompleteWithRetry } from '../lib/gemini.js'
import { DIET_ANALYSIS_SCHEMA, GEMINI_TEMPERATURE } from '../lib/geminiSchemas.js'
import { buildDietAnalysisPrompt, parseDietAnalysisFindings } from '../lib/prompts/dietAnalysis.js'
import { toDateKey } from '../lib/records.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const PERIOD_OPTIONS = [
  { key: 7, label: '최근 7일' },
  { key: 30, label: '최근 30일' },
]

const FINDING_META = {
  good: { icon: '✅', color: colors.satisfied, surface: colors.satisfiedSurface },
  warn: { icon: '⚠️', color: colors.deficient, surface: colors.deficientSurface },
  tip: { icon: '💡', color: colors.info, surface: colors.infoSurface },
}

function addDays(date, delta) {
  const d = new Date(date)
  d.setDate(d.getDate() + delta)
  return d
}

// '2026-07-21' -> '7. 21' — PRD 예시("7. 21 ~ 7. 27 · 6일 기록 기준")와 동일한 표기.
function formatShortDate(dateKey) {
  const [, m, d] = dateKey.split('-')
  return `${Number(m)}. ${Number(d)}`
}

function FindingRow({ finding }) {
  const meta = FINDING_META[finding.type] || FINDING_META.tip
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm, padding: `${spacing.sm}px 0` }}>
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: radius.pill,
          background: meta.surface,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
        }}
      >
        {meta.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>{finding.summary}</p>
        <p style={{ margin: '2px 0 0', fontSize: font.size.xs, color: colors.textSub, lineHeight: 1.6 }}>{finding.detail}</p>
      </div>
    </div>
  )
}

export default function DietAnalysisCard() {
  const { effectiveUserId, effectiveRecommended } = useUser()
  const [periodDays, setPeriodDays] = useState(7)
  // undefined=집계 확인 중, null=기록 부족(2일 미만), object=분석 가능한 집계 요약
  const [summary, setSummary] = useState(undefined)
  const [analysis, setAnalysis] = useState(null) // 캐시됐거나 방금 만든 결과({ findings, ... })
  const [rawFallback, setRawFallback] = useState('') // findings 파싱에 끝내 실패했을 때만 채워지는 원문
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const todayKey = useMemo(() => toDateKey(new Date()), [])

  // 기간 옵션을 바꾸거나(날짜가 바뀌어 todayKey가 달라지는 경우는 재방문 시 자연히 반영) 사용자가
  // 바뀌면, 오늘자 캐시부터 확인하고(있으면 즉시 표시) 집계 요약도 다시 계산해 버튼/부족 안내를 정한다.
  // 이 useEffect는 Gemini를 호출하지 않는다 — 순수 로컬 집계일 뿐이라 비용 걱정 없이 매번 다시 계산한다.
  useEffect(() => {
    let cancelled = false
    setSummary(undefined)
    setError('')
    setRawFallback('')
    setAnalysis(getTodayDietAnalysis(effectiveUserId, periodDays, todayKey))

    const startDate = toDateKey(addDays(new Date(), -(periodDays - 1)))
    getMealsByDateRange(startDate, todayKey)
      .then((mealsByDate) => {
        if (!cancelled) setSummary(buildDietSummary(mealsByDate, effectiveRecommended))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '기록을 불러오지 못했어요.')
      })

    return () => {
      cancelled = true
    }
  }, [effectiveUserId, periodDays, todayKey, effectiveRecommended])

  async function runAnalysis() {
    if (!summary || analyzing) return
    setAnalyzing(true)
    setError('')
    setRawFallback('')
    try {
      const prompt = buildDietAnalysisPrompt(summary, periodDays)
      const callOnce = () =>
        geminiCompleteWithRetry({
          prompt,
          schema: DIET_ANALYSIS_SCHEMA,
          schemaName: 'diet_analysis',
          temperature: GEMINI_TEMPERATURE.dietAnalysis,
        })

      let raw = await callOnce()
      let findings = parseDietAnalysisFindings(raw)
      // 규칙 미달(개수/good 누락 등)이면 1회만 자동 재요청한다 — 그래도 미달이면 원문을 폴백으로 표시.
      if (!findings) {
        raw = await callOnce()
        findings = parseDietAnalysisFindings(raw)
      }

      if (!findings) {
        // raw가 비어 있거나(네트워크는 성공했지만 text 필드가 없는 경우) 공백뿐이면 "폴백 문단"으로
        // 취급하지 않는다 — rawFallback이 falsy라 폴백 렌더링 조건(`rawFallback &&`)에 안 걸리고,
        // 그렇다고 analysis도 없어서 아무 설명 없이 조용히 [분석하기] 버튼으로만 되돌아가 버린다
        // (재시도 2번을 이미 태운 뒤라 사용자가 영문도 모르고 또 누르게 됨). 명시적으로 에러로 처리한다.
        if (!raw || !raw.trim()) {
          setError('분석 결과를 제대로 받지 못했어요. 잠시 후 다시 시도해주세요.')
          return
        }
        setRawFallback(raw)
        return
      }

      const entry = saveDietAnalysis(effectiveUserId, periodDays, todayKey, {
        findings,
        startDate: summary.startDate,
        endDate: summary.endDate,
        recordedDays: summary.recordedDays,
        analyzedAt: new Date().toISOString(),
      })
      setAnalysis(entry)
    } catch (err) {
      console.error('diet analysis failed:', err)
      setError(err.message || '분석에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <h3 style={{ margin: 0, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>AI 식습관 분석</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIOD_OPTIONS.map((opt) => {
            const active = periodDays === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                className="tds-press"
                onClick={() => setPeriodDays(opt.key)}
                disabled={analyzing}
                style={{
                  padding: '4px 10px',
                  borderRadius: radius.sm,
                  border: 'none',
                  background: active ? colors.primary : colors.bg,
                  color: active ? '#fff' : colors.textSub,
                  fontSize: font.size.xs,
                  fontWeight: 700,
                  cursor: analyzing ? 'default' : 'pointer',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {analyzing && (
        <div style={{ textAlign: 'center', padding: `${spacing.lg}px 0` }}>
          <Spinner size={20} />
          <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.textSub, fontSize: font.size.sm }}>
            이번 주 식단을 살펴보고 있어요…
          </p>
        </div>
      )}

      {!analyzing && analysis && (
        <>
          <div>
            {analysis.findings.map((finding, i) => (
              <FindingRow key={i} finding={finding} />
            ))}
          </div>
          <p style={{ margin: `${spacing.md}px 0 0`, color: colors.muted, fontSize: font.size.xs }}>
            {formatShortDate(analysis.startDate)} ~ {formatShortDate(analysis.endDate)} · {analysis.recordedDays}일 기록 기준 ·{' '}
            {formatAnalyzedAt(analysis.analyzedAt)}
          </p>
        </>
      )}

      {!analyzing && !analysis && rawFallback && (
        <p style={{ margin: 0, color: colors.textStrong, fontSize: font.size.sm, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {rawFallback}
        </p>
      )}

      {!analyzing && !analysis && !rawFallback && summary === undefined && <Skeleton height={60} radius={radius.md} />}

      {!analyzing && !analysis && !rawFallback && summary === null && (
        <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm, textAlign: 'center', padding: `${spacing.md}px 0` }}>
          기록이 더 쌓이면 분석해드릴게요
        </p>
      )}

      {!analyzing && !analysis && !rawFallback && summary && <AppButton onClick={runAnalysis}>분석하기</AppButton>}

      {error && <p style={styles.errorText}>{error}</p>}

      <p style={{ margin: `${spacing.md}px 0 0`, color: colors.muted, fontSize: font.size.xs, textAlign: 'center' }}>
        이 분석은 참고용이며 의학적 조언이 아닙니다.
      </p>
    </Card>
  )
}
