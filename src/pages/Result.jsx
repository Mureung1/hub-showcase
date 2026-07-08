import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import DeficiencyBar from '../components/DeficiencyBar.jsx'
import MenuRecommendation from '../components/MenuRecommendation.jsx'
import PlaceList from '../components/PlaceList.jsx'
import Skeleton from '../components/Skeleton.jsx'
import Spinner from '../components/Spinner.jsx'
import { geminiComplete, parseJsonLoose } from '../lib/gemini.js'
import { getCurrentPosition } from '../lib/geolocation.js'
import { searchPlaces } from '../lib/kakao.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

const NUTRIENT_LABELS = [
  { key: 'calories', label: '칼로리', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

function buildRecommendationPrompt(deficientRows) {
  const nutrientText = deficientRows.map((row) => `${row.label} 약 ${row.deficiency}${row.unit} 부족`).join(', ')

  return `대학생이 밖에서 사먹기 쉬운 저녁 메뉴 2~3개를 추천해줘.
오늘 부족한 영양소: ${nutrientText}.
각 메뉴가 어떤 부족 영양소를 채우는지 한 줄 이유를 포함해줘.

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "recommendations": [
    { "name": "메뉴명", "reason": "이 메뉴가 부족 영양소를 채우는 한 줄 이유" }
  ]
}`
}

function isMenuRecommendationList(value) {
  return (
    Boolean(value) &&
    Array.isArray(value.recommendations) &&
    value.recommendations.length > 0 &&
    value.recommendations.every((r) => r && typeof r.name === 'string' && typeof r.reason === 'string')
  )
}

function AchievementRing({ percent, size = 160, strokeWidth = 14 }) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - percent / 100)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 30, fontWeight: 800, color: colors.title }}>{percent}%</span>
      </div>
    </div>
  )
}

export default function Result() {
  const { user, todayMeal } = useUser()
  const recommended = user?.recommended
  const todayTotal = todayMeal?.total

  const rows = useMemo(() => {
    if (!recommended || !todayTotal) return []
    return NUTRIENT_LABELS.map(({ key, label, unit }) => ({
      key,
      label,
      unit,
      recommended: recommended[key],
      actual: todayTotal[key],
      deficiency: recommended[key] - todayTotal[key],
    }))
  }, [recommended, todayTotal])

  const top3Rows = useMemo(
    () =>
      [...rows]
        .filter((row) => row.deficiency > 0)
        .sort((a, b) => b.deficiency - a.deficiency)
        .slice(0, 3),
    [rows],
  )
  const top3DeficientKeys = useMemo(() => top3Rows.map((row) => row.key), [top3Rows])

  const achievementPercent = useMemo(() => {
    if (rows.length === 0) return 0
    const sum = rows.reduce((acc, row) => acc + Math.min(1, row.recommended > 0 ? row.actual / row.recommended : 0), 0)
    return Math.round((sum / rows.length) * 100)
  }, [rows])

  const [recommendations, setRecommendations] = useState(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState('')
  const triedRef = useRef(false)

  async function fetchRecommendations() {
    setRecLoading(true)
    setRecError('')
    try {
      const prompt = buildRecommendationPrompt(top3Rows)
      const text = await geminiComplete({ prompt })
      const parsed = parseJsonLoose(text)

      if (!isMenuRecommendationList(parsed)) {
        throw new Error('추천 결과 형식이 올바르지 않습니다.')
      }

      setRecommendations(parsed.recommendations)
    } catch (err) {
      console.error('menu recommendation failed:', err)
      setRecError('메뉴 추천을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setRecLoading(false)
    }
  }

  useEffect(() => {
    if (top3Rows.length > 0 && !triedRef.current) {
      triedRef.current = true
      fetchRecommendations()
    }
  }, [top3Rows])

  const [places, setPlaces] = useState(null)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState('')

  async function handleFindNearby() {
    setNearbyLoading(true)
    setNearbyError('')
    setPlaces(null)
    try {
      const { x, y } = await getCurrentPosition()

      // TODO: 다음 단계에서 top3Rows(부족 상위 영양소) 기반으로 AI가 검색 키워드를 생성하도록 교체 예정.
      // 지금은 1단계라 임시로 고정 키워드를 사용한다.
      const keyword = '백반'

      const results = await searchPlaces({ x, y, keyword, radius: 3000 })
      if (results.length === 0) {
        setNearbyError('주변에서 추천할 식당을 찾지 못했어요. 잠시 후 다시 시도해주세요.')
        return
      }
      setPlaces(results)
    } catch (err) {
      console.error('nearby search failed:', err)
      setNearbyError(err.message || '주변 식당을 찾지 못했습니다.')
    } finally {
      setNearbyLoading(false)
    }
  }

  if (!recommended) {
    return (
      <div style={styles.page}>
        <h1>오늘의 부족 영양소</h1>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <p>신체정보가 없습니다. 먼저 프로필을 입력해주세요.</p>
          <Link
            to="/profile"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'block', marginTop: spacing.lg, textDecoration: 'none' }}
          >
            프로필 입력하러 가기
          </Link>
        </div>
      </div>
    )
  }

  if (!todayTotal) {
    return (
      <div style={styles.page}>
        <h1>오늘의 부족 영양소</h1>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <p>오늘 분석한 식사 기록이 없습니다. 먼저 사진을 분석해주세요.</p>
          <Link
            to="/analyze"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'block', marginTop: spacing.lg, textDecoration: 'none' }}
          >
            사진 분석하러 가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <h1>오늘의 부족 영양소</h1>

      <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ alignSelf: 'flex-start' }}>오늘의 영양 진단</h2>
        <div style={{ margin: `${spacing.sm}px 0` }}>
          <AchievementRing percent={achievementPercent} />
        </div>
        <p style={{ color: colors.muted, fontSize: font.size.sm }}>하루 목표 달성률</p>
      </div>

      {rows.map(({ key, ...row }) => (
        <DeficiencyBar key={key} {...row} highlighted={top3DeficientKeys.includes(key)} />
      ))}

      <h2 style={{ marginTop: spacing.xl }}>오늘 저녁 추천 메뉴</h2>
      {recLoading && (
        <>
          {[0, 1].map((i) => (
            <div key={i} style={styles.card}>
              <Skeleton height={18} width="40%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="85%" />
            </div>
          ))}
        </>
      )}
      {recError && (
        <div style={styles.card}>
          <p style={{ ...styles.errorText, margin: 0 }}>{recError}</p>
          <button
            type="button"
            className="tds-press"
            onClick={fetchRecommendations}
            style={{ ...styles.buttonSecondary, marginTop: spacing.sm }}
          >
            다시 시도
          </button>
        </div>
      )}
      {!recLoading && !recError && <MenuRecommendation recommendations={recommendations} />}

      <h2 style={{ marginTop: spacing.xl }}>주변 추천 식당</h2>
      <div style={styles.card}>
        <button
          type="button"
          className="tds-press"
          onClick={handleFindNearby}
          disabled={nearbyLoading}
          style={{ ...styles.buttonPrimary, opacity: nearbyLoading ? 0.7 : 1, cursor: nearbyLoading ? 'not-allowed' : 'pointer' }}
        >
          {nearbyLoading && <Spinner size={16} />}
          {nearbyLoading ? '찾는 중...' : '내 주변에서 찾기'}
        </button>
        {nearbyError && <p style={styles.errorText}>{nearbyError}</p>}
      </div>

      {nearbyLoading && (
        <>
          {[0, 1].map((i) => (
            <div key={i} style={styles.card}>
              <Skeleton height={18} width="45%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="70%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="55%" />
            </div>
          ))}
        </>
      )}
      {!nearbyLoading && places && <PlaceList places={places} />}

      <Link
        to="/analyze"
        className="tds-press"
        style={{ ...styles.linkButton, display: 'block', textAlign: 'center', marginTop: spacing.xl }}
      >
        다른 음식 다시 분석하기
      </Link>
    </div>
  )
}
