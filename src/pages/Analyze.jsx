import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnalysisResultCard from '../components/AnalysisResultCard.jsx'
import PhotoUpload from '../components/PhotoUpload.jsx'
import LabelScan from '../components/LabelScan.jsx'
import Spinner from '../components/Spinner.jsx'
import Skeleton from '../components/Skeleton.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { pickBestFoodMatch, searchFoodDB } from '../lib/fooddb.js'
import { normalizeFoodSearchName } from '../lib/foodNameMap.js'
import { geminiCompleteWithRetry, parseJsonLoose } from '../lib/gemini.js'
import { GEMINI_TEMPERATURE, IDENTIFICATION_SCHEMA, LABEL_SCAN_SCHEMA } from '../lib/geminiSchemas.js'
import { getRecommendedMealType } from '../lib/mealType.js'
import { sumNutrients } from '../lib/mealStore.js'
import {
  clampEstimatedGrams,
  clampToPlausibleNutrients,
  fillMissingNutrients,
  isMealAnalysis,
  isNutrientSet,
  isNutrientSetOrNull,
  NUTRITION_SOURCE,
  resolveConsumedGrams,
  scaleNutrients,
} from '../lib/nutrition.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// AI에게는 "무슨 음식인지"와 "양"만 판단시킨다. 실제 영양수치는 이후 식약처 DB 조회로 채우고,
// estimatedNutrients는 DB 매칭이 실패했을 때만 쓰는 참고용 대체값이다.
const IDENTIFICATION_SYSTEM_PROMPT = `당신은 한국 음식 인식·영양 분석 전문가다. 사진 속 음식을 정확히 식별하고, 식약처 식품영양성분DB 검색에 쓸 표준 식품명과 사용자에게 보여줄 이름, 섭취량을 판단한다. DB 매칭이 실패할 경우를 대비해 참고용 영양성분 추정치도 함께 낸다. 다음 절차를 반드시 내부적으로 따른다(최종 출력은 JSON만):

1. 음식 식별: 사진 속 음식이 정확히 무엇인지, 단일 메뉴인지 여러 반찬이 있는 상차림인지 판단한다. 여러 개면 각각 분리한다. 사용자가 준 메뉴명/브랜드 힌트는 강하게 참고하되, 사진과 명백히 모순되면 사진을 우선한다.
2. DB 검색명 결정: 각 음식마다 식약처 식품영양성분DB에서 검색할 표준 일반 명칭(dbSearchName)을 정한다. 이 DB는 이름이 정확히 일치해야만 검색되고 부분(포함) 일치는 지원하지 않으니, 메뉴판 표현이 아니라 그 DB에 실제로 등록돼 있을 법한 짧고 표준적인 한식명을 써야 한다(예: "짜장면", "비빔밥", "김치찌개" 같은 대표 표준명). 브랜드명·강도 수식어(맵게/곱빼기 등)는 반드시 뺀다(예: "죠스떡볶이 매운맛" → "떡볶이"). 조리도구/재료가 붙은 변형 메뉴(예: "돌솥비빔밥", "참치김치찌개")는 dbSearchName엔 그 변형명을 그대로 쓰되, fallbackSearchName에는 반드시 그 상위 표준 카테고리명(각각 "비빔밥", "김치찌개")을 넣어 dbSearchName 검색이 실패해도 기본 음식으로는 매칭되게 한다. fallbackSearchName은 항상 dbSearchName보다 더 일반적인 이름이어야 한다.
3. 표시 이름: 사용자에게 보여줄 이름(displayName)을 정한다. 브랜드/프랜차이즈가 식별되면 "음식명 (브랜드명)" 형식으로 괄호에 브랜드를 표기하고, 아니면 음식명만 쓴다.
4. 양 추정: 사진에 보이는 양을 그램(g) 단위로 추정한다(estimatedGrams). 아래 한식 표준 1인분 기준량(그릇에 담긴 상태 기준, 국물 포함)을 기준점으로 그릇 크기·음식 높이를 보고 보수적으로 추정하고, 이 범위를 크게 벗어나지 않게 한다: 짜장면/자장면 약 650g, 비빔밥류 약 500g, 찌개류(김치찌개 등) 1인분 약 400g, 라면(국물 포함) 약 500g, 공기밥 약 210g. 목록에 없는 음식은 일반적인 한국 1인분 상식 범위로 추정한다. 비현실적으로 크거나 작은 값(예: 떡볶이 1000g)은 현실적인 1인분 범위로 스스로 보정한다.
5. 참고용 영양성분 추정(estimatedNutrients): DB 매칭이 실패하거나 일부 항목이 없을 때만 쓰이는 참고값이다. calories, protein, carbs, fat, fiber, sodium 여섯 키를 반드시 모두 포함하고, 어떤 값도 누락하거나 0으로 비워두지 말고 한국 표준 1인분 기준값으로 채운다. 나트륨과 식이섬유도 절대 생략하지 않는다.
6. 검증(sanity check): 각 값이 한국 표준 1인분의 현실 범위를 벗어나면 재조정한다. 특히 단백질과 지방을 과대추정하지 않는다. 참고 기준(1인분, 대략):
   - 짜장면/자장면: 단백질 12~16g, 탄수 110~130g, 지방 12~18g, 열량 650~800kcal, 나트륨 1200~1800mg
   - 돌솥비빔밥/비빔밥: 단백질 12~16g, 지방 8~14g, 탄수 90~110g, 열량 550~700kcal
   - 김치찌개: 단백질 12~18g, 나트륨 1500~2000mg
   - 김밥 1줄: 단백질 6~9g, 열량 320~450kcal
   - 삼겹살 1인분(150g): 단백질 25~30g, 지방 40~50g
   - 라면 1개: 단백질 10~12g, 나트륨 1500~1900mg
   이 예시는 감각을 잡기 위한 참고일 뿐, 실제 사진의 양에 맞춰 조정한다.

주의: 특정 웹사이트를 실시간 조회하는 게 아니라, 위 기준 데이터베이스 '수준'의 표준값에 맞춰 추정하라는 의미다. 계산 근거나 설명은 출력하지 말고 JSON만 반환한다.`

function buildIdentificationPrompt(menuName, brand) {
  const hints = []
  if (menuName) hints.push(`메뉴명 힌트: ${menuName}`)
  if (brand) hints.push(`브랜드 힌트: ${brand}`)
  const hintText = hints.length ? `\n${hints.join('\n')}` : ''

  return `이 음식 사진을 분석해서 각 음식을 식별해줘.${hintText}

설명이나 마크다운, 계산 근거 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "items": [
    {
      "dbSearchName": "식약처 식품영양성분DB 검색용 표준 식품명",
      "fallbackSearchName": "dbSearchName 검색 실패 시 쓸 더 일반적인 대체 검색명",
      "displayName": "사용자에게 보여줄 이름(브랜드가 있으면 \\"음식명 (브랜드명)\\" 형식)",
      "estimatedGrams": 0,
      "estimatedNutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
    }
  ]
}`
}

function isIdentificationResult(value) {
  return (
    Boolean(value) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(
      (item) =>
        item &&
        typeof item.dbSearchName === 'string' &&
        typeof item.displayName === 'string' &&
        typeof item.estimatedGrams === 'number' &&
        isNutrientSet(item.estimatedNutrients),
    )
  )
}

// displayName이 "음식명 (브랜드명)" 형식이면 괄호 안 브랜드를 뽑아낸다(출처 배지 판정용).
function extractBrand(displayName) {
  const match = /\(([^)]+)\)\s*$/.exec(displayName || '')
  return match ? match[1] : null
}

// 식약처 DB는 이름이 정확히 일치해야만 검색되고(부분/포함 일치 없음) 접두 수식어의 띄어쓰기까지 등록된
// 표기와 달라도 실패한다(예: "돌솥비빔밥"은 0건, DB에는 "돌솥 비빔밥"으로 등록). dbSearchName이 2글자
// 수식어+기본 음식명 형태의 복합어(예: "돌솥비빔밥", "참치김치찌개")인데 그 자체로 매칭되지 않으면, 앞
// 2글자를 뗀 기본 음식명("비빔밥", "김치찌개")으로도 한 번 더 시도해 AI의 fallbackSearchName이 충분히
// 일반적이지 않은 경우까지 보완한다.
function stripLeadingModifier(term) {
  return typeof term === 'string' && term.length >= 5 ? term.slice(2) : null
}

// DB 검색 우선순위: ① dbSearchName-음식 ② 정규화 표준명(foodNameMap)-음식 ③ dbSearchName-가공식품
// ④ dbSearchName 수식어 제거-음식 ⑤ fallbackSearchName-음식 ⑥ 정규화 표준명-가공식품 ⑦ fallbackSearchName-가공식품.
// 정규화 표준명은 AI의 fallbackSearchName이 충분히 일반적이지 않을 때를 대비한 클라이언트 측 안전망
// (foodNameMap.js). 가공식품 DB는 편의점/포장/프랜차이즈 제품처럼 "음식"(조리식) DB에 없는 제품을 보완한다.
// 같은 (검색어, DB) 조합은 한 번만 호출하도록 중복을 제거해 불필요한 반복 요청을 막는다.
async function findFoodMatch(idItem) {
  const normalized = normalizeFoodSearchName(idItem.dbSearchName) || normalizeFoodSearchName(idItem.displayName)
  const attempts = [
    { term: idItem.dbSearchName, dbSource: 'food' },
    { term: normalized, dbSource: 'food' },
    { term: idItem.dbSearchName, dbSource: 'process' },
    { term: stripLeadingModifier(idItem.dbSearchName), dbSource: 'food' },
    { term: idItem.fallbackSearchName, dbSource: 'food' },
    { term: normalized, dbSource: 'process' },
    { term: idItem.fallbackSearchName, dbSource: 'process' },
  ]

  const seen = new Set()
  for (const attempt of attempts) {
    if (!attempt.term) continue
    const key = `${attempt.dbSource}:${attempt.term}`
    if (seen.has(key)) continue
    seen.add(key)
    try {
      const results = await searchFoodDB(attempt.term, attempt.dbSource)
      const match = pickBestFoodMatch(results, attempt.term, { averageExactMatches: attempt.dbSource === 'food' })
      if (match) return { match, dbSource: attempt.dbSource, matchedTerm: attempt.term }
    } catch (err) {
      console.error(`fooddb search failed (${attempt.dbSource}, ${attempt.term}):`, err)
      // 식약처 서버 연결 자체가 안 되는 상황(배포 리전 등)이면 나머지 소스/재검색어도 똑같이
      // 실패할 뿐이니 즉시 포기하고 AI 추정치 폴백으로 넘어간다. "결과 없음"은 이 코드가 아니므로
      // 계속 다음 시도로 진행한다.
      if (err.code === 'FOODDB_CONNECTION_FAILED') break
    }
  }

  return null
}

// AI가 식별한 음식 하나를 식약처 DB(음식→가공식품 순)로 조회해 실제 영양수치를 채운다.
// 전부 매칭에 실패하면 AI의 참고용 추정치(estimatedNutrients)를 그대로 쓴다.
async function resolveFoodItem(idItem) {
  const name = idItem.displayName || idItem.dbSearchName
  const found = await findFoodMatch(idItem)

  if (found) {
    const { match, dbSource, matchedTerm } = found
    const baseValue = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
    const grams = resolveConsumedGrams(match, idItem.estimatedGrams, idItem.dbSearchName)
    const scaled = scaleNutrients(match.nutrients, baseValue, grams)
    const source = dbSource === 'process' ? NUTRITION_SOURCE.DB_PROCESS : NUTRITION_SOURCE.DB
    const nutrients = clampToPlausibleNutrients(fillMissingNutrients(scaled, idItem.estimatedNutrients), idItem.dbSearchName, grams)
    // 개발 중 정확도 점검용(운영 빌드에선 출력 안 함): 어떤 검색어로 DB 매칭됐는지, 추정 g, 최종 수치.
    logAnalysisDebug(name, { matched: true, dbSource, matchedTerm, grams, estimatedGrams: idItem.estimatedGrams, nutrients })
    return { name, nutrients, source }
  }

  const brand = extractBrand(name)
  const source = brand ? NUTRITION_SOURCE.OFFICIAL : NUTRITION_SOURCE.ESTIMATED
  const grams = clampEstimatedGrams(idItem.estimatedGrams, idItem.dbSearchName)
  const nutrients = clampToPlausibleNutrients(fillMissingNutrients({}, idItem.estimatedNutrients), idItem.dbSearchName, grams)
  // DB 매칭 전부 실패 → AI 추정치 폴백. 이런 로그가 자주 뜨면 DB 검색명 매핑을 손봐야 한다는 신호다.
  logAnalysisDebug(name, { matched: false, dbSearchName: idItem.dbSearchName, fallbackSearchName: idItem.fallbackSearchName, grams, estimatedGrams: idItem.estimatedGrams, nutrients, source })
  return { name, nutrients, source }
}

// 정확도 진단용 로그(개발 빌드에서만). 어떤 경로로 수치가 나왔는지 콘솔에 남겨, 오차가 나는 음식을
// 찾아 PORTION_REFERENCE_G/NUTRIENT_PLAUSIBILITY/foodNameMap을 보강하는 근거로 쓴다.
function logAnalysisDebug(name, info) {
  if (!import.meta.env.DEV) return
  console.log(`[분석 진단] ${name}`, info)
}

// 사진 없이 메뉴명(+브랜드)만으로 분석하는 텍스트 경로의 식별 프롬프트. 예전에는 AI가 한 번에
// items+nutrients를 내고 그 추정치를 그대로 썼지만, 그러면 같은 "김치찌개"를 사진으로 찍었을 때와
// 타이핑했을 때 수치가 달라진다(신뢰도 문제). 지금은 사진 경로와 동일하게 AI에게는 식별
// (dbSearchName/fallbackSearchName/표준 1인분 그램)만 시키고, 실제 수치는 식약처 DB 조회
// (resolveFoodItem — 사진 경로와 같은 함수)로 채운다. estimatedNutrients는 DB 매칭 실패 시 폴백.
// ※ 절차 2·5·6번의 문구는 IDENTIFICATION_SYSTEM_PROMPT(사진 경로)와 같은 규칙이다 — 한쪽을
//   고치면 다른 쪽도 함께 검토할 것.
const TEXT_IDENTIFICATION_SYSTEM_PROMPT = `당신은 한국 음식 인식·영양 분석 전문가다. 사용자가 입력한 메뉴명(과 선택적 브랜드)만 보고, 식약처 식품영양성분DB 검색에 쓸 표준 식품명과 사용자에게 보여줄 이름, 섭취량을 판단한다. DB 매칭이 실패할 경우를 대비해 참고용 영양성분 추정치도 함께 낸다. 다음 절차를 반드시 내부적으로 따른다(최종 출력은 JSON만):

1. 음식 식별: 메뉴명에 여러 음식이 언급되면(예: "김밥, 라면") 각각 분리해서 items에 담는다.
2. DB 검색명 결정: 각 음식마다 식약처 식품영양성분DB에서 검색할 표준 일반 명칭(dbSearchName)을 정한다. 이 DB는 이름이 정확히 일치해야만 검색되고 부분(포함) 일치는 지원하지 않으니, 메뉴판 표현이 아니라 그 DB에 실제로 등록돼 있을 법한 짧고 표준적인 한식명을 써야 한다(예: "짜장면", "비빔밥", "김치찌개" 같은 대표 표준명). 브랜드명·강도 수식어(맵게/곱빼기 등)는 반드시 뺀다(예: "죠스떡볶이 매운맛" → "떡볶이"). 조리도구/재료가 붙은 변형 메뉴(예: "돌솥비빔밥", "참치김치찌개")는 dbSearchName엔 그 변형명을 그대로 쓰되, fallbackSearchName에는 반드시 그 상위 표준 카테고리명(각각 "비빔밥", "김치찌개")을 넣어 dbSearchName 검색이 실패해도 기본 음식으로는 매칭되게 한다. fallbackSearchName은 항상 dbSearchName보다 더 일반적인 이름이어야 한다.
3. 표시 이름: 사용자에게 보여줄 이름(displayName)을 정한다. 브랜드가 주어졌거나 메뉴명에서 브랜드/프랜차이즈가 식별되면 "음식명 (브랜드명)" 형식으로 괄호에 브랜드를 표기하고, 아니면 음식명만 쓴다.
4. 양 추정: 사진이 없으므로 그 음식의 "한국 표준 1인분" 무게를 그램(g) 단위로 추정한다(estimatedGrams). 참고 기준(그릇에 담긴 상태, 국물 포함): 짜장면/자장면 약 650g, 비빔밥류 약 500g, 찌개류(김치찌개 등) 1인분 약 400g, 라면(국물 포함) 약 500g, 공기밥 약 210g. 목록에 없는 음식은 일반적인 한국 1인분 상식 범위로 추정한다.
5. 참고용 영양성분 추정(estimatedNutrients): DB 매칭이 실패하거나 일부 항목이 없을 때만 쓰이는 참고값이다. calories, protein, carbs, fat, fiber, sodium 여섯 키를 반드시 모두 포함하고, 어떤 값도 누락하거나 0으로 비워두지 말고 한국 표준 1인분 기준값으로 채운다. 나트륨과 식이섬유도 절대 생략하지 않는다. 브랜드가 주어지면 그 브랜드/프랜차이즈의 실제 메뉴 특성을 반영한다.
6. 검증(sanity check): 각 값이 한국 표준 1인분의 현실 범위를 벗어나면 재조정한다. 특히 단백질과 지방을 과대추정하지 않는다.

주의: 특정 웹사이트를 실시간 조회하는 게 아니라, 표준 데이터베이스 '수준'의 기준값에 맞춰 추정하라는 의미다. 계산 근거나 설명은 출력하지 말고 JSON만 반환한다.`

function buildTextIdentificationPrompt(menuName, brand) {
  const brandLine = brand ? `\n브랜드: ${brand}` : ''
  return `다음 메뉴를 분석해서 각 음식을 식별해줘.\n메뉴명: ${menuName}${brandLine}

설명이나 마크다운, 계산 근거 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "items": [
    {
      "dbSearchName": "식약처 식품영양성분DB 검색용 표준 식품명",
      "fallbackSearchName": "dbSearchName 검색 실패 시 쓸 더 일반적인 대체 검색명",
      "displayName": "사용자에게 보여줄 이름(브랜드가 있으면 \\"음식명 (브랜드명)\\" 형식)",
      "estimatedGrams": 0,
      "estimatedNutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
    }
  ]
}`
}

// 텍스트 경로도 사진 경로와 동일한 2단계 구조다: AI 식별 → 식약처 DB 조회(resolveFoodItem 공유).
// 같은 음식이면 사진으로 찍든 타이핑하든 (그램수가 같다면) 같은 수치가 나온다. 출처 배지도 동일하게
// 식약처DB/식약처DB(가공)/공식/추정으로 판정된다. 순수 계산 함수라 상태를 직접 건드리지 않고
// MealAnalysis를 반환하거나(실패 시) 던진다 — handleAnalyze가 사진 유무로 경로를 고른다.
async function resolveTextAnalysis(menuName, brand) {
  let text
  try {
    text = await geminiCompleteWithRetry({
      prompt: buildTextIdentificationPrompt(menuName, brand),
      system: TEXT_IDENTIFICATION_SYSTEM_PROMPT,
      schema: IDENTIFICATION_SCHEMA,
      schemaName: 'food_identification',
      temperature: GEMINI_TEMPERATURE.identification,
    })
  } catch (err) {
    console.error('text meal analysis (gemini) failed:', err)
    if (err.status === 429) {
      throw new Error('요청이 많아 지연되고 있어요. 잠시 후 다시 시도해주세요.')
    }
    throw new Error('분석 요청에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }

  const identified = parseJsonLoose(text)
  if (!isIdentificationResult(identified)) {
    throw new Error('분석 결과 형식이 올바르지 않습니다. 다시 시도해주세요.')
  }

  // 사진 경로와 같은 절차: 항목별 식약처 DB 조회 → 그램 환산 → 현실 범위 보정 → 클라이언트 합산.
  const items = await Promise.all(identified.items.map(resolveFoodItem))
  const parsed = { items, total: sumNutrients(items) }

  if (!isMealAnalysis(parsed)) {
    throw new Error('영양 계산 결과 형식이 올바르지 않습니다.')
  }

  return parsed
}

// 영양성분표(포장지 뒷면) 사진에서 표기된 수치를 "그대로 추출"한다 — 추정이 아니다. 표에 없는 값은
// null로 남겨야 하므로, 이 경로의 아이템은 isNutrientSet이 아니라 isNutrientSetOrNull로 검증한다.
//
// 라벨의 영양성분 수치는 보통 "1회 제공량"(예: 30g) 기준으로 인쇄돼 있는데, 실제로는 포장 전체
// (총 내용량, 예: 137g)를 먹는 경우가 많다. 그래서 1회 제공량 수치는 그대로 추출하되, 사진에
// "총 내용량"도 함께 보이면 별도로 읽어서(servingSize/totalWeight) 아래 resolveLabelScan에서
// 식약처 DB 스케일링과 동일한 scaleNutrients로 총량 기준으로 환산한다. 총 내용량을 못 찾으면
// 라벨에 인쇄된 값(1회 제공량 기준) 그대로 쓴다 — 없는 값을 만들어내지 않는다는 원칙은 유지한다.
const LABEL_SCAN_SYSTEM_PROMPT = `당신은 포장식품 영양성분표를 정확히 읽어내는 전문가다. 사진 속 영양성분표(포장지 뒷면 등)에 인쇄된 수치를 표기된 그대로 옮겨 적는다. 절대 추정하지 않는다 — 표에 명시된 숫자만 쓰고, 표에 없거나 흐릿해서 읽을 수 없는 항목은 반드시 null로 남긴다. 영양성분 수치는 "1회 제공량" 기준 값을 우선 쓰고, 100g당 수치와 1회 제공량 수치가 함께 있으면 1회 제공량 쪽을 쓴다. 이와 별개로, 사진에 "1회 제공량"(예: 30g)과 "총 내용량"(예: 137g)이 함께 보이면 그 두 값도 각각 servingSize/totalWeight에 그램(g) 단위로 담아라 — 안 보이면 null로 남긴다. 설명이나 마크다운, 계산 근거 없이 JSON만 반환한다.`

function buildLabelScanPrompt() {
  return `이 영양성분표 사진을 읽어서 표기된 수치를 그대로 추출해줘.

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "source": "label",
  "servingSize": { "value": 0, "unit": "g" },
  "totalWeight": { "value": 0, "unit": "g" },
  "items": [
    { "name": "제품명(표에 있으면, 없으면 \\"영양성분표\\")", "brand": "브랜드명(표에 없으면 null)", "nutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 } }
  ],
  "total": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
}
표에서 찾을 수 없는 값은 반드시 null로 남겨라(추정해서 채우지 마라). servingSize/totalWeight를 사진에서 못 찾으면 각각 null로 남겨라.`
}

function isLabelScanResult(value) {
  return (
    Boolean(value) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every((item) => item && typeof item.name === 'string' && isNutrientSetOrNull(item.nutrients))
  )
}

// 사진 경로·텍스트 경로와 달리 식별/추정이 아니라 "읽기"라서 결과의 source는 항상 LABEL로 고정한다.
async function resolveLabelScan(photo) {
  let text
  try {
    text = await geminiCompleteWithRetry({
      prompt: buildLabelScanPrompt(),
      system: LABEL_SCAN_SYSTEM_PROMPT,
      imageBase64: photo.base64,
      mimeType: photo.mimeType,
      schema: LABEL_SCAN_SCHEMA,
      schemaName: 'label_scan',
      temperature: GEMINI_TEMPERATURE.labelScan,
    })
  } catch (err) {
    console.error('label scan (gemini) failed:', err)
    if (err.status === 429) {
      throw new Error('요청이 많아 지연되고 있어요. 잠시 후 다시 시도해주세요.')
    }
    throw new Error('스캔 요청에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }

  const raw = parseJsonLoose(text)
  if (!isLabelScanResult(raw)) {
    throw new Error('영양성분표를 읽지 못했습니다. 표가 잘 보이게 다시 찍어주세요.')
  }

  // 사진에 1회 제공량과 총 내용량이 함께 보였다면 총량 기준으로 환산한다(식약처 DB 스케일링과
  // 동일하게 scaleNutrients 재사용 — null은 그대로 null로 보존됨). 단위가 다르면(예: g vs ml)
  // 안전하게 스케일을 건너뛰고, 총 내용량을 못 찾았거나 1회 제공량과 값이 같으면 라벨 그대로 쓴다.
  const servingSize = raw.servingSize?.value
  const totalWeight = raw.totalWeight?.value
  const sameUnit = !raw.servingSize?.unit || !raw.totalWeight?.unit || raw.servingSize.unit === raw.totalWeight.unit
  const canScale =
    typeof servingSize === 'number' && servingSize > 0 &&
    typeof totalWeight === 'number' && totalWeight > 0 &&
    sameUnit && totalWeight !== servingSize

  const items = raw.items.map((item) => {
    const nutrients = canScale ? scaleNutrients(item.nutrients, servingSize, totalWeight) : item.nutrients
    const name = canScale ? `${item.name} (${totalWeight}${raw.totalWeight.unit || 'g'} 전체 기준)` : item.name
    return {
      name,
      brand: item.brand || null,
      nutrients,
      source: NUTRITION_SOURCE.LABEL,
    }
  })
  // null은 여기서도 0으로 뭉개지 않고 그대로 둔다(sumNutrients가 null을 0으로 취급해 합산하는 건
  // 기존 관례 그대로이고, 화면 표시 단계(NutritionCard)에서만 '-'로 보여준다).
  const total = sumNutrients(items)
  const parsed = { source: 'label', items, total }

  if (!isMealAnalysis(parsed)) {
    throw new Error('영양 계산 결과 형식이 올바르지 않습니다.')
  }

  return parsed
}

const SEX_PROMPT_OPTIONS = [
  { key: 'male', label: '남성' },
  { key: 'female', label: '여성' },
]

// 프로필(나이·키·몸무게)이 없는 게스트에게 홈 진입 시 1회 성별만 물어, 표준 성인 가정값으로
// 임시 recommended를 계산할 수 있게 한다(정확한 값은 /profile 입력 시 대체됨).
function SexPromptCard({ onPick }) {
  return (
    <Card style={{ background: colors.primarySurface, boxShadow: 'none' }}>
      <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textStrong, fontWeight: 600 }}>
        성별을 알려주시면 맞춤 기준으로 부족한 영양소를 알려드려요
      </p>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        {SEX_PROMPT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className="tds-press"
            onClick={() => onPick(opt.key)}
            style={{
              flex: 1,
              padding: `${spacing.md}px 0`,
              borderRadius: radius.sm,
              border: 'none',
              background: colors.surface,
              color: colors.textStrong,
              fontWeight: 700,
              fontSize: font.size.md,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.textSub, fontSize: font.size.xs }}>
        나중에 프로필을 입력하면 더 정확한 기준으로 바뀌어요.
      </p>
    </Card>
  )
}

const ANALYZE_MODES = [
  { key: 'food', label: '음식 분석' },
  { key: 'label', label: '영양성분표 스캔' },
]

// 사진/텍스트(둘은 이미 하나로 합쳐진 "음식 분석")와 라벨 스캔을 탭으로 명확히 구분한다.
// Profile.jsx의 SegmentedControl과 같은 톤(선택된 탭만 채운 배경)을 재사용한다.
// disabled: 분석 중이거나 결과를 띄워둔 동안에는 탭을 잠근다 — 탭을 바꿔도 결과 카드는 같은 자리를
// 지키므로, 잠그지 않으면 "라벨 스캔 탭인데 사진 분석 결과가 떠 있는" 어긋난 상태가 보인다.
function ModeTabs({ mode, onChange, disabled = false }) {
  return (
    <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
      {ANALYZE_MODES.map((m) => {
        const active = mode === m.key
        return (
          <button
            key={m.key}
            type="button"
            className="tds-press"
            onClick={() => onChange(m.key)}
            disabled={disabled}
            style={{
              flex: 1,
              padding: `${spacing.md}px 0`,
              borderRadius: radius.sm,
              border: 'none',
              background: active ? colors.primary : colors.bg,
              color: active ? '#fff' : colors.textStrong,
              fontWeight: 700,
              fontSize: font.size.md,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled && !active ? 0.5 : 1,
            }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

// ANALYZING 상태에서 촬영 카드 자리를 그대로 차지한다. 사진이 있으면 그 사진 위에 로딩 오버레이를
// 얹어 "지금 이 사진을 보고 있다"를 그대로 보여주고, 사진 없이 메뉴 이름만으로 분석하는 경우엔
// 스켈레톤 몇 줄로 대신한다.
function AnalyzingPreview({ photoUrl }) {
  return (
    <div>
      {photoUrl ? (
        <div style={{ position: 'relative', borderRadius: radius.md, overflow: 'hidden' }}>
          <img src={photoUrl} alt="분석 중인 사진" style={{ width: '100%', display: 'block' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(25, 31, 40, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.md,
            }}
          >
            <Spinner size={32} />
            <span style={{ color: '#fff', fontSize: font.size.md, fontWeight: 700 }}>분석 중이에요...</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            minHeight: 160,
            borderRadius: radius.md,
            background: colors.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
          }}
        >
          <Spinner size={32} />
          <span style={{ color: colors.textSub, fontSize: font.size.md, fontWeight: 700 }}>분석 중이에요...</span>
        </div>
      )}

      <div style={{ marginTop: spacing.lg }} aria-hidden="true">
        <Skeleton height={20} width="55%" style={{ marginBottom: spacing.md }} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={14} style={{ marginBottom: spacing.sm }} />
        ))}
      </div>
    </div>
  )
}

// 홈 탭 분석 영역의 3가지 상태. 불리언 여러 개(loading && result 같은)를 조합하면 "로딩 중인데 결과도
// 있는" 불가능한 조합이 표현돼버려서, 어느 카드를 그릴지 판단이 화면 곳곳으로 흩어진다. 명시적 상태값
// 하나로 두면 한 자리에서 카드가 전환되는 이 UI의 규칙이 그대로 코드에 드러난다.
const STATUS = {
  IDLE: 'idle', // 촬영 카드 + 입력 + [분석하기]
  ANALYZING: 'analyzing', // 같은 자리에 로딩 오버레이
  RESULT: 'result', // 같은 자리에 결과 카드
}

export default function Analyze() {
  const { authUser, profile, tempSex, setTodayMeal, addTodayMeal, setTempSex } = useUser()
  const { showToast } = useToast()
  const navigate = useNavigate()
  // 닉네임 > 아이디 순으로 고른 표시 이름(authUser.displayName). 인증용 합성 이메일은 화면에 쓰지 않는다.
  const greetingName = authUser?.displayName ?? '게스트'
  const showSexPrompt = !profile && !tempSex
  const [mode, setMode] = useState('food') // 'food'(사진+텍스트, 이미 하나로 합쳐진 경로) | 'label'(영양성분표 스캔)
  const [status, setStatus] = useState(STATUS.IDLE)
  const [photo, setPhoto] = useState(null) // { base64, mimeType, dataUrl, width, height }
  const [menuName, setMenuName] = useState('')
  const [brand, setBrand] = useState('')
  const [error, setError] = useState('')
  // 분석은 끝났지만 아직 저장 전인 결과(식사 시간대 확정 대기).
  const [pendingAnalysis, setPendingAnalysis] = useState(null)
  const [mealType, setMealType] = useState(() => getRecommendedMealType())
  const [saving, setSaving] = useState(false)
  // PhotoUpload는 미리보기를 내부 state로 들고 있어서 부모가 직접 지울 수 없다. "다시 찍기"에서 이 값을
  // 올려 컴포넌트를 새로 마운트시키는 방식으로 초기화한다.
  const [photoResetKey, setPhotoResetKey] = useState(0)

  // 결과 카드 썸네일용. 사진 경로면 분석에 쓴 사진, 라벨 스캔이면 스캔한 사진, 텍스트 경로면 null이다.
  // PhotoUpload가 canvas.toDataURL로 만든 **data URL**이라 URL.revokeObjectURL 대상이 아니다
  // (objectURL이 아니라 문자열이라 참조가 끊기면 그대로 회수된다). 상태를 비우는 것으로 충분하다.
  const [resultPhotoUrl, setResultPhotoUrl] = useState(null)

  // IDLE로 되돌리며 입력까지 전부 비운다. 저장 완료와 "다시 찍기"가 공유한다.
  function resetToIdle() {
    setStatus(STATUS.IDLE)
    setPendingAnalysis(null)
    setResultPhotoUrl(null)
    setPhoto(null)
    setMenuName('')
    setBrand('')
    setError('')
    setMealType(getRecommendedMealType())
    setPhotoResetKey((k) => k + 1)
  }

  // 사진이 있으면 기존 식별→식약처DB조회 경로, 없으면 메뉴 이름만으로 바로 추정하는 텍스트 경로를 탄다.
  // 최소한 사진 또는 메뉴 이름 중 하나는 있어야 한다.
  async function handleAnalyze() {
    setError('')

    const trimmedMenuName = menuName.trim()
    if (!photo && !trimmedMenuName) {
      setError('사진을 업로드하거나 메뉴 이름을 입력해주세요.')
      return
    }

    setStatus(STATUS.ANALYZING)
    try {
      let parsed
      if (photo) {
        const prompt = buildIdentificationPrompt(menuName, brand)
        // 429(레이트리밋)면 gemini.js의 재시도 헬퍼가 지수 백오프로 재시도한다 — 텍스트/라벨 경로와 동일.
        const text = await geminiCompleteWithRetry({
          prompt,
          system: IDENTIFICATION_SYSTEM_PROMPT,
          imageBase64: photo.base64,
          mimeType: photo.mimeType,
          schema: IDENTIFICATION_SCHEMA,
          schemaName: 'food_identification',
          temperature: GEMINI_TEMPERATURE.identification,
        })
        const identified = parseJsonLoose(text)

        if (!isIdentificationResult(identified)) {
          throw new Error('분석 결과 형식이 올바르지 않습니다.')
        }

        const items = await Promise.all(identified.items.map(resolveFoodItem))
        parsed = { items, total: sumNutrients(items) }

        if (!isMealAnalysis(parsed)) {
          throw new Error('영양 계산 결과 형식이 올바르지 않습니다.')
        }
      } else {
        parsed = await resolveTextAnalysis(trimmedMenuName, brand.trim())
      }

      setPendingAnalysis(parsed)
      setResultPhotoUrl(photo?.dataUrl ?? null)
      // 결과를 보여주는 시점에 시간대 추천을 다시 계산한다(카드를 띄워둔 채 시간이 흐른 경우 대비).
      setMealType(getRecommendedMealType())
      setStatus(STATUS.RESULT)
    } catch (err) {
      console.error('meal analysis failed:', err)
      // 실패하면 입력값은 그대로 둔 채 IDLE로 되돌린다 — 사진/메뉴 이름을 다시 넣게 하지 않는다.
      setStatus(STATUS.IDLE)
      showToast(err.message || '분석에 실패했습니다. 잠시 후 다시 시도해주세요.', { tone: 'error' })
    }
  }

  // 영양성분표 스캔도 같은 상태 머신을 공유한다 — 어느 탭에서 만든 결과든 같은 자리에서 결과 카드로
  // 전환되고, 이후 시간대 선택→저장까지 동일한 흐름을 탄다.
  // (LabelScan은 자체 버튼/에러 표시를 갖고 있어 여기서는 실패를 다시 던져 그쪽이 보여주게 둔다.)
  async function handleLabelScan(scanPhoto) {
    setStatus(STATUS.ANALYZING)
    try {
      const parsed = await resolveLabelScan(scanPhoto)
      setPendingAnalysis(parsed)
      setResultPhotoUrl(scanPhoto?.dataUrl ?? null)
      setMealType(getRecommendedMealType())
      setStatus(STATUS.RESULT)
    } catch (err) {
      setStatus(STATUS.IDLE)
      throw err
    }
  }

  async function handleConfirmSave() {
    if (!pendingAnalysis || saving) return

    // 이번 식사의 모든 음식에 같은 시간대(mealType)를 붙인다. 합계(total)는 그대로 두어 mealType이 영향을 주지 않는다.
    const items = pendingAnalysis.items.map((item) => ({ ...item, mealType }))
    const parsed = { items, total: pendingAnalysis.total }

    setSaving(true)
    try {
      // 이번 분석에서 나온 음식 전체를 하나의 끼니 기록으로 저장
      // (음식이 1개면 단일 메뉴, 2개 이상이면 한 끼 세트로 식단 탭에서 구분해 보여준다)
      await addTodayMeal(parsed.items, mealType)
      setTodayMeal(parsed)
      resetToIdle()
      // 결과 카드가 사라지므로 "오늘의 영양 진단 보기" 진입점을 토스트 액션으로 남긴다.
      showToast('식단이 저장되었습니다', {
        tone: 'success',
        action: { label: '영양 진단 보기', onClick: () => navigate('/result') },
      })
    } catch (err) {
      showToast(err.message || '저장에 실패했어요. 잠시 후 다시 시도해주세요.', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title={`안녕하세요, ${greetingName}님 👋`} subtitle="오늘 점심을 찍어볼까요?" />

      {/* 분석 중에는 탭을 바꿔 결과가 뒤섞이지 않게 잠근다. */}
      <ModeTabs mode={mode} onChange={setMode} disabled={status !== STATUS.IDLE} />

      {/* ── 분석 영역: 이 한 자리가 상태에 따라 촬영 카드 / 로딩 / 결과 카드로 바뀐다 ── */}
      {status === STATUS.RESULT ? (
        <AnalysisResultCard
          analysis={pendingAnalysis}
          photoUrl={resultPhotoUrl}
          mealType={mealType}
          recommendedMealType={getRecommendedMealType()}
          onMealTypeChange={setMealType}
          onSave={handleConfirmSave}
          onRetake={resetToIdle}
          saving={saving}
        />
      ) : mode === 'food' ? (
        // key={status}: IDLE과 ANALYZING이 같은 <Card>라 React가 DOM 노드를 재사용하는데, 그러면
        // 전환 애니메이션(.tds-card-swap)이 처음 한 번만 재생되고 상태가 바뀔 때는 다시 돌지 않는다.
        // key를 상태로 두면 노드가 새로 만들어져 매 전환마다 정확히 한 번 재생된다.
        <Card key={status} className="tds-card-swap">
          {status === STATUS.ANALYZING ? (
            <AnalyzingPreview photoUrl={photo?.dataUrl ?? null} />
          ) : (
            <>
              <PhotoUpload key={photoResetKey} onChange={setPhoto} />

              <div style={{ marginTop: spacing.lg }}>
                <TextField
                  label="메뉴 이름(사진 없이 분석 가능)"
                  id="menuName"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                />
                <TextField label="브랜드 (선택)" id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
            </>
          )}

          <AppButton onClick={handleAnalyze} disabled={status === STATUS.ANALYZING} style={{ marginTop: spacing.lg }}>
            {status === STATUS.ANALYZING && <Spinner size={16} />}
            {status === STATUS.ANALYZING ? '분석 중...' : error ? '다시 시도' : '분석하기'}
          </AppButton>

          {error && <p style={styles.errorText}>{error}</p>}
        </Card>
      ) : (
        <Card className="tds-card-swap">
          <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
            영양성분표 스캔
          </h3>
          <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
            포장지 뒷면 영양성분표를 촬영하면 표기된 수치를 그대로 읽어드려요. 추정이 아니라 추출이라
            표에 없는 값은 '-'로 남아요. "1회 제공량"과 "총 내용량"이 함께 보이면 포장 전체를 먹는
            기준으로 자동 환산해요.
          </p>
          {/* key: LabelScan은 사진/에러를 자체 state로 들고 있어 부모가 직접 비울 수 없다.
              저장·다시 찍기로 resetToIdle이 돌면 이 값이 올라가 컴포넌트가 새로 마운트되면서
              직전에 스캔한 사진이 남아있지 않게 된다(사진 분석 탭의 PhotoUpload와 같은 방식). */}
          <LabelScan key={photoResetKey} onScan={handleLabelScan} />
        </Card>
      )}

      {showSexPrompt && <SexPromptCard onPick={setTempSex} />}
    </div>
  )
}
