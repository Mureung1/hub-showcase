import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AnalysisResultCard from '../components/AnalysisResultCard.jsx'
import CustomComboBuilder from '../components/CustomComboBuilder.jsx'
import HomeQuestCard from '../components/HomeQuestCard.jsx'
import HomeTodaySummary from '../components/HomeTodaySummary.jsx'
import PhotoUpload from '../components/PhotoUpload.jsx'
import LabelScan from '../components/LabelScan.jsx'
import LevelPill from '../components/LevelPill.jsx'
import Spinner from '../components/Spinner.jsx'
import Skeleton from '../components/Skeleton.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SchoolMealNutritionSummary from '../components/SchoolMealNutritionSummary.jsx'
import SegmentedControl from '../components/SegmentedControl.jsx'
import StreakBadge from '../components/StreakBadge.jsx'
import TextField from '../components/TextField.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { evaluateBadges } from '../lib/badgeSystem.js'
import { cacheProduct } from '../lib/barcodeCache.js'
import { playConfetti } from '../lib/confetti.js'
import {
  getClaimedQuestIds,
  getMealsByDateRange,
  getQuestClaimStats,
  getUnlockedBadgeIds,
  unlockBadge,
} from '../lib/dataStore.js'
import { resolveFoodItems as resolveFoodItemsApi } from '../lib/resolveFood.js'
import { geminiCompleteWithRetry, parseJsonLoose } from '../lib/gemini.js'
import { GEMINI_TEMPERATURE, IDENTIFICATION_SCHEMA, LABEL_SCAN_SCHEMA } from '../lib/geminiSchemas.js'
import { getLevelProgress } from '../lib/levelSystem.js'
import { logicalDateKey, logicalWeekKey } from '../lib/logicalDate.js'
import { getRecommendedMealType, MEAL_TYPE_LABELS } from '../lib/mealType.js'
import { sumMealRecordsNutrients, sumNutrients } from '../lib/mealStore.js'
import { buildItemFlags, buildWeeklyStats, findNewlyCompletedAutoQuests, selectDailyQuests, selectWeeklyQuests } from '../lib/quests.js'
import { buildWeekDays } from '../lib/questWeekContext.js'
import { toDateKey } from '../lib/records.js'
import { calcStreak } from '../lib/streak.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
import { getWaterIntake, getWaterTargetMl } from '../lib/waterIntake.js'
import {
  clampToPlausibleNutrients,
  fillMissingNutrients,
  isMealAnalysis,
  isNutrientSet,
  isNutrientSetOrNull,
  NUTRITION_SOURCE,
  blendPortionRatio,
  resolveConsumedGrams,
  scaleMealAnalysisByServings,
  scaleNutrients,
} from '../lib/nutrition.js'
import { applyOfficialAnchors, applyProportionalCalibration } from '../lib/anchoredNutrients.js'
import { buildPlausibilityReferenceLines, buildServingGramHints } from '../lib/foodData.js'
import { applyCookingMethod, buildCorrectedIdItem, canCorrectCookingMethod } from '../lib/foodNameCorrection.js'
import { capEstimatedMacros, correctMealMacros } from '../lib/macroPlausibility.js'
import { checkPlateTotal } from '../lib/mealStandards.js'
import { fetchMenuPrior } from '../lib/menuPrior.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 게이미피케이션(FR-12) — 스트릭 계산에 필요한 조회 범위. StreakBadge.jsx/QuestBoard.jsx와 동일.
const GAMIFICATION_LOOKBACK_DAYS = 90

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// 프롬프트의 "표준 1인분" 참고표는 foodData.js에서 생성한다 — 예전엔 프롬프트 안에 손으로 적어둬서
// 보정 테이블과 조용히 어긋나 있었다(김밥: 프롬프트 320~450kcal vs 테이블 320~520kcal). 이제 한쪽만
// 고쳐서 갈라지는 일이 없다. 나열 대상은 "감각을 잡아주는 대표 메뉴"라 전체가 아니라 추린 목록이다.
const PROMPT_REFERENCE_FOODS = ['짜장면', '비빔밥', '김치찌개', '라면', '공기밥', '돼지갈비', '돈까스', '치킨', '김밥', '삼겹살']
const PORTION_GRAM_HINTS = buildServingGramHints(PROMPT_REFERENCE_FOODS)
const PORTION_PLAUSIBILITY_LINES = buildPlausibilityReferenceLines(PROMPT_REFERENCE_FOODS)

// 사진 한 장만으로 절대 크기(200g인지 400g인지)를 맞히는 건 사람도 어렵다 — 대신 사진에 거의 항상
// 같이 찍히는 식기의 **실제 치수**를 자로 준다. 그릇 지름 대비 음식이 차지하는 면적·높이로 환산하면
// 절대 추정보다 훨씬 안정적이다. 치수는 한국 표준 식기 기준.
const SCALE_REFERENCE_HINT = `사진에 함께 찍힌 식기를 자로 삼아 크기를 환산한다(한국 표준 치수): 숟가락 전체 길이 약 20cm·젓가락 약 23cm, 밥공기 지름 약 10.5cm(가득 담으면 약 210g), 국그릇 지름 약 13cm(약 300ml), 종이컵 지름 약 7cm(약 180ml), 일반 원형 접시 지름 약 23cm, 급식 식판 가로 약 38cm. 식기가 안 보이면 손·포크 등 다른 기준물을 찾고, 그것도 없으면 아래 표준 1인분을 그대로 쓴다.`

// 경로 분기 판정 — 이 값 하나로 서버가 참조할 DB 출처(외식/프랜차이즈/급식)와 중량 규칙이 갈린다.
const SERVING_CONTEXT_HINT = `각 음식이 어디서 나온 것인지 판정한다(servingContext).
   - "cafeteria": 급식 식판(칸이 나뉜 트레이), 학교·회사 구내식당. 배식량이 정해져 있고 식당 메뉴보다 기름·양념이 적다.
   - "packaged": 포장지·용기·바코드·라벨이 보이는 가공식품, 편의점 도시락/삼각김밥, 프랜차이즈 전용 용기(피자 박스, 햄버거 포장지, 커피 브랜드 컵). 브랜드가 식별되면 대부분 여기다.
   - "restaurant": 일반 음식점에서 조리해 내주는 음식. 판단이 애매하면 이걸 쓴다(기본값).
   - "home": 가정에서 차린 상차림.`

// 역할(role)은 규칙 기반 분류가 못 알아본 메뉴의 표준 중량과 허용 범위를 정하는 데 쓰인다.
const ROLE_HINT = `각 음식의 상차림 역할(role)을 하나 고른다: rice(밥·덮밥·김밥류) / noodle(면류) / soup(국·탕·찌개) / main(고기·생선 등 주요리) / side(밑반찬·나물·전) / kimchi(김치류) / dessert(후식·과일·빵) / drink(음료·우유).`

// 절대 그램 추정의 보조 축. LLM은 "이게 몇 g인가"보다 "보통 1인분에 비해 얼마나 담겼나"를 훨씬
// 잘 맞춘다 — 실제로 곱빼기·소식을 가르는 신호는 후자다.
const PORTION_RATIO_HINT = `표준 1인분 대비 실제로 담긴 양의 비율(portionRatio)을 함께 낸다: 1.0이 보통 1인분, 0.5는 절반, 1.5는 곱빼기다. 0.3~3.0 범위로만 답한다. 접시·그릇이 얼마나 찼는지, 남은 여백이 얼마인지를 근거로 삼는다.`

// 검색어를 여러 개 받는 이유 — 이 앱의 정확도는 오랫동안 검색어 **하나**에 걸려 있었다.
const NAME_CANDIDATES_HINT = `각 음식마다 식약처 DB에서 찾을 후보 이름을 **구체적인 순서로 2~3개**(nameCandidates) 낸다. 서버가 후보 전부로 검색해 가장 잘 맞는 것을 고르므로, 하나에 확신이 없어도 괜찮다 — 오히려 표기가 갈릴 만한 음식일수록 여러 개를 내라(예: 잡곡밥이면 ["잡곡밥","흑미밥","보리밥"], 어묵볶음이면 ["어묵볶음","오뎅볶음","어묵조림"]). 첫 번째는 dbSearchName과 같게 두고, 브랜드명·강도 수식어(맵게/곱빼기)는 전부 뺀다.`

// 조리법은 AI가 가장 자주 틀리는 축이라 **틀린 확신보다 null이 낫다**(1탭 보정으로 넘어간다).
const COOKING_METHOD_HINT = `조리법(cookingMethod)을 구이·찜·조림·볶음·튀김·국 중에서 고른다. 양념 색, 국물 유무, 표면 질감(바삭한 튀김옷/윤기 나는 조림장/그을린 자국)을 근거로 삼는다. **애매하면 억지로 고르지 말고 null**로 두어라 — 틀린 조리법은 완전히 다른 영양수치로 이어진다.`

// 한국 표준 급식판은 칸 배치가 정형화돼 있어 위치가 역할의 강한 사전확률이 된다. 그리고 칸 크기는
// 물리적으로 고정이라, "칸을 얼마나 채웠나"는 절대량 추정보다 훨씬 안정적인 신호다.
const TRAY_GEOMETRY_HINT = `이건 급식 식판이다. 한국 표준 식판은 **큰 칸 2개(밥·국)와 작은 칸 3개(주찬·부찬·김치)**로 나뉜다. 칸의 위치와 크기로 역할을 먼저 추정하고, 내용물이 명백히 다를 때만 뒤집어라(예: 큰 칸에 국물이 없고 면이 담겼으면 noodle). 각 항목마다 **그 칸을 얼마나 채웠는지**를 trayFillRatio(0~1)로 낸다 — 칸에 가득이면 1.0, 절반이면 0.5다. 식판이 아닌 사진에서는 trayFillRatio를 null로 둔다.`

// 급식·학식은 그날 나온 메뉴 목록을 이미 알 수 있다(NEIS 공식 식단 / 학식 크롤링). 목록을 주면
// 식별이 **open-set에서 closed-set으로** 바뀐다 — AI가 이름을 지어낼 여지가 구조적으로 사라진다.
function buildMenuPriorHint(menuNames) {
  if (!Array.isArray(menuNames) || menuNames.length === 0) return ''
  return `

[오늘 이 급식/식당에 실제로 나온 메뉴 목록]
${menuNames.map((n) => `- ${n}`).join('\n')}

각 칸의 음식을 **이 목록에서 골라** dbSearchName과 nameCandidates[0]에 그 이름을 **글자 그대로** 써라(목록의 표기를 바꾸지 마라). 목록에 없는 것(개인이 가져온 우유·간식 등)만 자유롭게 식별하고 그 항목은 nameCandidates에 목록 밖 이름을 쓴다. **목록에 있어도 사진에 안 보이면 items에 넣지 마라** — 안 담은 반찬을 합산하면 안 된다.`
}

// AI에게는 "무슨 음식인지"와 "양"만 판단시킨다. 실제 영양수치는 이후 식약처 DB 조회로 채우고,
// estimatedNutrients는 DB 매칭이 실패했을 때만 쓰는 참고용 대체값이다.
const IDENTIFICATION_SYSTEM_PROMPT = `당신은 한국 음식 인식·영양 분석 전문가다. 사진 속 음식을 정확히 식별하고, 식약처 식품영양성분DB 검색에 쓸 표준 식품명과 사용자에게 보여줄 이름, 섭취량을 판단한다. DB 매칭이 실패할 경우를 대비해 참고용 영양성분 추정치도 함께 낸다. 다음 절차를 반드시 내부적으로 따른다(최종 출력은 JSON만):

0. 장면 판정: 사진 전체가 무엇인지 먼저 정한다(sceneType) — "single"(음식 하나), "multi_dish"(여러 접시가 놓인 상차림·학식), "cafeteria_tray"(칸이 나뉜 급식 식판).
1. 음식 식별: 사진 속 음식이 정확히 무엇인지 판단한다. 여러 개면 각각 분리한다. 사용자가 준 메뉴명/브랜드 힌트는 강하게 참고하되, 사진과 명백히 모순되면 사진을 우선한다.
2. DB 검색명 결정: ${NAME_CANDIDATES_HINT} 이 DB는 이름이 정확히 일치해야만 검색되니, 메뉴판 표현이 아니라 그 DB에 실제로 등록돼 있을 법한 짧고 표준적인 한식명을 써야 한다(예: "짜장면", "비빔밥", "김치찌개"). fallbackSearchName에는 상위 표준 카테고리명(돌솥비빔밥 → "비빔밥", 참치김치찌개 → "김치찌개")을 넣어 후보가 전부 실패해도 기본 음식으로는 매칭되게 한다 — 항상 dbSearchName보다 더 일반적인 이름이어야 한다.
3. 표시 이름: 사용자에게 보여줄 이름(displayName)을 정한다. 브랜드/프랜차이즈가 식별되면 "음식명 (브랜드명)" 형식으로 괄호에 브랜드를 표기하고, 아니면 음식명만 쓴다.
4. 경로 판정: ${SERVING_CONTEXT_HINT}
5. 역할 판정: ${ROLE_HINT}
6. 조리법 판정: ${COOKING_METHOD_HINT}
7. 양 추정: 사진에 보이는 양을 그램(g) 단위로 추정한다(estimatedGrams). ${SCALE_REFERENCE_HINT} 아래 한식 표준 1인분 기준량(그릇에 담긴 상태 기준, 국물 포함)을 기준점으로 삼는다: ${PORTION_GRAM_HINTS}. 목록에 없는 음식은 일반적인 한국 1인분 상식 범위로 추정한다. 비현실적으로 크거나 작은 값(예: 떡볶이 1000g, 돼지갈비 50g)은 현실적인 1인분 범위로 스스로 보정한다.
8. 비율 추정: ${PORTION_RATIO_HINT} sceneType이 "cafeteria_tray"면 추가로: ${TRAY_GEOMETRY_HINT}
9. 참고용 영양성분 추정(estimatedNutrients): DB 매칭이 실패하거나 일부 항목이 없을 때만 쓰이는 참고값이다. calories, protein, carbs, fat, fiber, sodium 여섯 키를 반드시 모두 포함하고, 어떤 값도 누락하거나 0으로 비워두지 말고 위에서 추정한 실제 섭취량 기준으로 채운다. 나트륨과 식이섬유도 절대 생략하지 않는다. servingContext가 "restaurant"·"packaged"면 조리에 쓰인 기름·양념·설탕까지 반영한다 — 구이·볶음·튀김·조림을 재료만으로 계산하면 실제보다 크게 낮아진다. 반대로 "cafeteria"면 같은 이름의 식당 메뉴보다 기름·양념·당류가 적고 1인분도 작다.
10. 검증(sanity check): 각 값이 한국 표준 1인분의 현실 범위를 벗어나면 재조정한다. **과대추정과 과소추정을 모두 피한다**(어느 한쪽으로 몰지 않는다). 참고 기준(1인분, 대략):
${PORTION_PLAUSIBILITY_LINES}
   이 예시는 감각을 잡기 위한 참고일 뿐, 실제 사진의 양에 맞춰 조정한다.

주의: 특정 웹사이트를 실시간 조회하는 게 아니라, 위 기준 데이터베이스 '수준'의 표준값에 맞춰 추정하라는 의미다. 계산 근거나 설명은 출력하지 말고 JSON만 반환한다.`

// menuPrior: 그날 그 급식/식당에 실제로 나온 메뉴명 목록(NEIS 공식 식단 또는 학식 크롤링).
// 있으면 식별이 open-set에서 closed-set으로 바뀐다 — AI가 이름을 지어낼 여지가 구조적으로 사라진다.
function buildIdentificationPrompt(menuName, brand, menuPrior) {
  const hints = []
  if (menuName) hints.push(`메뉴명 힌트: ${menuName}`)
  if (brand) hints.push(`브랜드 힌트: ${brand}`)
  const hintText = hints.length ? `\n${hints.join('\n')}` : ''

  return `이 음식 사진을 분석해서 각 음식을 식별해줘.${hintText}${buildMenuPriorHint(menuPrior)}

설명이나 마크다운, 계산 근거 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "sceneType": "single | multi_dish | cafeteria_tray",
  "items": [
    {
      "nameCandidates": ["가장 구체적인 검색명", "대안 검색명", "또 다른 대안"],
      "dbSearchName": "nameCandidates[0]과 같은 값",
      "fallbackSearchName": "전부 실패했을 때 쓸 더 일반적인 상위 카테고리명",
      "displayName": "사용자에게 보여줄 이름(브랜드가 있으면 \\"음식명 (브랜드명)\\" 형식)",
      "servingContext": "restaurant | packaged | cafeteria | home",
      "role": "rice | noodle | soup | main | side | kimchi | dessert | drink",
      "cookingMethod": "구이 | 찜 | 조림 | 볶음 | 튀김 | 국 (애매하면 null)",
      "estimatedGrams": 0,
      "portionRatio": 1.0,
      "trayFillRatio": null,
      "estimatedNutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
    }
  ]
}`
}

// servingContext/role/portionRatio는 **일부러 필수로 검사하지 않는다** — 스키마 강제가 거부되는
// 모델/프로바이더에서는 프롬프트만으로 받게 되고(geminiSchemas.js 헤더 참고), 그때 이 셋이 빠졌다고
// 분석 전체를 실패시킬 이유가 없다. 없으면 각자의 기본값으로 조용히 떨어진다(맥락은 restaurant,
// 역할은 이름 패턴 분류, 비율은 절대 그램 추정).
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

// AI가 식별한 음식들을 **한 번의 요청**으로 실제 영양수치까지 채운다.
//
// 예전엔 항목마다 findFoodMatch가 /api/fooddb를 최대 9번 순차 호출했다(음식 5개 사진이면 45요청,
// 최악 75초, IP당 60요청/분 제한에 스스로 걸림). 이제 검색·매칭 판정은 전부 서버의 통합 해석
// 엔진(server/nutrition/resolveFood.js)이 하고, 여기서는 그 결과에 기존 환산·보정 파이프라인
// (resolveConsumedGrams → scaleNutrients → fillMissingNutrients → clampToPlausibleNutrients)만
// 그대로 적용한다 — 화면에 나가는 수치의 계산 규칙은 예전과 동일하다.
//
// 반환: { items, resolutions } — resolutions는 서버가 어떻게 판정했는지의 원본(매칭 이름·신뢰도)이라
// 조리법 보정 UI가 "무엇으로 계산했는지" 보여주고 재조회 여부를 정하는 데 쓴다. items에 섞지 않는
// 이유는 그게 그대로 저장되는 식사 기록이기 때문이다 — 화면 전용 메타데이터를 저장 데이터에 흘리지 않는다.
async function resolveFoodItems(idItems) {
  const resolved = await resolveFoodItemsApi(idItems)

  const rawItems = idItems.map((idItem, i) => {
    const name = idItem.displayName || idItem.dbSearchName
    const found = resolved[i]

    // 식판이면 "칸을 얼마나 채웠나"를 함께 반영한다 — 칸 크기가 고정이라 AI의 상대량 추정보다
    // 분산이 작다. 두 신호가 크게 어긋나면(conflicted) 아래에서 진단 로그에 남긴다.
    const { ratio: portionRatio, conflicted } = blendPortionRatio(idItem.portionRatio, idItem.trayFillRatio)
    // 표준 1인분에 근거가 있을 때만 배식비율 경로를 연다(nutrition.js resolveConsumedGrams 주석 참고).
    const portionBasis = {
      standardServingGram: found?.servingGramFounded ? found.servingGram : null,
      portionRatio,
    }

    if (found?.match) {
      const { match, source: resolvedSource, matchedName, matchType, confidence } = found
      const baseValue = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
      const grams = resolveConsumedGrams(match, idItem.estimatedGrams, idItem.dbSearchName, portionBasis)
      const scaled = scaleNutrients(match.nutrients, baseValue, grams)
      const nutrients = clampToPlausibleNutrients(fillMissingNutrients(scaled, idItem.estimatedNutrients), idItem.dbSearchName, grams)
      // 서버가 판정한 출처를 그대로 쓴다(식약처DB / 식약처DB(가공) / 레시피DB) — 클라이언트가
      // 같은 판정을 두 벌로 들고 있으면 어긋난다.
      const source = resolvedSource ?? NUTRITION_SOURCE.DB
      logAnalysisDebug(name, {
        matched: true, source, matchedName, matchType, confidence, grams, gateScore: found.gateScore,
        context: found.context, role: idItem.role, cookingMethod: idItem.cookingMethod,
        portionRatio, aiPortionRatio: idItem.portionRatio, trayFillRatio: idItem.trayFillRatio, conflicted,
        estimatedGrams: idItem.estimatedGrams, nutrients,
      })
      return { name, nutrients, source }
    }

    const brand = extractBrand(name)
    const source = brand ? NUTRITION_SOURCE.OFFICIAL : NUTRITION_SOURCE.ESTIMATED
    // 매칭 실패 항목도 배식비율을 쓴다 — 서버가 DB 없이도 정량 사전·역할로 표준 1인분을 돌려주고,
    // AI의 절대 그램 추정이 가장 못 미더운 게 바로 이 경우다.
    const grams = resolveConsumedGrams(null, idItem.estimatedGrams, idItem.dbSearchName, portionBasis)
    // DB가 못 잡은 항목 = 수치가 전부 AI 추정. 여기만 단백질·지방 현실성 캡을 건다(DB 실측값에
    // 걸면 가자미찜 단백질 60%·갈비구이 지방 65% 같은 **진짜 값**을 망가뜨린다 — macroPlausibility.js).
    const nutrients = clampToPlausibleNutrients(
      capEstimatedMacros(fillMissingNutrients({}, idItem.estimatedNutrients), { foodName: idItem.dbSearchName }),
      idItem.dbSearchName,
      grams,
    )
    // DB 매칭 전부 실패 → AI 추정치 폴백. 이런 로그가 자주 뜨면 DB 검색명 매핑을 손봐야 한다는 신호다.
    logAnalysisDebug(name, {
      matched: false, dbSearchName: idItem.dbSearchName, nameCandidates: idItem.nameCandidates,
      context: found?.context, role: idItem.role, cookingMethod: idItem.cookingMethod,
      portionRatio, aiPortionRatio: idItem.portionRatio, trayFillRatio: idItem.trayFillRatio, conflicted,
      grams, estimatedGrams: idItem.estimatedGrams, nutrients, source,
    })
    return { name, nutrients, source }
  })

  // 한 끼 단위 단백질·지방 현실성 보정 — 항목 단위 캡이 못 잡는 "항목마다 조금씩 높아서 합계만
  // 비현실적인" 경우를 잡는다. 근거가 약한 항목(AI 추정)부터 깎고, foodData가 검증한 음식은
  // 건드리지 않는다. 손댈 게 없으면 원본 배열을 그대로 돌려주므로 정상 결과에는 영향이 없다.
  const { items, corrections } = correctMealMacros(rawItems)
  if (Object.keys(corrections).length > 0) logAnalysisDebug('한 끼 단백질·지방 보정', corrections)

  return { items, resolutions: resolved }
}

// 조리법 보정 줄을 띄울지 — **매칭이 확실한 결과에는 띄우지 않는다**. 잘 맞은 값 밑에 "고쳐보세요"가
// 붙으면 맞는 값을 의심하게 만들고, 카드도 이미 빽빽하다. 음식이 하나일 때만 다루는 것은 "직접 수정"과
// 같은 이유다 — 여러 개면 사용자가 어느 항목을 고치려는 건지 알 수 없다.
function buildCorrectionState(idItems, resolutions) {
  if (!Array.isArray(idItems) || idItems.length !== 1) return null
  const idItem = idItems[0]
  const found = resolutions?.[0]
  const searchName = idItem?.dbSearchName
  if (!searchName || !canCorrectCookingMethod(searchName)) return null
  if (found?.confidence === 'high') return null
  return { searchName, matchedName: found?.matchedName ?? null }
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
// (resolveFoodItems — 사진 경로와 같은 함수)로 채운다. estimatedNutrients는 DB 매칭 실패 시 폴백.
// ※ 절차 2·5·6번의 문구는 IDENTIFICATION_SYSTEM_PROMPT(사진 경로)와 같은 규칙이다 — 한쪽을
//   고치면 다른 쪽도 함께 검토할 것.
const TEXT_IDENTIFICATION_SYSTEM_PROMPT = `당신은 한국 음식 인식·영양 분석 전문가다. 사용자가 입력한 메뉴명(과 선택적 브랜드)만 보고, 식약처 식품영양성분DB 검색에 쓸 표준 식품명과 사용자에게 보여줄 이름, 섭취량을 판단한다. DB 매칭이 실패할 경우를 대비해 참고용 영양성분 추정치도 함께 낸다. 다음 절차를 반드시 내부적으로 따른다(최종 출력은 JSON만):

0. 장면 판정: 사진이 없으므로 sceneType은 메뉴명 개수로 정한다 — 하나면 "single", 여럿이면 "multi_dish".
1. 음식 식별: 메뉴명에 여러 음식이 언급되면(예: "김밥, 라면") 각각 분리해서 items에 담는다.
2. DB 검색명 결정: ${NAME_CANDIDATES_HINT} 이 DB는 이름이 정확히 일치해야만 검색되니, 메뉴판 표현이 아니라 그 DB에 실제로 등록돼 있을 법한 짧고 표준적인 한식명을 써야 한다(예: "짜장면", "비빔밥", "김치찌개"). fallbackSearchName에는 상위 표준 카테고리명(돌솥비빔밥 → "비빔밥", 참치김치찌개 → "김치찌개")을 넣어 후보가 전부 실패해도 기본 음식으로는 매칭되게 한다 — 항상 dbSearchName보다 더 일반적인 이름이어야 한다.
3. 표시 이름: 사용자에게 보여줄 이름(displayName)을 정한다. 브랜드가 주어졌거나 메뉴명에서 브랜드/프랜차이즈가 식별되면 "음식명 (브랜드명)" 형식으로 괄호에 브랜드를 표기하고, 아니면 음식명만 쓴다.
4. 경로 판정: ${SERVING_CONTEXT_HINT}
   사진이 없으므로 메뉴명·브랜드만으로 판정한다. 브랜드가 프랜차이즈/제조사면 "packaged", 메뉴명에 "급식"·"학식"·"식판"이 들어가면 "cafeteria", 그 외 외식 메뉴명은 "restaurant"다.
5. 역할 판정: ${ROLE_HINT}
6. 조리법 판정: 메뉴명에 조리법이 드러나면(고등어구이 → 구이) cookingMethod에 담고, 이름만으로 알 수 없으면 **null로 둔다**(사진이 없으니 추측하지 마라).
7. 양 추정: 사진이 없으므로 그 음식의 "한국 표준 1인분" 무게를 그램(g) 단위로 추정한다(estimatedGrams). 참고 기준(그릇에 담긴 상태, 국물 포함): ${PORTION_GRAM_HINTS}. 목록에 없는 음식은 일반적인 한국 1인분 상식 범위로 추정한다. 식당에서 파는 메뉴는 가정식·급식보다 양이 많다는 점을 반영한다.
8. 비율 추정: 사진이 없어 실제로 담긴 양을 볼 수 없으므로 portionRatio는 1.0, trayFillRatio는 null로 둔다. 단 메뉴명 자체에 양이 명시돼 있으면(곱빼기·대·특대·미니·하프 등) portionRatio를 그에 맞춰 조정한다.
9. 참고용 영양성분 추정(estimatedNutrients): DB 매칭이 실패하거나 일부 항목이 없을 때만 쓰이는 참고값이다. calories, protein, carbs, fat, fiber, sodium 여섯 키를 반드시 모두 포함하고, 어떤 값도 누락하거나 0으로 비워두지 말고 한국 표준 1인분 기준값으로 채운다. 나트륨과 식이섬유도 절대 생략하지 않는다. 브랜드가 주어지면 그 브랜드/프랜차이즈의 실제 메뉴 특성을 반영한다. 조리에 쓰인 기름·양념·설탕도 반영한다 — 구이·볶음·튀김·조림을 재료만으로 계산하면 실제보다 크게 낮아진다.
10. 검증(sanity check): 각 값이 한국 표준 1인분의 현실 범위를 벗어나면 재조정한다. **과대추정과 과소추정을 모두 피한다**(어느 한쪽으로 몰지 않는다). 참고 기준(1인분, 대략):
${PORTION_PLAUSIBILITY_LINES}

주의: 특정 웹사이트를 실시간 조회하는 게 아니라, 표준 데이터베이스 '수준'의 기준값에 맞춰 추정하라는 의미다. 계산 근거나 설명은 출력하지 말고 JSON만 반환한다.`

function buildTextIdentificationPrompt(menuName, brand) {
  const brandLine = brand ? `\n브랜드: ${brand}` : ''
  return `다음 메뉴를 분석해서 각 음식을 식별해줘.\n메뉴명: ${menuName}${brandLine}

설명이나 마크다운, 계산 근거 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "sceneType": "single | multi_dish | cafeteria_tray",
  "items": [
    {
      "nameCandidates": ["가장 구체적인 검색명", "대안 검색명", "또 다른 대안"],
      "dbSearchName": "nameCandidates[0]과 같은 값",
      "fallbackSearchName": "전부 실패했을 때 쓸 더 일반적인 상위 카테고리명",
      "displayName": "사용자에게 보여줄 이름(브랜드가 있으면 \\"음식명 (브랜드명)\\" 형식)",
      "servingContext": "restaurant | packaged | cafeteria | home",
      "role": "rice | noodle | soup | main | side | kimchi | dessert | drink",
      "cookingMethod": "구이 | 찜 | 조림 | 볶음 | 튀김 | 국 (애매하면 null)",
      "estimatedGrams": 0,
      "portionRatio": 1.0,
      "trayFillRatio": null,
      "estimatedNutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
    }
  ]
}`
}

// 텍스트 경로도 사진 경로와 동일한 2단계 구조다: AI 식별 → 통합 해석(resolveFoodItems 공유).
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

  // 사진 경로와 같은 절차: 통합 해석(요청 1회) → 그램 환산 → 현실 범위 보정 → 클라이언트 합산.
  const { items, resolutions } = await resolveFoodItems(identified.items)
  const parsed = { items, total: sumNutrients(items) }

  if (!isMealAnalysis(parsed)) {
    throw new Error('영양 계산 결과 형식이 올바르지 않습니다.')
  }

  return { parsed, idItems: identified.items, resolutions }
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
  { key: 'combo', label: '커스텀 조합' },
]

// 사진/텍스트(둘은 이미 하나로 합쳐진 "음식 분석")와 라벨 스캔을 탭으로 명확히 구분한다.
// disabled: 분석 중이거나 결과를 띄워둔 동안에는 탭을 잠근다 — 탭을 바꿔도 결과 카드는 같은 자리를
// 지키므로, 잠그지 않으면 "라벨 스캔 탭인데 사진 분석 결과가 떠 있는" 어긋난 상태가 보인다.
function ModeTabs({ mode, onChange, disabled = false }) {
  return (
    <SegmentedControl
      options={ANALYZE_MODES}
      value={mode}
      onChange={onChange}
      disabled={disabled}
      inactiveTextColor={colors.textStrong}
      style={{ marginBottom: spacing.md }}
    />
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
  useDocumentTitle('홈')
  const {
    authUser,
    profile,
    tempSex,
    addTodayMeal,
    setTempSex,
    effectiveRecommended,
    effectiveUserId,
    todayMeals,
    authLoading,
    totalXp,
    claimQuestsAndCelebrate,
  } = useUser()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  // 닉네임 > 아이디 순으로 고른 표시 이름(authUser.displayName). 인증용 합성 이메일은 화면에 쓰지 않는다.
  const greetingName = authUser?.displayName ?? '게스트'
  const showSexPrompt = !profile && !tempSex
  const [mode, setMode] = useState('food') // 'food'(사진+텍스트, 이미 하나로 합쳐진 경로) | 'label'(영양성분표 스캔)
  const [status, setStatus] = useState(STATUS.IDLE)
  const [photo, setPhoto] = useState(null) // { base64, mimeType, dataUrl, width, height }
  const [menuName, setMenuName] = useState('')
  const [brand, setBrand] = useState('')
  const [error, setError] = useState('')
  // 분석은 끝났지만 아직 저장 전인 결과(식사 시간대 확정 대기). 항상 1인분(baseNutrients) 기준값을
  // 담는다 — 인분 조절(6주차 §2)은 이 값을 바꾸지 않고 표시/저장 시점에만 servings를 곱한다.
  const [pendingAnalysis, setPendingAnalysis] = useState(null)
  const [mealType, setMealType] = useState(() => getRecommendedMealType())
  const [servings, setServings] = useState(1)
  const [saving, setSaving] = useState(false)
  // PhotoUpload는 미리보기를 내부 state로 들고 있어서 부모가 직접 지울 수 없다. "다시 찍기"에서 이 값을
  // 올려 컴포넌트를 새로 마운트시키는 방식으로 초기화한다.
  const [photoResetKey, setPhotoResetKey] = useState(0)

  // 결과 카드 썸네일용. 사진 경로면 분석에 쓴 사진, 라벨 스캔이면 스캔한 사진, 텍스트 경로면 null이다.
  // PhotoUpload가 canvas.toDataURL로 만든 **data URL**이라 URL.revokeObjectURL 대상이 아니다
  // (objectURL이 아니라 문자열이라 참조가 끊기면 그대로 회수된다). 상태를 비우는 것으로 충분하다.
  const [resultPhotoUrl, setResultPhotoUrl] = useState(null)
  // 한 판 통합 분석(5주차 §3-B, CafeteriaPanel의 5번째 입구)에서만 채워지는 결과 카드 표시 오버라이드
  // — titleOverride("중식(통합)" 등)·sourceNote("공식 영양정보 기준"/"추정"). 일반 사진/텍스트/라벨
  // 분석에서는 항상 빈 객체라 AnalysisResultCard의 기존 표시 로직이 그대로 쓰인다.
  const [resultMeta, setResultMeta] = useState({})
  // 조리법 1탭 보정(결과 카드) — { searchName, matchedName, idItems }. DB 매칭이 확실한 결과나
  // 음식이 여러 개인 결과에서는 null이라 보정 줄 자체가 안 보인다.
  const [correction, setCorrection] = useState(null)
  const [correcting, setCorrecting] = useState(false)

  // 학식(대학) 화면의 "영양 분석" 버튼처럼, 다른 화면에서 메뉴 이름을 미리 채운 채 이 화면으로 들어오는
  // 4번째 입구(PRD 4주차 FR-1.3) — 새 분석 파이프라인을 만들지 않고 기존 텍스트 경로 입력만 채워준다.
  // 한 번 반영한 뒤에는 state를 비워, 나중에 뒤로가기/재방문해도 다시 덮어쓰지 않는다.
  useEffect(() => {
    const prefill = location.state?.prefillMenuName
    if (!prefill) return
    setMenuName(prefill)
    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // 5번째 입구 — 학식·급식 카드의 "한 판 통합 분석"(CafeteriaPanel.jsx)이 이미 완성된
  // { items, total }을 들고 여기로 곧장 들어온다. 식별·DB조회 단계 없이 바로 STATUS.RESULT로
  // 점프한다는 점만 다르고, 그 다음(시간대 선택 → 저장)은 기존 흐름과 완전히 동일하다.
  useEffect(() => {
    const trayPrefill = location.state?.prefillTrayAnalysis
    if (!trayPrefill) return
    if (!isMealAnalysis(trayPrefill.pendingAnalysis)) {
      // 정상적으로는 절대 일어나지 않아야 하는 방어 분기(CafeteriaPanel이 항상 유효한 모양을 만들어
      // 보낸다) — 그래도 형식이 깨진 채 들어오면 화면이 아무 설명 없이 그대로 IDLE로 남는 대신
      // 원인을 알 수 있는 안내를 띄운다(이 앱의 무음 실패 금지 원칙).
      showToast('통합 분석 결과를 불러오지 못했어요. 메뉴별 분석을 이용해주세요.', { tone: 'error' })
      navigate(location.pathname, { replace: true, state: {} })
      return
    }
    setPendingAnalysis(trayPrefill.pendingAnalysis)
    setResultPhotoUrl(null)
    setResultMeta({
      titleOverride: trayPrefill.titleOverride,
      sourceNote: trayPrefill.sourceNote,
      confidence: trayPrefill.confidence,
      // 트랙 3 §3 — 이 입구로 들어온 결과만 "오늘 급식 체크" 카드를 보여준다(일반 사진/텍스트/라벨
      // 분석은 학교 급식이 아니므로 대상이 아니다).
      isSchoolMeal: true,
    })
    setMealType(trayPrefill.mealType || getRecommendedMealType())
    // 트랙 2 §3(다시 기록) — 기록에서 되돌아올 땐 원래 먹었던 인분 수를 그대로 다시 보여준다.
    // CafeteriaPanel의 한 판 통합 분석은 이 값을 넘기지 않아(항상 새 1인분 기준) 여기서도 그대로 1이다.
    setServings(trayPrefill.servings ?? 1)
    setStatus(STATUS.RESULT)
    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // IDLE로 되돌리며 입력까지 전부 비운다. 저장 완료와 "다시 찍기"가 공유한다.
  function resetToIdle() {
    setStatus(STATUS.IDLE)
    setPendingAnalysis(null)
    setResultPhotoUrl(null)
    setResultMeta({})
    setCorrection(null)
    setCorrecting(false)
    setPhoto(null)
    setMenuName('')
    setBrand('')
    setError('')
    setMealType(getRecommendedMealType())
    setServings(1)
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
      // 조리법 보정이 재조회할 때 필요한 원본(AI 식별 결과 + 서버 판정). 라벨 스캔 경로에는 없다.
      let idItems = null
      let resolutions = null
      // 판 단위 검증 근거(sceneType/schoolKind) — 인분 조절·조리법 보정·직접 수정으로 표시 총량이
      // 바뀔 때마다 이 근거로 다시 판정해야 한다(아래 렌더 시점 계산 참고). 메시지 문자열을 여기서
      // 미리 만들어 저장하면 그 이후 변경에 갱신되지 않는 게 이 자리의 예전 버그였다.
      let plateWarningContext = null
      if (photo) {
        // 그날 우리 학교 급식 메뉴를 먼저 가져온다. 목록이 있으면 식별이 open-set → closed-set으로
        // 바뀌어 AI가 이름을 지어낼 여지가 사라진다. 실패하거나 학교가 없으면 null — 기존 경로가
        // 그대로 동작하므로 분석을 막지 않는다.
        // ⚠️ 이 조회는 Gemini 호출과 **병렬이 아니라 직렬**이다(한때 주석이 "병렬"이라고 적혀 있었지만
        // 사실이 아니었다). 메뉴 목록이 프롬프트 본문에 들어가야 해서 구조적으로 병렬화가 불가능하다.
        // 대신 fetchMenuPrior가 자체 데드라인(2.5초)을 걸어 늦으면 버린다 — 그게 없으면 NEIS가 느린 날
        // 사용자가 분석 스피너를 최대 28초 본 뒤에야 Gemini 호출이 시작된다.
        const prior = await fetchMenuPrior(profile, getRecommendedMealType()).catch(() => null)
        const prompt = buildIdentificationPrompt(menuName, brand, prior?.names)
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

        // prior는 "이 시간대에 이 학교 급식이 존재한다"만 알려줄 뿐 "지금 찍은 사진이 그 급식이다"는
        // 보장하지 않는다 — 급식 시간대에 학교 밖에서 식사(외식·집밥·개인 간식)를 찍어도 prior는 그대로
        // 존재한다. 그래서 항목 전체를 일괄 고정하지 않고 ①급식 식판(칸이 나뉜 사진)이거나 ②그 항목이
        // 실제로 오늘 공식 메뉴 목록에 있을 때(AI가 목록 표기를 그대로 썼을 때)만 servingContext를
        // 'cafeteria'로 고정한다. 목록 밖 이름(개인이 가져온 음식 등)은 AI가 이미 판정한 맥락을 믿는다.
        const priorNameSet = prior ? new Set(prior.names) : null
        // "오늘 공식 메뉴 목록에 있는 항목인가" — 아래 두 가지에 **각각 다른 방식으로** 쓰인다.
        const isOnOfficialMenu = (it) =>
          Boolean(priorNameSet) &&
          (priorNameSet.has(it.dbSearchName) ||
            (Array.isArray(it.nameCandidates) && it.nameCandidates.some((n) => priorNameSet.has(n))))
        // ① 맥락 고정은 식판 사진이면 전부 적용한다 — 식판에 담긴 이상 배식 밀도로 계산하는 게 맞다.
        const items = priorNameSet
          ? identified.items.map((it) =>
              identified.sceneType === 'cafeteria_tray' || isOnOfficialMenu(it) ? { ...it, servingContext: 'cafeteria' } : it,
            )
          : identified.items
        const resolvedItems = await resolveFoodItems(items)
        parsed = { items: resolvedItems.items, total: sumNutrients(resolvedItems.items) }

        // NEIS 공식 수치(officialTotals)는 영양(교)사가 표준레시피로 산출해 공시한 값이라 우리 추정보다
        // 정확하다 — fetchMenuPrior가 이미 병렬로 받아왔는데도 예전엔 여기서 전혀 쓰이지 않고 버려졌다
        // (CafeteriaPanel의 메뉴명 기반 "한 판 통합 분석" 버튼만 이 앵커링을 받고, 정작 가장 흔한 사용
        // 경로인 사진 촬영은 못 받는 비대칭이 있었다). 공식 값이 있는 항목은 그대로 확정하고 없는
        // 항목만 남은 열량에서 역산한 뒤(applyOfficialAnchors), 항목별 수치도 같은 비율로 맞춘다
        // (applyProportionalCalibration) — precisionEngine.js의 급식 캘리브레이션과 동일한 규칙이다.
        // ⚠️ ② 앵커링은 사진에 **공식 메뉴만** 담겼을 때로 한정한다. officialTotals는 "그 급식만의"
        // 합계라, 개인 간식이 하나라도 섞이면 사진 전체 합계를 급식 합계로 고정하는 셈이 되어 간식
        // 열량이 조용히 지워진다(실측: 급식 600 + 초코우유 230 → 앵커 후 총 800kcal, 약 22% 증발).
        // 판정 기준을 servingContext로 두면 안 된다 — 식판 사진에서는 ①이 전부 'cafeteria'로
        // 덮어써서 every()가 **항상 true**가 되고, 정작 가드가 필요한 유일한 상황(식판 + 개인 간식이
        // 한 프레임)에서만 무력해진다(리뷰에서 발견). 그래서 공식 메뉴 목록 소속 여부로 직접 본다.
        const isPureOfficialMeal = Boolean(priorNameSet) && identified.items.every(isOnOfficialMenu)
        if (prior?.officialTotals && isPureOfficialMeal) {
          const anchored = applyOfficialAnchors(parsed.total, prior.officialTotals)
          const scales = applyProportionalCalibration(parsed.items, anchored.nutrients, parsed.total)
          if (scales) {
            parsed = { items: parsed.items, total: { ...sumNutrients(parsed.items), ...anchored.nutrients } }
          }
        }

        idItems = items
        resolutions = resolvedItems.resolutions
        plateWarningContext = {
          sceneType: identified.sceneType,
          // schoolKind는 prior가 실제로 이 사진의 급식을 확인해줬을 때만 쓴다 — profile.school.kind로
          // 그냥 폴백하면 급식 시간대에 급식이 아닌 사진을 찍어도 학교급식 밴드(초중고 ±35%)가 적용돼
          // "적습니다/많습니다" 오경고가 뜬다(위와 같은 이유).
          schoolKind: prior?.schoolKind ?? null,
        }

        if (!isMealAnalysis(parsed)) {
          throw new Error('영양 계산 결과 형식이 올바르지 않습니다.')
        }
      } else {
        const textResult = await resolveTextAnalysis(trimmedMenuName, brand.trim())
        parsed = textResult.parsed
        idItems = textResult.idItems
        resolutions = textResult.resolutions
      }

      setPendingAnalysis(parsed)
      const correctable = buildCorrectionState(idItems, resolutions)
      setCorrection(correctable ? { ...correctable, idItems } : null)
      // 자동 보정하지 않고 알리기만 한다 — 외부 정답지 없이 밴드로 값을 깎으면 그게 바로 이
      // 저장소가 반복해서 틀린 패턴(근거 없는 기준으로 근거 있는 값을 기각)이 된다. 근거(context)만
      // 저장하고 메시지는 렌더 시점에 매번 다시 계산한다(아래 livePlateWarning) — 인분 조절·조리법
      // 보정·직접 수정으로 화면 총량이 바뀌어도 경고가 그 시점 값을 계속 따라가게 하기 위함이다.
      setResultMeta(plateWarningContext ? { plateWarningContext } : {})
      if (plateWarningContext) logAnalysisDebug('판 단위 검증', checkPlateTotal(parsed.total.calories, plateWarningContext))
      setResultPhotoUrl(photo?.dataUrl ?? null)
      // 결과를 보여주는 시점에 시간대 추천을 다시 계산한다(카드를 띄워둔 채 시간이 흐른 경우 대비).
      setMealType(getRecommendedMealType())
      setServings(1)
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
  // ean: FR-7 — 바코드를 스캔했지만 자체 캐시에 없던 제품이면 LabelScan이 넘겨준다. OCR이 성공하면
  // 다음번엔 이 바코드만 찍어도 바로 나오도록 결과를 캐시에 남긴다(자체 축적형 DB).
  async function handleLabelScan(scanPhoto, ean) {
    setStatus(STATUS.ANALYZING)
    try {
      const parsed = await resolveLabelScan(scanPhoto)
      if (ean) cacheProduct(ean, parsed)
      setPendingAnalysis(parsed)
      setResultPhotoUrl(scanPhoto?.dataUrl ?? null)
      setMealType(getRecommendedMealType())
      setServings(1)
      setStatus(STATUS.RESULT)
    } catch (err) {
      setStatus(STATUS.IDLE)
      throw err
    }
  }

  // FR-7 — 바코드가 자체 캐시에 이미 있으면(과거에 같은 제품을 OCR로 읽어둔 적 있음) AI 호출 없이
  // 즉시 결과 카드로 간다. 사진이 없으므로(바코드만 찍음) resultPhotoUrl은 null — AnalysisResultCard가
  // 이미 사진 없는 경우(UtensilsPlaceholder)를 지원한다.
  function handleBarcodeHit(product) {
    setPendingAnalysis(product)
    setResultPhotoUrl(null)
    setMealType(getRecommendedMealType())
    setServings(1)
    setStatus(STATUS.RESULT)
  }

  // 게이미피케이션(FR-12) — 방금 저장한 끼니(record)를 반영해 auto 퀘스트를 판정·지급하고, XP를
  // 얻었으면 홈 화면 애니메이션(XP 획득 연출 → 레벨업 팝업)을, 레벨/스트릭/퀘스트 누적이 조건을
  // 새로 만족했으면 뱃지 잠금해제를 함께 처리한다. 게이미피케이션은 부가 기능이라 이 함수 전체를
  // try/catch로 감싸 — 여기서 실패해도 "식단이 저장되었습니다" 성공 흐름은 절대 막지 않는다.
  // useUser()의 todayMeals는 이 함수 호출 시점의 렌더 클로저 값(저장 전 상태)이라, 방금 만든 record를
  // 직접 합쳐야 "오늘 이 끼니까지 포함한" 정확한 값이 나온다.
  async function runGamification(record) {
    // 세션 복원이 끝나기 전(authLoading)이면 effectiveUserId가 게스트에서 실제 uid로 곧 바뀔 수 있어,
    // 지금 계산하면 잘못된 시드로 퀘스트 로테이션이 캐시된다(useQuestBoard.js 헤더 주석과 같은 이유).
    // 이번 저장은 게이미피케이션을 건너뛰고, 다음 저장이나 MY 탭 방문 때 자연히 다시 잡힌다.
    if (authLoading) return
    try {
      const now = new Date()
      const dateKey = logicalDateKey(now)
      const weekKey = logicalWeekKey(now)
      const todayCalendarKey = toDateKey(now)
      const mergedMeals = record ? [...todayMeals, record] : todayMeals
      if (mergedMeals.length === 0) return

      const startKey = toDateKey(daysAgo(GAMIFICATION_LOOKBACK_DAYS))
      const byDate = await getMealsByDateRange(startKey, todayCalendarKey)
      const streak = calcStreak(Object.keys(byDate), todayCalendarKey)

      const targetMl = getWaterTargetMl(profile?.weightKg, profile?.activity)
      const water = getWaterIntake(effectiveUserId, todayCalendarKey)
      const itemFlags = buildItemFlags(mergedMeals)

      const days = await buildWeekDays({
        weekKey,
        todayCalendarKey,
        mealsForDate: (dayKey) => (dayKey === todayCalendarKey ? mergedMeals : (byDate[dayKey] ?? [])),
        effectiveUserId,
        targetMl,
        effectiveRecommended,
      })

      const ctx = {
        mealCount: mergedMeals.length,
        todayTotal: sumMealRecordsNutrients(mergedMeals),
        recommended: effectiveRecommended,
        mealTypesToday: new Set(mergedMeals.map((m) => m.mealType)),
        streakCurrent: streak.current,
        waterMlConsumed: water.mlConsumed,
        waterTargetMl: targetMl,
        supplementTaken: water.supplementTaken,
        ...itemFlags,
        ...buildWeeklyStats(days),
      }

      const dailyClaimedIds = await getClaimedQuestIds(dateKey)
      const weeklyClaimedIds = await getClaimedQuestIds(weekKey)
      const newlyCompleted = findNewlyCompletedAutoQuests(ctx, {
        dateKey,
        weekKey,
        userId: effectiveUserId,
        dailyClaimedIds,
        weeklyClaimedIds,
      })

      const dailyQuests = selectDailyQuests(dateKey, effectiveUserId)
      const weeklyQuests = selectWeeklyQuests(weekKey, effectiveUserId)
      // UserContext.jsx의 공유 진입점 — claimQuest 반복 호출 + 올클리어 보너스 + XP 애니메이션 +
      // totalXp state 갱신 + 레벨업 팝업까지 한 번에 처리한다(어느 화면에서 클레임이 일어나든 동일).
      const { totalXp: totalXpAfter } = await claimQuestsAndCelebrate({
        newlyCompleted,
        dailyQuests,
        weeklyQuests,
        dailyClaimedIds,
        weeklyClaimedIds,
        dateKey,
        weekKey,
        streakCurrent: streak.current,
      })

      // XP 정산 이후 뱃지 조건을 확인한다(레벨 상승분이 이번에 딴 뱃지에 반영되도록).
      const questStats = await getQuestClaimStats()
      const unlockedIds = await getUnlockedBadgeIds()
      const badgeCtx = {
        streakCurrent: streak.current,
        level: getLevelProgress(totalXpAfter).level,
        totalClaimedQuestCount: questStats.totalCount,
        countsByQuestId: questStats.countsByQuestId,
      }
      const newBadges = evaluateBadges(badgeCtx, unlockedIds)
      for (const badge of newBadges) {
        await unlockBadge(badge.id)
      }
      if (newBadges.length > 0) {
        playConfetti()
        showToast(`배지 획득: ${newBadges.map((b) => b.title).join(', ')}`, { tone: 'success' })
      }
    } catch (err) {
      console.error('gamification failed:', err)
    }
  }

  async function handleConfirmSave() {
    if (!pendingAnalysis || saving) return

    // 이번 식사의 모든 음식에 같은 시간대(mealType)를 붙인다. 저장되는 nutrients는 servings를 반영한
    // 최종값이고, baseNutrients(1인분 기준 원본)·servings를 함께 남겨 이 기록을 다시 열었을 때 몇
    // 인분이었는지 알 수 있게 한다(6주차 §2) — 기존 기록(이 두 필드가 없는)은 읽는 쪽이 1인분으로 해석.
    const scaled = scaleMealAnalysisByServings(pendingAnalysis, servings)
    const items = scaled.items.map((item, i) => ({
      ...item,
      mealType,
      baseNutrients: pendingAnalysis.items[i].nutrients,
      servings,
    }))

    setSaving(true)
    try {
      // 이번 분석에서 나온 음식 전체를 하나의 끼니 기록으로 저장
      // (음식이 1개면 단일 메뉴, 2개 이상이면 한 끼 세트로 식단 탭에서 구분해 보여준다)
      const record = await addTodayMeal(items, mealType)
      resetToIdle()
      playConfetti()
      await runGamification(record)
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

  // 트랙 2 §4 — 저장 전 수동 보정. AnalysisResultCard가 화면에 보이는(인분 배율 적용) 값을 이미
  // 1인분 기준으로 되돌려 넘겨준다 — 여기서는 그 값을 pendingAnalysis(항상 1인분 기준)에 그대로
  // 반영하고 출처만 "직접입력"으로 바꾸면 된다. 음식이 여러 개일 땐 카드 쪽에서 이 진입점 자체를
  // 막으므로 itemIndex는 항상 0이다.
  // 조리법 칩 — 검색어의 조리법만 갈아끼워 **DB를 다시 조회**한다("직접 수정"이 결과 수치를 손으로
  // 덮어쓰는 것과 다르다). 사용자가 확실히 아는 건 영양수치가 아니라 자기가 먹은 음식이라, 이쪽이
  // 물어보기 쉬운 질문이고 답이 정확도로 바로 이어진다.
  async function handleCorrectCookingMethod(method) {
    if (!correction || correcting) return
    const nextName = applyCookingMethod(correction.searchName, method)
    if (!nextName) return // 같은 조리법을 다시 눌렀다 — 재조회할 이유가 없다

    setCorrecting(true)
    try {
      // 검색어만 바꾸고 나머지(맥락·역할·비율·AI 추정 폴백)는 원래 식별 결과를 그대로 재사용한다 —
      // Gemini를 다시 부르지 않으므로 비용도 지연도 거의 없다.
      // 이름 필드 네 개(nameCandidates/dbSearchName/fallbackSearchName/displayName)를 함께 갈아끼우는
      // 규칙은 foodNameCorrection.js가 단일 소스다 — 여기서 손으로 조립하다 두 번 어긋났다(그 파일 주석 참고).
      const nextIdItems = [buildCorrectedIdItem(correction.idItems[0], method)]
      const { items, resolutions } = await resolveFoodItems(nextIdItems)
      setPendingAnalysis({ items, total: sumNutrients(items) })
      // 고친 뒤에도 보정 줄은 남긴다 — 한 번에 맞히지 못할 수 있고, 지금 어느 조리법으로 계산 중인지
      // 칩의 선택 상태로 계속 보여줘야 한다.
      const correctable = buildCorrectionState(nextIdItems, resolutions)
      setCorrection({ searchName: nextName, matchedName: correctable?.matchedName ?? resolutions?.[0]?.matchedName ?? null, idItems: nextIdItems })
    } catch (err) {
      console.error('cooking method correction failed:', err)
      showToast('다시 조회하지 못했어요. 잠시 후 다시 시도해주세요.', { tone: 'error' })
    } finally {
      setCorrecting(false)
    }
  }

  function handleEditItemNutrients(itemIndex, baseNutrients) {
    setPendingAnalysis((prev) => {
      if (!prev) return prev
      const items = prev.items.map((item, i) =>
        i === itemIndex ? { ...item, nutrients: baseNutrients, source: NUTRITION_SOURCE.MANUAL, matchType: null } : item,
      )
      return { items, total: sumNutrients(items) }
    })
  }

  // resultMeta.plateWarningContext(sceneType/schoolKind)는 분석 시점에 고정되지만, 판정은 매 렌더마다
  // 다시 한다 — 조리법 보정·직접 수정으로 pendingAnalysis가 바뀌면 경고도 따라가야 하기 때문이다
  // (예전엔 분석 직후 문자열을 그대로 저장해서 이후 변경에 갱신되지 않았다).
  //
  // ⚠️ 다만 **인분 배율은 곱하지 않는다.** mealStandards의 밴드는 "한 끼 1인분"의 현실 범위라,
  // 사용자가 스스로 2인분이라고 입력한 값에 그 밴드를 대면 "사진에 안 담긴 반찬이 있거나 일부 항목이
  // 잘못 인식됐을 수 있어요"라는 문구가 뜬다 — 방금 사용자가 알려준 사실을 시스템이 오류라고
  // 되돌려 말하는 셈이다(0.5인분이면 반대로 "적습니다"). 인분은 추정이 아니라 사용자가 명시한
  // 의도이므로 판정 대상이 아니다.
  const livePlateWarning = pendingAnalysis?.total?.calories && resultMeta.plateWarningContext
    ? checkPlateTotal(pendingAnalysis.total.calories, resultMeta.plateWarningContext)
    : null

  return (
    <div style={styles.page}>
      {/* "을/를" 조사는 한국어에서 앞말 받침 유무에 따라 달라져(점심을/기타를) 변수에 그대로 붙일 수
          없다 — "오늘의 X, 찍어볼까요" 형태로 조사가 필요 없게 문장을 구성한다. */}
      <ScreenHeader
        title={`안녕하세요, ${greetingName}님 👋`}
        subtitle={`오늘의 ${MEAL_TYPE_LABELS[getRecommendedMealType()]}, 사진으로 기록해볼까요?`}
      />

      {/* 게이미피케이션(FR-12) — 레벨 상시 노출 + XP 획득 애니메이션의 목적지(#home-level-pill).
          온보딩 여부와 무관하게 항상 보인다. */}
      <LevelPill totalXp={totalXp} />

      {/* 앱의 모든 개인화(권장 섭취량 등)를 여는 단 하나의 질문이라 분석 카드보다 먼저 보여야 한다 —
          카드들 뒤에 있으면 작은 화면에서 스크롤해야만 보였다. */}
      {showSexPrompt && <SexPromptCard onPick={setTempSex} />}

      {/* 연속 기록 배지 + 오늘의 미션(트랙 1) — 연속이 0일이거나 recommended가 없으면(위
          SexPromptCard가 뜬 상태) 각자 스스로 아무 것도 그리지 않으므로 중복/공허한 안내가 되지 않는다. */}
      <StreakBadge />
      <HomeQuestCard />

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
          titleOverride={resultMeta.titleOverride}
          sourceNote={resultMeta.sourceNote}
          plateWarning={livePlateWarning?.message ?? null}
          confidence={resultMeta.confidence}
          servings={servings}
          onServingsChange={setServings}
          onEditNutrients={handleEditItemNutrients}
          correction={
            correction
              ? {
                  searchName: correction.searchName,
                  matchedName: correction.matchedName,
                  busy: correcting,
                  onCorrect: handleCorrectCookingMethod,
                }
              : null
          }
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
      ) : mode === 'label' ? (
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
          <LabelScan key={photoResetKey} onScan={handleLabelScan} onBarcodeHit={handleBarcodeHit} />
        </Card>
      ) : (
        // FR-19 — 커스텀 조합 음식 빌더. 완료 시 기존 RESULT 상태로 그대로 합류해(AnalysisResultCard/
        // handleConfirmSave 무변경) 저장 흐름을 공유한다.
        <Card className="tds-card-swap">
          <CustomComboBuilder
            onComplete={(analysis) => {
              setPendingAnalysis(analysis)
              setResultPhotoUrl(null)
              setResultMeta({})
              setMealType(getRecommendedMealType())
              setServings(1)
              setStatus(STATUS.RESULT)
            }}
          />
        </Card>
      )}

      {/* 홈 탭 개편(리텐션 강화 v7) — 분석 카드 아래 "오늘 요약" 위젯. 신체정보가 없으면(위
          SexPromptCard가 이미 안내 중) 컴포넌트가 스스로 아무 것도 그리지 않는다. */}
      <HomeTodaySummary />

      {/* 트랙 3 §3 — 급식 기반 하루 설계. 한 판 통합 분석(prefillTrayAnalysis) 결과일 때만 보인다. */}
      {status === STATUS.RESULT && resultMeta.isSchoolMeal && (
        <SchoolMealNutritionSummary
          recommended={effectiveRecommended}
          mealTotal={scaleMealAnalysisByServings(pendingAnalysis, servings).total}
          mealType={mealType}
        />
      )}

    </div>
  )
}
