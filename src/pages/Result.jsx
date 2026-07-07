import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import DeficiencyBar from '../components/DeficiencyBar.jsx'
import MenuRecommendation from '../components/MenuRecommendation.jsx'
import Spinner from '../components/Spinner.jsx'
import { geminiComplete, parseJsonLoose } from '../lib/gemini.js'
import { spacing, styles } from '../styles/theme.js'

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

  if (!recommended) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <p>신체정보가 없습니다. 먼저 프로필을 입력해주세요.</p>
          <Link to="/profile" style={{ ...styles.buttonPrimary, display: 'block', marginTop: spacing.lg, textDecoration: 'none' }}>
            프로필 입력하러 가기
          </Link>
        </div>
      </div>
    )
  }

  if (!todayTotal) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <p>오늘 분석한 식사 기록이 없습니다. 먼저 사진을 분석해주세요.</p>
          <Link to="/analyze" style={{ ...styles.buttonPrimary, display: 'block', marginTop: spacing.lg, textDecoration: 'none' }}>
            사진 분석하러 가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <h1>오늘의 부족 영양소</h1>
      {rows.map(({ key, ...row }) => (
        <DeficiencyBar key={key} {...row} highlighted={top3DeficientKeys.includes(key)} />
      ))}

      <h2 style={{ marginTop: spacing.xl }}>오늘 저녁 추천 메뉴</h2>
      {recLoading && (
        <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Spinner size={16} />
          <span style={styles.helperText}>추천 메뉴를 불러오는 중입니다...</span>
        </div>
      )}
      {recError && (
        <div style={styles.card}>
          <p style={{ ...styles.errorText, margin: 0 }}>{recError}</p>
          <button type="button" onClick={fetchRecommendations} style={{ ...styles.buttonSecondary, marginTop: spacing.sm }}>
            다시 시도
          </button>
        </div>
      )}
      {!recLoading && !recError && <MenuRecommendation recommendations={recommendations} />}

      <Link
        to="/analyze"
        style={{ ...styles.linkButton, display: 'block', textAlign: 'center', marginTop: spacing.xl, textDecoration: 'none' }}
      >
        다른 음식 다시 분석하기
      </Link>
    </div>
  )
}
