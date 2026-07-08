import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhotoUpload from '../components/PhotoUpload.jsx'
import NutritionCard from '../components/NutritionCard.jsx'
import Spinner from '../components/Spinner.jsx'
import Skeleton from '../components/Skeleton.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { useUser } from '../context/UserContext.jsx'
import { geminiComplete, parseJsonLoose } from '../lib/gemini.js'
import { calcAchievementPercent, isMealAnalysis } from '../lib/nutrition.js'
import { saveRecord, toDateKey } from '../lib/records.js'
import { radius, spacing, styles } from '../styles/theme.js'

function buildPrompt(menuName, brand) {
  const hints = []
  if (menuName) hints.push(`메뉴명 힌트: ${menuName}`)
  if (brand) hints.push(`브랜드 힌트: ${brand}`)
  const hintText = hints.length ? `\n${hints.join('\n')}` : ''

  return `너는 한국 음식 영양 분석에 특화된 영양사야. 이 음식 사진을 분석해서 실제와 최대한 가까운 영양 정보를 추정해줘.${hintText}

최종 답을 내기 전에 아래 순서로 내부적으로 단계를 밟아 생각해(생각 과정은 출력하지 마):
(a) 사진 속 음식의 종류를 정확히 식별한다. 사용자 힌트가 있으면 참고하되, 사진과 명백히 모순되면 사진을 우선한다.
(b) 사진에 보이는 대략적인 양(그릇/접시 크기, 높이, 인분 수)을 판단한다.
(c) 그 음식의 주요 재료 구성(면/밥/고기/채소/소스 비율 등)을 표준 조리법 기준으로 추정한다.
(d) (a)~(c)를 바탕으로 각 영양소(칼로리, 단백질, 탄수화물, 지방, 식이섬유, 나트륨)를 계산한다.

추정 시 반드시 지킬 원칙:
1. 한국에서 일반적으로 제공되는 "표준 1인분" 양과 표준 조리법을 기준값으로 삼아라. 사진 속 양이 표준보다 많거나 적어 보이면 그 비율만큼만 조정하고, 표준에서 크게 벗어난 값을 만들지 마라.
2. 과대추정 금지: 사진에 보이지 않는 재료(숨겨진 고기량, 기름, 소스 등)를 임의로 많이 추가하지 마라. 보이는 것과 표준 조리법 범위 내에서 보수적으로 추정하고, 불확실하면 해당 음식의 한국 표준 1인분 평균값을 사용해라.
   예: 짜장면 1인분은 보통 단백질 12~16g 수준이다. 이런 현실적인 범위를 벗어나는 값이 나오면 재검토해라. 비빔밥, 김치찌개, 제육볶음 등 다른 음식도 각각의 통상적인 1인분 영양 범위를 벗어나지 않도록 스스로 점검해라.
3. 프랜차이즈/브랜드가 사진이나 힌트로 식별되면, 표준 조리법 추정보다 그 브랜드의 공식 영양정보(제공량 기준)를 우선 적용해라.
4. 한 접시/사진에 서로 다른 음식이 여러 개 있으면 items 배열에 각각을 별도 항목으로 분리해서 추정하고, total은 그 항목들의 nutrients 합이어야 한다.
5. 최종적으로 각 항목의 nutrients 값이 현실적인 범위인지 스스로 sanity check 해라. 예를 들어 일반적인 한 끼 요리 하나에서 단백질이 100g을 넘는 등 비현실적인 값이 나왔다면 과대추정이 없었는지 다시 확인하고 현실적인 값으로 고쳐라.

설명이나 마크다운, 계산 근거 없이, 아래 스키마와 정확히 일치하는 최종 MealAnalysis JSON만 반환해:
{
  "items": [
    { "name": "메뉴명", "brand": "브랜드명(없으면 생략)", "nutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 } }
  ],
  "total": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
}`
}

function AnalyzingSkeleton() {
  return (
    <div style={styles.card}>
      <Skeleton height={96} radius={radius.sm} style={{ marginBottom: spacing.lg }} />
      <Skeleton height={20} width="55%" style={{ marginBottom: spacing.lg }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={14} style={{ marginBottom: spacing.sm }} />
      ))}
    </div>
  )
}

export default function Analyze() {
  const { user, setTodayMeal, todayMeal } = useUser()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(null) // { base64, mimeType, dataUrl, width, height }
  const [menuName, setMenuName] = useState('')
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAnalyze() {
    setError('')

    if (!photo) {
      setError('사진을 먼저 업로드해주세요.')
      return
    }

    setLoading(true)
    try {
      const prompt = buildPrompt(menuName, brand)
      const text = await geminiComplete({ prompt, imageBase64: photo.base64, mimeType: photo.mimeType })
      const parsed = parseJsonLoose(text)

      if (!isMealAnalysis(parsed)) {
        throw new Error('분석 결과 형식이 올바르지 않습니다.')
      }

      setTodayMeal(parsed)

      if (user) {
        const achievementPercent = calcAchievementPercent(user.recommended, parsed.total)
        saveRecord(user.id, toDateKey(new Date()), {
          items: parsed.items,
          total: parsed.total,
          achievementPercent,
          savedAt: new Date().toISOString(),
        })
      }

      navigate('/result')
    } catch (err) {
      console.error('meal analysis failed:', err)
      setError('분석에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title={`안녕하세요, ${user?.id ?? ''}님 👋`} subtitle="오늘 점심을 찍어볼까요?" />

      <Card>
        <PhotoUpload onChange={setPhoto} />

        <div style={{ marginTop: spacing.lg }}>
          <TextField label="메뉴 이름 (선택)" id="menuName" value={menuName} onChange={(e) => setMenuName(e.target.value)} />
          <TextField label="브랜드 (선택)" id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>

        <AppButton onClick={handleAnalyze} disabled={loading} style={{ marginTop: spacing.sm }}>
          {loading && <Spinner size={16} />}
          {loading ? '분석 중...' : error && photo ? '다시 시도' : '촬영 후 분석하기'}
        </AppButton>

        {error && <p style={styles.errorText}>{error}</p>}
      </Card>

      {loading && <AnalyzingSkeleton />}
      {!loading && <NutritionCard analysis={todayMeal} />}
    </div>
  )
}
