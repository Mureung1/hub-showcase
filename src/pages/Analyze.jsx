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

const ANALYSIS_SYSTEM_PROMPT = `당신은 한국 음식 영양 분석 전문가다. 사진 속 음식의 영양성분을 한국식품영양성분 데이터베이스(식약처)와 한국영양학회 기준값 수준에 맞춰, 한국의 일반적인 1인분을 기준으로 추정한다. 다음 절차를 반드시 내부적으로 따른다(최종 출력은 JSON만):

1. 음식 식별: 사진 속 음식이 정확히 무엇인지, 단일 메뉴인지 여러 반찬이 있는 상차림인지 판단한다. 여러 개면 각각 분리한다. 사용자가 준 메뉴명/브랜드 힌트는 강하게 참고하되, 사진과 명백히 모순되면 사진을 우선한다.
2. 양 추정: 사진에 보이는 양이 한국 표준 1인분 대비 어느 정도인지 판단한다(예: 표준의 0.8인분, 1.2인분). 그릇 크기·음식 높이를 근거로 보수적으로 본다.
3. 재료 구성: 보이는 재료만을 기준으로 구성한다. 보이지 않는 고기·기름·소스를 임의로 많이 넣지 않는다. 불확실하면 한국 표준 조리법의 평균값을 쓴다.
4. 영양소 산출: 위 양·재료로 열량·탄수·단백질·지방·식이섬유·나트륨을 계산한다. 나트륨은 절대 생략하지 말고 반드시 mg 단위로 추정한다(한국 음식은 나트륨이 높은 편이라 국물·양념·간을 반영한다). 식이섬유도 절대 생략하지 말고 반드시 g 단위로 추정한다(채소·곡물·해조류·나물 반찬을 반영하고, 채소가 거의 없는 음식이라도 현실적인 최소값을 준다).
5. 검증(sanity check): 각 값이 한국 표준 1인분의 현실 범위를 벗어나면 재조정한다. 특히 단백질을 과대추정하지 않는다. 참고 기준(1인분, 대략):
   - 짜장면: 단백질 12~16g, 탄수 110~130g, 열량 650~800kcal, 나트륨 1200~1800mg
   - 김밥 1줄: 단백질 6~9g, 열량 320~450kcal
   - 삼겹살 1인분(150g): 단백질 25~30g, 지방 40~50g
   - 라면 1개: 단백질 10~12g, 나트륨 1500~1900mg
   이 예시는 감각을 잡기 위한 참고일 뿐, 실제 사진의 양에 맞춰 조정한다.
6. 프랜차이즈/브랜드가 사진이나 입력으로 식별되면 그 브랜드 공식 영양표를 우선한다.

주의: 특정 웹사이트를 실시간 조회하는 게 아니라, 위 기준 데이터베이스 '수준'의 표준값에 맞춰 추정하라는 의미다. 계산 근거나 설명은 출력하지 말고 JSON만 반환한다.`

function buildPrompt(menuName, brand) {
  const hints = []
  if (menuName) hints.push(`메뉴명 힌트: ${menuName}`)
  if (brand) hints.push(`브랜드 힌트: ${brand}`)
  const hintText = hints.length ? `\n${hints.join('\n')}` : ''

  return `이 음식 사진을 분석해서 영양 정보를 추정해줘.${hintText}

각 item의 nutrients에는 calories, carbs, protein, fat, fiber, sodium 여섯 키가 반드시 모두 포함되어야 한다. 어떤 값이 불확실하더라도 누락하거나 0으로 두지 말고, 그 음식의 한국 표준 1인분 기준값으로 채워라. total은 items의 nutrients 합이어야 한다.

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
  const { user, setTodayMeal, todayMeal, addTodayMeal } = useUser()
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
      const text = await geminiComplete({
        prompt,
        system: ANALYSIS_SYSTEM_PROMPT,
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
      })
      const parsed = parseJsonLoose(text)

      if (!isMealAnalysis(parsed)) {
        throw new Error('분석 결과 형식이 올바르지 않습니다.')
      }

      setTodayMeal(parsed)

      // 분석된 각 음식을 오늘 식단 목록(mealStore)에 추가
      parsed.items.forEach((item) => {
        addTodayMeal({ name: item.name, brand: item.brand, nutrients: item.nutrients })
      })

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
