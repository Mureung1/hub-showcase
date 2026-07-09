import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import PlaceList from '../components/PlaceList.jsx'
import PlaceMap from '../components/PlaceMap.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import Spinner from '../components/Spinner.jsx'
import { geminiComplete, parseJsonLoose } from '../lib/gemini.js'
import { getCurrentPosition } from '../lib/geolocation.js'
import { searchPlaces } from '../lib/kakao.js'
import { NUTRIENT_LABELS } from '../lib/nutrition.js'
import { radius, spacing, styles } from '../styles/theme.js'

// 위치 권한 거부/실패 시 지도를 띄울 기본 위치(대전 유성구 충남대학교 인근)
const DEFAULT_POSITION = { lat: 36.3665, lng: 127.3448 }

// AI 키워드 생성이 실패했을 때 쓰는 부족 영양소별 기본 식당 유형(서로 다른 유형으로 분산)
const KEYWORD_FALLBACKS = {
  protein: '고깃집',
  fiber: '샐러드',
  carbs: '백반',
  calories: '백반',
  fat: '돈까스',
  sodium: '백반',
}
const FALLBACK_SEARCH_KEYWORD = '백반'
// 결과가 한 유형으로만 몰렸을 때 보완 검색에 쓰는 다양화 풀
const DIVERSITY_POOL = ['샐러드', '고깃집', '비빔밥', '쌈밥', '두부요리']
const MAX_PER_KEYWORD = 3
const MAX_TOTAL_PLACES = 6

function buildKeywordsPrompt(deficientRows) {
  const nutrientText = deficientRows.map((row) => `${row.label}(${row.key}) 약 ${row.deficiency}${row.unit} 부족`).join(', ')

  return `오늘 부족한 영양소를 채울 식당을 카카오맵에서 검색하려고 해.
부족한 영양소: ${nutrientText}.

조건:
1. 부족한 영양소 각각에 대해, 그 영양소를 보충하기 좋은 음식을 파는 "식당 유형" 검색 키워드를 1개씩 뽑아라(총 2~3개).
2. 키워드끼리 서로 다른 유형이어야 한다. 백반/국밥 같은 한 가지 유형으로 몰지 마라.
   매핑 예시: 단백질→구이/고깃집/샤브샤브, 식이섬유→샐러드/비빔밥/쌈밥, 탄수화물→백반/김밥, 칼슘→두부요리.
3. 각 키워드는 카카오맵 장소 검색에 바로 쓸 수 있는 짧은 한국어 단어(1~4글자 상호 유형)여야 한다.

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "keywords": [
    { "keyword": "고깃집", "target": "protein" }
  ]
}`
}

async function fetchSearchKeywords(deficientRows) {
  if (deficientRows.length === 0) return [FALLBACK_SEARCH_KEYWORD]

  try {
    const text = await geminiComplete({ prompt: buildKeywordsPrompt(deficientRows) })
    const parsed = parseJsonLoose(text)
    const keywords = (parsed?.keywords || [])
      .map((k) => (typeof k === 'string' ? k : k?.keyword))
      .filter((k) => typeof k === 'string' && k.trim().length > 0)
      .map((k) => k.trim())
    const unique = [...new Set(keywords)].slice(0, 3)
    if (unique.length > 0) return unique
  } catch (err) {
    console.error('search keyword generation failed:', err)
  }

  // 폴백: 부족 영양소별 정적 매핑(중복 제거로 유형 분산 유지)
  const mapped = [...new Set(deficientRows.map((row) => KEYWORD_FALLBACKS[row.key] || FALLBACK_SEARCH_KEYWORD))]
  return mapped.slice(0, 3)
}

function placeIdentity(place) {
  return place.place_url || `${place.place_name}|${place.road_address_name}`
}

function categoryOf(place) {
  return place.category_name?.split(' > ').pop() || ''
}

// 키워드별로 카카오 검색을 돌리고, 중복 장소를 제거하며 합친다(키워드당 최대 3곳).
async function searchAndMerge({ x, y, keywords, existing = [] }) {
  const merged = [...existing]
  const seen = new Set(existing.map(placeIdentity))

  const settled = await Promise.allSettled(keywords.map((keyword) => searchPlaces({ x, y, keyword, radius: 3000 })))

  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled') {
      console.error(`kakao search failed for "${keywords[i]}":`, result.reason)
      return
    }
    for (const place of result.value.slice(0, MAX_PER_KEYWORD)) {
      const identity = placeIdentity(place)
      if (seen.has(identity)) continue
      seen.add(identity)
      merged.push({ ...place, matchedKeyword: keywords[i] })
    }
  })

  return merged.slice(0, MAX_TOTAL_PLACES)
}

function buildExpectedPrompt(places, deficientRows) {
  const placeText = places.map((p) => `- ${p.place_name} (${p.category_name || '분류 없음'})`).join('\n')
  const deficientKeys = deficientRows.map((row) => `"${row.key}"`).join(', ')
  const nutrientText = deficientRows.map((row) => `${row.label}(${row.key})`).join(', ')

  return `아래는 오늘 부족한 영양소(${nutrientText})를 채우러 갈 후보 식당 목록이야.
각 식당의 카테고리를 보고 대표 메뉴를 떠올린 뒤, 그 대표 메뉴 "한국 표준 1인분"을 먹었을 때 예상되는 주요 영양 섭취량을 계산해줘.

조건:
- 수치는 식품의약품안전처 한국식품영양성분 데이터베이스(국가표준식품성분표)와 한국영양학회 기준값 수준의 표준 1인분 기준으로 계산해라. (URL 조회가 아니라 네가 아는 그 DB 수준의 기준값이라는 의미다.)
- 과대추정 금지: 통상적인 1인분 현실 범위를 벗어나면 스스로 재검토하고 보수적인 값으로 고쳐라.
- expected에는 부족한 영양소 키(${deficientKeys})를 반드시 포함해라.
- 사용할 수 있는 키와 단위: calories(kcal), protein(g), carbs(g), fat(g), fiber(g), sodium(mg). 값은 숫자만.
- place_name은 아래 목록의 이름과 정확히 같아야 한다.

식당 목록:
${placeText}

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "places": [
    { "place_name": "식당 이름", "expected": { "protein": 0 } }
  ]
}`
}

// 장소별 "대표 메뉴 1인분 예상 섭취량"을 한 번의 호출로 계산해 붙인다. 실패해도 목록 자체는 그대로 보여준다.
async function attachExpectedIntake(places, deficientRows) {
  if (places.length === 0 || deficientRows.length === 0) return places

  try {
    const text = await geminiComplete({ prompt: buildExpectedPrompt(places, deficientRows) })
    const parsed = parseJsonLoose(text)
    const byName = new Map(
      (parsed?.places || [])
        .filter((p) => p && typeof p.place_name === 'string' && p.expected && typeof p.expected === 'object')
        .map((p) => [p.place_name, p.expected]),
    )
    return places.map((place) => (byName.has(place.place_name) ? { ...place, expected: byName.get(place.place_name) } : place))
  } catch (err) {
    console.error('expected intake calculation failed:', err)
    return places
  }
}

export default function MapPage() {
  const { user, todayMeal } = useUser()
  const recommended = user?.recommended
  const todayTotal = todayMeal?.total

  // 오늘 부족한 영양소 상위 3개. 프로필/오늘 분석 기록이 없으면 빈 배열 → 기본 키워드로 폴백.
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
  const [locationNotice, setLocationNotice] = useState('')
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState('')
  const locateTriedRef = useRef(false)

  // 탭 진입 시 바로 위치를 요청해 지도를 내 위치 중심으로 띄운다. 거부/실패 시 기본 위치로 폴백.
  useEffect(() => {
    if (locateTriedRef.current) return
    locateTriedRef.current = true

    getCurrentPosition()
      .then(({ x, y }) => setMyPosition({ lat: y, lng: x }))
      .catch(() => {
        setMyPosition(DEFAULT_POSITION)
        setLocationNotice('위치 권한을 허용하면 현재 위치를 표시해요.')
      })
  }, [])

  async function handleFindNearby() {
    setNearbyLoading(true)
    setNearbyError('')
    setPlaces(null)
    try {
      const { x, y } = await getCurrentPosition()

      // 1) 부족 영양소 → 서로 다른 식당 유형 키워드 2~3개
      const keywords = await fetchSearchKeywords(top3Rows)

      // 2) 키워드별 검색 후 병합(중복 제거)
      let results = await searchAndMerge({ x, y, keywords })

      // 3) 한 유형으로만 몰리면 다른 유형으로 보완 검색
      const categoryCount = new Set(results.map(categoryOf)).size
      if (results.length > 0 && categoryCount <= 1) {
        const extraKeyword = DIVERSITY_POOL.find((k) => !keywords.includes(k))
        if (extraKeyword) {
          results = await searchAndMerge({ x, y, keywords: [extraKeyword], existing: results })
        }
      }

      if (results.length === 0) {
        setNearbyError('주변에서 추천할 식당을 찾지 못했어요. 잠시 후 다시 시도해주세요.')
        return
      }

      // 4) 각 식당의 대표 메뉴 예상 섭취량(추천 근거) 계산해 부착
      const withExpected = await attachExpectedIntake(results, top3Rows)

      setMyPosition({ lat: y, lng: x })
      setLocationNotice('')
      setPlaces(withExpected)
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

      <div style={{ marginBottom: spacing.md }}>
        {myPosition ? (
          <PlaceMap myPosition={myPosition} places={places || []} />
        ) : (
          <Skeleton height={320} radius={radius.lg} />
        )}
        {locationNotice && (
          <p style={{ ...styles.helperText, margin: `${spacing.sm}px 0 0`, textAlign: 'center' }}>{locationNotice}</p>
        )}
      </div>

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

      {!nearbyLoading && places && <PlaceList places={places} />}
    </div>
  )
}
