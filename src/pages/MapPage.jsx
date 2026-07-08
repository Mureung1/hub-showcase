import { useMemo, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import PlaceList from '../components/PlaceList.jsx'
import PlaceMap from '../components/PlaceMap.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import Spinner from '../components/Spinner.jsx'
import { geminiComplete } from '../lib/gemini.js'
import { getCurrentPosition } from '../lib/geolocation.js'
import { searchPlaces } from '../lib/kakao.js'
import { NUTRIENT_LABELS } from '../lib/nutrition.js'
import { spacing, styles } from '../styles/theme.js'

const FALLBACK_SEARCH_KEYWORD = '백반'

function buildKeywordPrompt(deficientRows) {
  const nutrientText = deficientRows.map((row) => row.label).join(', ')

  return `아래 부족한 영양소를 보충하기 좋은 한국 식당을 찾으려고 해.
부족한 영양소: ${nutrientText}.
그 영양소를 보충하기 좋은 음식을 파는, 한국 식당 검색에 쓸 키워드를 딱 1개만 알려줘.
(예: 단백질→"고깃집", 식이섬유→"샐러드", 탄수화물→"백반")

설명 없이 키워드 단어 하나만 출력해. 마크다운, 따옴표, 문장부호 없이.`
}

async function fetchSearchKeyword(deficientRows) {
  if (deficientRows.length === 0) return FALLBACK_SEARCH_KEYWORD
  try {
    const prompt = buildKeywordPrompt(deficientRows)
    const text = await geminiComplete({ prompt })
    const keyword = text.trim().replace(/^["'“”]+|["'“”]+$/g, '').split('\n')[0].trim()
    return keyword || FALLBACK_SEARCH_KEYWORD
  } catch (err) {
    console.error('search keyword generation failed:', err)
    return FALLBACK_SEARCH_KEYWORD
  }
}

export default function MapPage() {
  const { user, todayMeal } = useUser()
  const recommended = user?.recommended
  const todayTotal = todayMeal?.total

  // 오늘 부족한 영양소가 있으면 그걸 보충하기 좋은 식당 키워드를 AI가 골라준다(F5).
  // 프로필/오늘 분석 기록이 없어도 top3Rows가 빈 배열이 되어 기본 키워드("백반")로 자연스럽게 폴백된다.
  const top3Rows = useMemo(() => {
    if (!recommended || !todayTotal) return []
    return NUTRIENT_LABELS.map(({ key, label, unit }) => ({
      key,
      label,
      unit,
      deficiency: recommended[key] - todayTotal[key],
    }))
      .filter((row) => row.deficiency > 0)
      .sort((a, b) => b.deficiency - a.deficiency)
      .slice(0, 3)
  }, [recommended, todayTotal])

  const [places, setPlaces] = useState(null)
  const [myPosition, setMyPosition] = useState(null)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState('')
  const [showMap, setShowMap] = useState(false)

  async function handleFindNearby() {
    setNearbyLoading(true)
    setNearbyError('')
    setPlaces(null)
    setShowMap(false)
    try {
      const { x, y } = await getCurrentPosition()
      const keyword = await fetchSearchKeyword(top3Rows)
      const results = await searchPlaces({ x, y, keyword, radius: 3000 })
      if (results.length === 0) {
        setNearbyError('주변에서 추천할 식당을 찾지 못했어요. 잠시 후 다시 시도해주세요.')
        return
      }
      setMyPosition({ lat: y, lng: x })
      setPlaces(results)
    } catch (err) {
      console.error('nearby search failed:', err)
      setNearbyError(err.message || '주변 식당을 찾지 못했습니다.')
    } finally {
      setNearbyLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="지도" subtitle="오늘 부족한 영양소를 보충할 식당을 찾아보세요" />

      <Card>
        <AppButton onClick={handleFindNearby} disabled={nearbyLoading}>
          {nearbyLoading && <Spinner size={16} />}
          {nearbyLoading ? '찾는 중...' : '내 주변에서 찾기'}
        </AppButton>
        {nearbyError && <p style={styles.errorText}>{nearbyError}</p>}
      </Card>

      {nearbyLoading && (
        <>
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton height={18} width="45%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="70%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="55%" />
            </Card>
          ))}
        </>
      )}

      {!nearbyLoading && places && (
        <>
          <AppButton variant="secondary" onClick={() => setShowMap((prev) => !prev)} style={{ marginBottom: spacing.md }}>
            {showMap ? '목록으로 보기' : '지도로 보기'}
          </AppButton>
          {showMap && myPosition && <PlaceMap myPosition={myPosition} places={places} />}
          {!showMap && <PlaceList places={places} />}
        </>
      )}
    </div>
  )
}
