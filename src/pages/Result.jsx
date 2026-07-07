import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import DeficiencyBar from '../components/DeficiencyBar.jsx'

const NUTRIENT_LABELS = [
  { key: 'calories', label: '칼로리', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

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

  const top3DeficientKeys = useMemo(() => {
    return rows
      .filter((row) => row.deficiency > 0)
      .sort((a, b) => b.deficiency - a.deficiency)
      .slice(0, 3)
      .map((row) => row.key)
  }, [rows])

  if (!recommended) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <p>신체정보가 없습니다. 먼저 프로필을 입력해주세요.</p>
        <Link to="/profile">프로필 입력하러 가기</Link>
      </div>
    )
  }

  if (!todayTotal) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <p>오늘 분석한 식사 기록이 없습니다. 먼저 사진을 분석해주세요.</p>
        <Link to="/analyze">사진 분석하러 가기</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 24 }}>
      <h1>오늘의 부족 영양소</h1>
      {rows.map((row) => (
        <DeficiencyBar key={row.key} {...row} highlighted={top3DeficientKeys.includes(row.key)} />
      ))}
    </div>
  )
}
