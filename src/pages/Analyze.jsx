import { useState } from 'react'
import { Link } from 'react-router-dom'
import PhotoUpload from '../components/PhotoUpload.jsx'
import LabelScan from '../components/LabelScan.jsx'
import MealTypePicker from '../components/MealTypePicker.jsx'
import NutritionCard from '../components/NutritionCard.jsx'
import Spinner from '../components/Spinner.jsx'
import Skeleton from '../components/Skeleton.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { useUser } from '../context/UserContext.jsx'
import { pickBestFoodMatch, searchFoodDB } from '../lib/fooddb.js'
import { geminiComplete, parseJsonLoose } from '../lib/gemini.js'
import { getRecommendedMealType } from '../lib/mealType.js'
import { sumNutrients } from '../lib/mealStore.js'
import {
  calcAchievementPercent,
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
import { saveRecord, toDateKey } from '../lib/records.js'
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

// DB 검색 우선순위: ① dbSearchName-음식 ② dbSearchName-가공식품 ③ dbSearchName 수식어 제거-음식
// ④ fallbackSearchName-음식 ⑤ fallbackSearchName-가공식품. 가공식품 DB는 편의점/포장/프랜차이즈 제품처럼
// "음식"(조리식) DB에 없는 제품을 보완하는 폴백이다.
async function findFoodMatch(idItem) {
  const attempts = [
    { term: idItem.dbSearchName, dbSource: 'food' },
    { term: idItem.dbSearchName, dbSource: 'process' },
    { term: stripLeadingModifier(idItem.dbSearchName), dbSource: 'food' },
    { term: idItem.fallbackSearchName, dbSource: 'food' },
    { term: idItem.fallbackSearchName, dbSource: 'process' },
  ]

  for (const attempt of attempts) {
    if (!attempt.term) continue
    try {
      const results = await searchFoodDB(attempt.term, attempt.dbSource)
      const match = pickBestFoodMatch(results, attempt.term, { averageExactMatches: attempt.dbSource === 'food' })
      if (match) return { match, dbSource: attempt.dbSource }
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
    const { match, dbSource } = found
    const baseValue = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
    const grams = resolveConsumedGrams(match, idItem.estimatedGrams, idItem.dbSearchName)
    const scaled = scaleNutrients(match.nutrients, baseValue, grams)
    const source = dbSource === 'process' ? NUTRITION_SOURCE.DB_PROCESS : NUTRITION_SOURCE.DB
    const nutrients = clampToPlausibleNutrients(fillMissingNutrients(scaled, idItem.estimatedNutrients), idItem.dbSearchName, grams)
    return { name, nutrients, source }
  }

  const brand = extractBrand(name)
  const source = brand ? NUTRITION_SOURCE.OFFICIAL : NUTRITION_SOURCE.ESTIMATED
  const grams = clampEstimatedGrams(idItem.estimatedGrams, idItem.dbSearchName)
  const nutrients = clampToPlausibleNutrients(fillMissingNutrients({}, idItem.estimatedNutrients), idItem.dbSearchName, grams)
  return { name, nutrients, source }
}

// 사진 없이 메뉴명(+브랜드)만으로 "표준 1인분" 기준 영양을 바로 추정한다. 사진 경로
// (IDENTIFICATION_SYSTEM_PROMPT)와 달리 그램 추정이나 식약처 DB 매칭이 필요 없어, AI가 한 번에
// items+nutrients를 내도록 구조를 단순하게 유지한다.
const TEXT_ANALYSIS_SYSTEM_PROMPT = `당신은 한국 음식 영양 분석 전문가다. 사용자가 입력한 메뉴명(과 선택적 브랜드)만 보고 그 음식의 "한국 표준 1인분"을 기준으로 영양성분을 추정한다. 수치는 식품의약품안전처 한국식품영양성분 데이터베이스(국가표준식품성분표) 수준의 표준값 기준으로 계산하고(실시간 조회가 아니라 그 DB 수준의 기준값이라는 의미), 통상적인 1인분 현실 범위를 벗어나면 스스로 재검토해 보수적인 값으로 고친다. 브랜드가 주어지면 그 브랜드/프랜차이즈의 실제 메뉴 특성을 반영하고, 없으면 일반적인 표준 메뉴로 추정한다. 메뉴명에 여러 음식이 언급되면(예: "김밥, 라면") 각각 분리해서 items에 담는다. 설명이나 마크다운, 계산 근거 없이 JSON만 반환한다.`

function buildTextAnalysisPrompt(menuName, brand) {
  const brandLine = brand ? `\n브랜드: ${brand}` : ''
  return `다음 메뉴의 영양성분을 분석해줘.\n메뉴명: ${menuName}${brandLine}

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "source": "text",
  "items": [
    { "name": "화면에 보여줄 음식 이름", "brand": "브랜드명(없으면 null)", "nutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 } }
  ],
  "total": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
}`
}

function isTextAnalysisResult(value) {
  return (
    Boolean(value) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every((item) => item && typeof item.name === 'string' && isNutrientSet(item.nutrients))
  )
}

// OpenRouter가 429(레이트리밋)를 반환하면 지수 백오프로 최대 2회까지 조용히 자동 재시도한다.
// 그래도 실패하면 err.status(gemini.js가 실어줌)를 보고 호출부가 안내 문구로 전환한다.
const RATE_LIMIT_RETRY_DELAYS_MS = [1500, 3000]

async function geminiCompleteWithRetry(args) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await geminiComplete(args)
    } catch (err) {
      if (err.status === 429 && attempt < RATE_LIMIT_RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_RETRY_DELAYS_MS[attempt]))
        continue
      }
      throw err
    }
  }
}

// 사진 경로와 달리 식별→DB조회 2단계가 없다: AI가 한 번에 표준 1인분 기준 items+nutrients를 낸다.
// 순수 계산 함수라 상태를 직접 건드리지 않고 MealAnalysis를 반환하거나(실패 시) 던진다 —
// handleAnalyze가 사진 유무로 이 함수와 사진 경로 중 하나를 골라 호출한다.
async function resolveTextAnalysis(menuName, brand) {
  let text
  try {
    text = await geminiCompleteWithRetry({
      prompt: buildTextAnalysisPrompt(menuName, brand),
      system: TEXT_ANALYSIS_SYSTEM_PROMPT,
    })
  } catch (err) {
    console.error('text meal analysis (gemini) failed:', err)
    if (err.status === 429) {
      throw new Error('요청이 많아 지연되고 있어요. 잠시 후 다시 시도해주세요.')
    }
    throw new Error('분석 요청에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }

  const raw = parseJsonLoose(text)
  if (!isTextAnalysisResult(raw)) {
    throw new Error('분석 결과 형식이 올바르지 않습니다. 다시 시도해주세요.')
  }

  // AI가 브랜드를 개별 항목에 못 채웠으면 사용자가 입력한 브랜드 힌트로 보완한다.
  // 브랜드가 있으면 '공식'(사진 경로의 no-DB-match 폴백과 동일한 관례), 없으면 '추정'으로 배지 처리.
  const items = raw.items.map((item) => {
    const resolvedBrand = item.brand || brand || null
    return {
      name: item.name,
      brand: resolvedBrand,
      nutrients: item.nutrients,
      source: resolvedBrand ? NUTRITION_SOURCE.OFFICIAL : NUTRITION_SOURCE.ESTIMATED,
    }
  })
  // AI가 함께 낸 total은 신뢰하지 않고 사진 경로와 동일하게 클라이언트에서 직접 합산한다.
  const total = sumNutrients(items)
  const parsed = { source: 'text', items, total }

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
function ModeTabs({ mode, onChange }) {
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
            style={{
              flex: 1,
              padding: `${spacing.md}px 0`,
              borderRadius: radius.sm,
              border: 'none',
              background: active ? colors.primary : colors.bg,
              color: active ? '#fff' : colors.textStrong,
              fontWeight: 700,
              fontSize: font.size.md,
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
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
  const { user, setTodayMeal, addTodayMeal, setTempSex, effectiveRecommended } = useUser()
  const greetingName = user?.email ?? ''
  const showSexPrompt = !user?.profile && !user?.tempSex
  const [mode, setMode] = useState('food') // 'food'(사진+텍스트, 이미 하나로 합쳐진 경로) | 'label'(영양성분표 스캔)
  const [photo, setPhoto] = useState(null) // { base64, mimeType, dataUrl, width, height }
  const [menuName, setMenuName] = useState('')
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 분석은 끝났지만 아직 저장 전인 결과(식사 시간대 확정 대기). 저장하면 lastAnalysis로 넘어간다.
  const [pendingAnalysis, setPendingAnalysis] = useState(null)
  const [mealType, setMealType] = useState(() => getRecommendedMealType())
  // 방금 이 화면에서 저장까지 마친 결과(로컬 상태). 홈을 떠나면 사라져서, 다시 돌아와도 카드가 재표시되지 않는다.
  const [lastAnalysis, setLastAnalysis] = useState(null)

  // 사진이 있으면 기존 식별→식약처DB조회 경로, 없으면 메뉴 이름만으로 바로 추정하는 텍스트 경로를 탄다.
  // 최소한 사진 또는 메뉴 이름 중 하나는 있어야 한다.
  async function handleAnalyze() {
    setError('')
    setPendingAnalysis(null)

    const trimmedMenuName = menuName.trim()
    if (!photo && !trimmedMenuName) {
      setError('사진을 업로드하거나 메뉴 이름을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      if (photo) {
        const prompt = buildIdentificationPrompt(menuName, brand)
        const text = await geminiComplete({
          prompt,
          system: IDENTIFICATION_SYSTEM_PROMPT,
          imageBase64: photo.base64,
          mimeType: photo.mimeType,
        })
        const identified = parseJsonLoose(text)

        if (!isIdentificationResult(identified)) {
          throw new Error('분석 결과 형식이 올바르지 않습니다.')
        }

        const items = await Promise.all(identified.items.map(resolveFoodItem))
        const total = sumNutrients(items)
        const parsed = { items, total }

        if (!isMealAnalysis(parsed)) {
          throw new Error('영양 계산 결과 형식이 올바르지 않습니다.')
        }

        setPendingAnalysis(parsed)
      } else {
        const parsed = await resolveTextAnalysis(trimmedMenuName, brand.trim())
        setPendingAnalysis(parsed)
      }
    } catch (err) {
      console.error('meal analysis failed:', err)
      setError(err.message || '분석에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 사진/텍스트 경로와 별개로 pendingAnalysis를 공유한다 — 어느 탭에서 만든 결과든 이후 mealType
  // 선택→저장(handleConfirmSave)까지 동일한 흐름을 그대로 탄다.
  async function handleLabelScan(photo) {
    setPendingAnalysis(null)
    const parsed = await resolveLabelScan(photo)
    setPendingAnalysis(parsed)
  }

  function handleConfirmSave() {
    if (!pendingAnalysis) return

    // 이번 식사의 모든 음식에 같은 시간대(mealType)를 붙인다. 합계(total)는 그대로 두어 mealType이 영향을 주지 않는다.
    const items = pendingAnalysis.items.map((item) => ({ ...item, mealType }))
    const parsed = { items, total: pendingAnalysis.total }

    setTodayMeal(parsed)

    // 이번 분석에서 나온 음식 전체를 하나의 끼니 기록으로 오늘 식단 목록(mealStore)에 추가
    // (음식이 1개면 단일 메뉴, 2개 이상이면 한 끼 세트로 식단 탭에서 구분해 보여준다)
    // effectiveRecommended를 함께 넘겨 오늘 날짜 DailyRecord의 recommended 스냅샷도 같이 남긴다.
    addTodayMeal(parsed.items, mealType, effectiveRecommended)

    // user는 게스트 계정 자동 발급으로 항상 존재한다. effectiveRecommended는 실제 프로필이 없으면
    // 0을 반환해(calcAchievementPercent 참고) 달성률만 0%로 남고 저장 자체는 그대로 진행된다.
    const achievementPercent = calcAchievementPercent(effectiveRecommended, parsed.total)
    saveRecord(user.id, toDateKey(new Date()), {
      items: parsed.items,
      total: parsed.total,
      achievementPercent,
      savedAt: new Date().toISOString(),
    })

    setLastAnalysis(parsed)
    setPendingAnalysis(null)
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title={`안녕하세요, ${greetingName}님 👋`} subtitle="오늘 점심을 찍어볼까요?" />

      <ModeTabs mode={mode} onChange={setMode} />

      {mode === 'food' ? (
        <Card style={pendingAnalysis ? { background: colors.infoSurface, boxShadow: 'none' } : undefined}>
          <PhotoUpload onChange={setPhoto} />

          <div style={{ marginTop: spacing.lg }}>
            <TextField
              label="메뉴 이름(사진 없이 분석 가능)"
              id="menuName"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
            />
            <TextField label="브랜드 (선택)" id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
            <AppButton
              variant={pendingAnalysis ? 'secondary' : 'primary'}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading && <Spinner size={16} />}
              {loading
                ? '분석 중...'
                : pendingAnalysis
                  ? '다시 분석하기'
                  : error
                    ? '다시 시도'
                    : '분석하기'}
            </AppButton>
            {!loading && pendingAnalysis && (
              <span style={{ color: colors.info, fontSize: font.size.sm, fontWeight: 700 }}>분석 완료</span>
            )}
          </div>

          {error && <p style={styles.errorText}>{error}</p>}
        </Card>
      ) : (
        <Card style={pendingAnalysis ? { background: colors.infoSurface, boxShadow: 'none' } : undefined}>
          <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
            영양성분표 스캔
          </h3>
          <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
            포장지 뒷면 영양성분표를 촬영하면 표기된 수치를 그대로 읽어드려요. 추정이 아니라 추출이라
            표에 없는 값은 '-'로 남아요. "1회 제공량"과 "총 내용량"이 함께 보이면 포장 전체를 먹는
            기준으로 자동 환산해요.
          </p>
          <LabelScan onScan={handleLabelScan} />
        </Card>
      )}

      {showSexPrompt && <SexPromptCard onPick={setTempSex} />}

      <Card>
        <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
          언제 드셨어요?
        </h3>
        <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
          시간대를 선택하면 식단 기록에 함께 표시돼요.
        </p>
        <MealTypePicker value={mealType} recommended={getRecommendedMealType()} onChange={setMealType} />
      </Card>

      {!loading && pendingAnalysis && (
        <AppButton onClick={handleConfirmSave} style={{ marginTop: spacing.md }}>
          저장하기
        </AppButton>
      )}

      {loading && <AnalyzingSkeleton />}

      {!loading && pendingAnalysis && <NutritionCard analysis={pendingAnalysis} />}

      {!loading && !pendingAnalysis && lastAnalysis && (
        <>
          <NutritionCard analysis={lastAnalysis} />
          <Link
            to="/result"
            className="tds-press"
            style={{ ...styles.linkButton, display: 'block', textAlign: 'center', marginTop: spacing.md }}
          >
            오늘의 영양 진단 보기
          </Link>
        </>
      )}
    </div>
  )
}
