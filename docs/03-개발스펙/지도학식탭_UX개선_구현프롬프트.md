# 구현 프롬프트 — 지도·학식 탭 UX 개선

> `PRD_지도학식탭_UX개선.md`의 구현 지시문. 코드 레벨로 무엇을 어떻게 바꾸는지와, Gemini에게 보낼
> 실제 프롬프트 원문을 여기 확정해둔다. 구현은 이 문서 순서대로 진행한다.

---

## 1. `src/components/CnuCafeteriaLocationCard.jsx`

- 100행 근처, 접힌 카드 제목 문자열 `식비 위치 보기` → `학생 식당위치`로 텍스트만 교체.
- 그 외 로직(지도 리센터, 핀 강조, 길찾기 버튼)은 이미 `selectedBuilding` prop을 반영해 정상 동작하므로
  변경하지 않는다.

## 2. `src/components/CafeteriaPanel.jsx`

최상위 `CafeteriaPanel` 컴포넌트의 반환 JSX에서, `AllergyCodeSheet`와 대학 전용
`CnuCafeteriaLocationCard`의 렌더 순서만 맞바꾼다(각 줄의 조건부 렌더 가드는 그대로):

```jsx
// 변경 전
<AllergyCodeSheet />
{school.type === 'university' && <CnuCafeteriaLocationCard selectedBuilding={building} />}

// 변경 후
{school.type === 'university' && <CnuCafeteriaLocationCard selectedBuilding={building} />}
<AllergyCodeSheet />
```

## 3. `src/pages/MapPage.jsx`

### 3.1 상수

```js
const MAX_TOTAL_PLACES = 5   // 기존 8
// RESERVED_OCCUPATION_SLOTS는 2 그대로 유지(변경 없음)
```

### 3.2 `fetchSearchKeywords` — `{ keywords, targets }` 반환으로 변경

`targets`는 `Map<keyword:string, nutrientKey:string>`. 호출부(`searchAroundPosition`) 단 한 곳만
수정하면 된다.

```js
async function fetchSearchKeywords(deficientRows, category, { sodiumExceeded = false } = {}) {
  if (deficientRows.length === 0) {
    const keywords = category.key === 'all' ? BALANCED_KEYWORDS.slice(0, 3) : category.keywords.slice(0, 3)
    return { keywords, targets: new Map() }
  }

  try {
    const text = await geminiCompleteWithRetry({
      prompt: buildKeywordsPrompt(deficientRows, category, { sodiumExceeded }),
      schema: KEYWORDS_SCHEMA,
      schemaName: 'search_keywords',
      temperature: GEMINI_TEMPERATURE.keywords,
    })
    const parsed = parseJsonLoose(text)
    const targets = new Map()
    const keywords = (parsed?.keywords || [])
      .filter((k) => k && typeof k.keyword === 'string' && k.keyword.trim().length > 0)
      .map((k) => {
        const keyword = k.keyword.trim()
        if (typeof k.target === 'string' && k.target.trim()) targets.set(keyword, k.target.trim())
        return keyword
      })
    const unique = [...new Set(keywords)].slice(0, 3)
    if (unique.length > 0) return { keywords: unique, targets }
  } catch (err) {
    console.error('search keyword generation failed:', err)
  }

  if (category.key !== 'all') return { keywords: category.keywords.slice(0, 3), targets: new Map() }
  const targets = new Map()
  const mapped = [...new Set(deficientRows.map((row) => {
    const keyword = KEYWORD_FALLBACKS[row.key] || FALLBACK_SEARCH_KEYWORD
    if (KEYWORD_FALLBACKS[row.key]) targets.set(keyword, row.key)
    return keyword
  }))]
  return { keywords: mapped.slice(0, 3), targets }
}
```

주의: 기존 코드는 `typeof k === 'string' ? k : k?.keyword`로 문자열/객체 양쪽을 다 받았지만
`KEYWORDS_SCHEMA`가 항상 `{keyword, target}` 객체를 강제하므로 이 분기는 죽은 코드였다 — 위 재작성에서
객체 형태만 받도록 단순화했다(스키마 계약 위반 시 필터링되어 조용히 무시됨, 기존과 동일한 안전성).

### 3.3 `searchAndMerge` — `pool` 필드 추가

마지막 줄만 수정:

```js
// 변경 전
return { places: merged.slice(0, MAX_TOTAL_PLACES), rawPool }
// 변경 후
return { places: merged.slice(0, MAX_TOTAL_PLACES), rawPool, pool: merged }
```

## 4. 신규 `src/lib/placeDiversity.js`

```js
import { FOOD_CATEGORIES, matchesFoodCategory } from './foodCategory.js'

function placeIdentity(place) {
  return place.place_url || `${place.place_name}|${place.road_address_name}`
}

function cuisineKeyOf(place) {
  const key = FOOD_CATEGORIES.find((c) => c.key !== 'all' && matchesFoodCategory(c.key, place.category_name))
  return key ? key.key : 'etc'
}

// candidates: 거리순 정렬된 후보 배열. 각 항목에 matchedTarget(영양소 키 또는 null)이 있어야 한다.
// targetCount만큼 뽑되, 1) 서로 다른 matchedTarget마다 가장 가까운 후보를 먼저 고정 픽하고
// 2) 남은 자리는 요리 계열 라운드로빈으로(계열당 상한 있음) 채우고 3) 그래도 남으면 거리순으로 채운다.
export function diversifyByCategory(candidates, { targetCount }) {
  if (candidates.length <= targetCount) return candidates

  const picked = []
  const ids = new Set()
  const take = (c) => {
    picked.push(c)
    ids.add(placeIdentity(c))
  }

  // 1단계: 영양소 타깃 고정 픽
  const seenTargets = new Set()
  for (const c of candidates) {
    if (picked.length >= targetCount) break
    if (!c.matchedTarget || seenTargets.has(c.matchedTarget)) continue
    seenTargets.add(c.matchedTarget)
    take(c)
  }
  const lockedCount = picked.length

  // 2단계: 계열 라운드로빈
  const buckets = new Map()
  for (const c of candidates) {
    const key = cuisineKeyOf(c)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(c)
  }
  const cap = Math.max(1, Math.ceil(targetCount / Math.max(1, buckets.size)))
  const used = new Map()
  for (const c of picked) {
    const key = cuisineKeyOf(c)
    used.set(key, (used.get(key) || 0) + 1)
  }
  let progress = true
  while (picked.length < targetCount && progress) {
    progress = false
    for (const [key, list] of buckets) {
      if (picked.length >= targetCount) break
      if ((used.get(key) || 0) >= cap) continue
      const next = list.find((c) => !ids.has(placeIdentity(c)))
      if (!next) continue
      take(next)
      used.set(key, (used.get(key) || 0) + 1)
      progress = true
    }
  }

  // 3단계: 그래도 남으면 거리순으로 채움(입력이 이미 거리순 정렬됨을 전제)
  for (const c of candidates) {
    if (picked.length >= targetCount) break
    if (!ids.has(placeIdentity(c))) take(c)
  }

  // 고정 픽을 앞에 둬 뒤에서 잘리지 않게 보호, 나머지는 거리순 유지
  return [...picked.slice(0, lockedCount), ...picked.slice(lockedCount).sort((a, b) => a.distance - b.distance)]
}
```

## 5. 신규 `src/lib/placeDiversity.test.js`

아래 8개 케이스를 반드시 포함(간단한 mock place 객체로 `{place_name, road_address_name, category_name,
distance, matchedTarget}` 형태 사용):

1. `candidates.length <= targetCount`면 원본 그대로(순서까지) 반환.
2. 빈 배열 입력 → 빈 배열 반환.
3. 서로 다른 `matchedTarget`이 targetCount개 이상이면 1단계만으로 채워짐(2단계 미실행 확인은 불필요,
   결과 개수·타깃 다양성만 검증).
4. 카테고리가 전부 같아도(`category_name` 동일) targetCount는 채워짐(다양성보다 개수 우선 확인).
5. 카테고리 3종이 후보 수가 편중돼도(예: 한식 10개, 중식 1개, 양식 1개) 어느 계열도 `cap`을 초과해
   뽑히지 않음.
6. 모든 `matchedTarget`이 `null`/`undefined`(무결핍 BALANCED_KEYWORDS 상황) → 1단계 스킵, 2단계
   라운드로빈만으로 정상 동작.
7. `category_name`이 빈 문자열이거나 없는 후보 → "기타" 버킷으로 분류돼 결과에서 누락되지 않음.
8. 1단계 고정 픽이 거리상 더 먼 후보라도 반환 배열의 앞쪽에 위치함(뒤 트렁케이션에서 보호되는지 확인).

## 6. `searchAroundPosition` 배선 (MapPage.jsx)

```js
async function searchAroundPosition({ x, y }) {
  const category = getFoodCategory(categoryKey)

  const { keywords, targets } = await fetchSearchKeywords(top3Rows, category, { sodiumExceeded })

  const searchKeywords = [...keywords]
  if (searchKeywords.length < MAX_SEARCH_KEYWORDS) {
    const extra =
      category.key !== 'all' ? category.searchTerm : DIVERSITY_POOL.find((k) => !searchKeywords.includes(k))
    if (extra && !searchKeywords.includes(extra)) searchKeywords.push(extra)
  }

  const regionLabel = await reverseGeocode({ x, y }).catch((err) => {
    console.error('reverse geocode failed, searching without region bias:', err)
    return null
  })

  let { places: results, rawPool, pool } = await searchAndMerge({
    x, y, keywords: searchKeywords, regionLabel, categoryKey: category.key,
  })

  const diversityPool = category.key === 'all' ? DIVERSITY_POOL : category.keywords
  const categoryCount = new Set(results.map(categoryOf)).size
  if (results.length > 0 && categoryCount <= 1) {
    const extraKeyword = diversityPool.find((k) => !searchKeywords.includes(k))
    if (extraKeyword) {
      const supplement = await searchAndMerge({
        x, y, keywords: [extraKeyword], regionLabel, categoryKey: category.key, existing: results,
      })
      results = supplement.places
      rawPool = [...rawPool, ...supplement.rawPool]
      const seenPool = new Set(pool.map((p) => p.place_url || `${p.place_name}|${p.road_address_name}`))
      pool = [...pool, ...supplement.pool.filter((p) => !seenPool.has(p.place_url || `${p.place_name}|${p.road_address_name}`))]
    }
  }

  if (category.key === 'all') {
    const withTargets = pool.map((p) => ({ ...p, matchedTarget: targets.get(p.matchedKeyword) ?? null }))
    results = diversifyByCategory(withTargets, { targetCount: MAX_TOTAL_PLACES })
  }

  let filtered = results
  let categoryNotice = ''

  if (filtered.length === 0 && category.key !== 'all' && rawPool.length > 0) {
    // ... 기존 완화 로직 그대로 (변경 없음)
  }

  if (filtered.length === 0) return { places: [], categoryNotice: '' }

  let withExpected = await attachExpectedIntake(filtered, top3Rows, allergyLabels, { sodiumExceeded })
  const getMenu = (place) => place.representativeMenu
  withExpected = clampExpectedForItems(withExpected, getMenu)
  withExpected = await enrichExpectedFromDB(withExpected, getMenu)
  return { places: withExpected, categoryNotice }
}
```

파일 상단에 `import { diversifyByCategory } from '../lib/placeDiversity.js'` 추가.

`matchedTarget`을 부착한 `withTargets`를 렌더링용 `results`로 그대로 쓰지 않도록 주의: `diversifyByCategory`가
반환한 객체에 `matchedTarget` 필드가 남아 있어도 `PlaceList.jsx`/`attachExpectedIntake`는 이 필드를 읽지
않으므로 렌더링에 지장은 없다 — 굳이 벗겨낼 필요 없음(불필요한 매핑 단계 추가하지 않기).

## 7. `buildKeywordsPrompt` — '전체' 다양성 조건 추가

```js
// 62-63행 주석 갱신:
// category는 foodCategory.js의 항목. 특정 카테고리를 고르면 그 범주 조건이, '전체'면 계열 다양성
// 조건이 추가로 붙는다 — 나트륨 정상 + 카테고리 미지정일 때만 조건 없는 기본 프롬프트가 나간다.

function buildKeywordsPrompt(deficientRows, category, { sodiumExceeded = false } = {}) {
  const nutrientText = deficientRows.map((row) => `${row.label}(${row.key}) 약 ${row.deficiency}${row.unit} 부족`).join(', ')

  const extraConditions = []
  if (category.key !== 'all') {
    extraConditions.push(
      `사용자가 "${category.label}"을(를) 먹고 싶어 한다. 모든 키워드는 반드시 ${category.label} 범주 안에서 골라라 — 그 범주 안에서 위 영양소를 가장 잘 채워주는 유형을 고르면 된다.`,
    )
  } else {
    extraConditions.push(
      '키워드들이 가능하면 서로 다른 나라·계열 음식(한식/중식/일식/양식/분식/아시안/카페·디저트)에서 나오게 골라라 — 한 계열에 몰리지 않게 하되, 부족한 영양소를 채우는 게 항상 더 중요하다.',
    )
  }
  if (sodiumExceeded) {
    extraConditions.push(
      '사용자는 오늘 나트륨 섭취가 이미 권장 상한을 초과했다. 찌개·짬뽕·국밥처럼 국물 위주로 나트륨이 매우 높은 유형은 키워드로 뽑지 마라.',
    )
  }
  // 이하 동일(extraText 조립, 반환 템플릿 변경 없음)
}
```

---

## 검증 순서

1. `npx vitest run src/lib/placeDiversity.test.js` — 신규 테스트 단독 통과 확인.
2. `npx vitest run src/lib/foodCategory.test.js` — 재사용한 `matchesFoodCategory`/`FOOD_CATEGORIES`
   회귀 없는지 확인.
3. `npm run test` 전체.
4. `npm run lint`.
5. `npm run build`.
