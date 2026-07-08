import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import DeficiencyBar from '../components/DeficiencyBar.jsx'
import MenuRecommendation from '../components/MenuRecommendation.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { geminiComplete, parseJsonLoose } from '../lib/gemini.js'
import { calcAchievementPercent, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

function buildRecommendationPrompt(deficientRows) {
  const nutrientText = deficientRows.map((row) => `${row.label}(${row.key}) 약 ${row.deficiency}${row.unit} 부족`).join(', ')
  const deficientKeys = deficientRows.map((row) => `"${row.key}"`).join(', ')

  return `대학생이 밖에서 사먹기 쉬운 저녁 메뉴 2~3개를 추천해줘.
오늘 부족한 영양소: ${nutrientText}.

조건:
1. 각 메뉴는 부족한 영양소를 실제로 잘 채울 수 있는 메뉴여야 하고, 어떤 부족 영양소를 채우는지 한 줄 이유(reason)를 포함해라.
2. 각 메뉴마다, 그 메뉴의 "한국 표준 1인분"을 먹었을 때 예상되는 주요 영양 섭취량을 expected 객체로 함께 계산해라.
   - 수치는 식품의약품안전처 한국식품영양성분 데이터베이스(국가표준식품성분표) 수준의 표준값 기준으로 계산해라. (URL 조회가 아니라 네가 아는 그 DB 수준의 기준값이라는 의미다.)
   - 과대추정 금지: 그 메뉴의 통상적인 1인분 현실 범위를 벗어나는 값이 나오면 스스로 재검토하고 보수적인 값으로 고쳐라.
   - expected에는 부족한 영양소 키(${deficientKeys})를 반드시 포함하고, 필요하면 calories도 포함해도 된다.
   - 사용할 수 있는 키와 단위: calories(kcal), protein(g), carbs(g), fat(g), fiber(g), sodium(mg). 값은 숫자만.

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "recommendations": [
    { "name": "메뉴명", "reason": "이 메뉴가 부족 영양소를 채우는 한 줄 이유", "expected": { "protein": 0, "fiber": 0 } }
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

  const achievementPercent = useMemo(
    () => calcAchievementPercent(recommended, todayTotal),
    [recommended, todayTotal],
  )

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
        <ScreenHeader title="오늘의 영양 진단" />
        <Card style={{ textAlign: 'center' }}>
          <p>신체정보가 없습니다. 먼저 프로필을 입력해주세요.</p>
          <Link
            to="/profile"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'block', marginTop: spacing.lg, textDecoration: 'none' }}
          >
            프로필 입력하러 가기
          </Link>
        </Card>
      </div>
    )
  }

  if (!todayTotal) {
    return (
      <div style={styles.page}>
        <ScreenHeader title="오늘의 영양 진단" />
        <Card style={{ textAlign: 'center' }}>
          <p>오늘 분석한 식사 기록이 없습니다. 먼저 사진을 분석해주세요.</p>
          <Link
            to="/analyze"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'block', marginTop: spacing.lg, textDecoration: 'none' }}
          >
            사진 분석하러 가기
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="오늘의 영양 진단" subtitle="하루 목표 달성률을 확인해보세요" />

      <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ margin: `${spacing.sm}px 0` }}>
          <AchievementRing percent={achievementPercent} />
        </div>
        <p style={{ color: colors.muted, fontSize: font.size.sm }}>하루 목표 달성률</p>
      </Card>

      <SectionTitle>부족한 영양소</SectionTitle>
      {rows.map(({ key, ...row }) => (
        <DeficiencyBar key={key} {...row} highlighted={top3DeficientKeys.includes(key)} />
      ))}

      <SectionTitle>오늘의 보충 추천 메뉴</SectionTitle>
      {recLoading && (
        <>
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton height={18} width="40%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="85%" />
            </Card>
          ))}
        </>
      )}
      {recError && (
        <Card>
          <p style={{ ...styles.errorText, margin: 0 }}>{recError}</p>
          <AppButton variant="secondary" onClick={fetchRecommendations} style={{ marginTop: spacing.sm }}>
            다시 시도
          </AppButton>
        </Card>
      )}
      {!recLoading && !recError && <MenuRecommendation recommendations={recommendations} />}

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
