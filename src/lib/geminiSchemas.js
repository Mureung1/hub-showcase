// ── 앱의 모든 Gemini 호출이 기대하는 응답 구조(JSON 스키마) 단일 소스 ─────────────
// OpenRouter의 구조화 출력(response_format: json_schema)으로 강제해 "JSON 형식이 깨져 파싱 실패"
// 자체를 막는다. 서버(proxy.js)는 스키마 강제가 거부되면(모델/프로바이더 미지원) 스키마 없이 1회
// 재시도하고, 클라이언트는 그 폴백까지 대비해 기존 parseJsonLoose + 검증 함수를 그대로 유지한다.
// 프롬프트의 "JSON만 반환해" 문구도 같은 이유로 남겨둔다(스키마 폴백 시의 보험).
//
// 호출별 응답 구조와 temperature 정책:
// ┌───────────────────────────┬──────────────────────────────┬──────┐
// │ 호출                      │ 스키마                        │ temp │
// ├───────────────────────────┼──────────────────────────────┼──────┤
// │ 사진/텍스트 음식 식별      │ IDENTIFICATION_SCHEMA        │ 0.2  │ 수치·식별 일관성
// │ 영양성분표 라벨 스캔       │ LABEL_SCAN_SCHEMA            │ 0.1  │ 추출 — 최대 결정성
// │ 식당 검색 키워드 생성      │ KEYWORDS_SCHEMA              │ 0.7  │ 유형 다양성 필요
// │ 식당 대표 메뉴 예상 섭취량 │ EXPECTED_INTAKE_SCHEMA       │ 0.2  │ 수치 일관성
// │ 보충 추천 메뉴(결과 화면)  │ RECOMMENDATION_SCHEMA        │ 0.6  │ 메뉴 다양성 + 자연스러운 이유
// │ AI 식습관 분석(달력 탭)    │ DIET_ANALYSIS_SCHEMA         │ 0.5  │ 근거 기반이되 표현은 다양하게
// │ 한 판 통합 분석(학식·급식) │ TRAY_ANALYSIS_SCHEMA         │ 0.2  │ 수치 추정 일관성
// └───────────────────────────┴──────────────────────────────┴──────┘
// strict 모드 규칙: 모든 property는 required에 있어야 하고 additionalProperties: false여야 한다.
// "없을 수 있는 값"은 키를 빼는 게 아니라 null을 허용(type: ['x','null'])하는 방식으로 표현한다.
import { NUTRIENT_LABELS } from './nutrition.js'

const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)

// 6대 영양소 전부 숫자 필수 — 식별 경로의 estimatedNutrients(폴백값이라 누락 금지)용.
const NUTRIENT_SET_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, { type: 'number' }])),
  required: NUTRIENT_KEYS,
  additionalProperties: false,
}

// 6대 영양소, 값마다 null 허용 — 라벨 스캔(표에 없으면 null)·expected(관련 없는 키는 null)용.
const NUTRIENT_SET_OR_NULL_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, { type: ['number', 'null'] }])),
  required: NUTRIENT_KEYS,
  additionalProperties: false,
}

// ── 분석 경로 분기용 필드 3종 ────────────────────────────────────────────────
// "같은 음식이라도 어디서 나온 것이냐"가 영양밀도와 1인분 중량을 둘 다 바꾼다(실측: 돼지갈비구이
// 급식 132kcal/100g vs 외식 294). 예전엔 이 판단을 **화면이 하드코딩**했다 — 사진 분석은 무조건
// 식당, 학식 패널은 무조건 급식. 그래서 식판 사진도 편의점 도시락도 전부 식당 수치로 계산됐다.
// 이제 AI가 사진/메뉴명을 보고 판정하고, 서버가 그에 맞는 출처와 중량 규칙을 고른다.
export const SERVING_CONTEXTS = ['restaurant', 'packaged', 'cafeteria', 'home']

// mealPortions.js의 role 8종과 같은 집합이어야 한다(중량 표를 그 키로 찾는다).
// 규칙 기반 분류(classifyMenuRole)가 11,347종 중 3,606종(31.8%)에서 실패하고 그때 전부 '반찬
// 50g'으로 떨어지는데, 그 구멍을 표를 계속 늘리는 대신 AI 판단으로 메운다.
export const MENU_ROLES = ['rice', 'noodle', 'soup', 'main', 'side', 'kimchi', 'dessert', 'drink']

// 장면 유형 — 항목별 servingContext의 기본값과 중량 결정 순서를 정한다. **라우팅에 별도 AI 호출을
// 쓰지 않으려고** 식별 응답의 최상위 필드로 둔다(왕복이 늘지 않는다). 진입점이 이미 아는 경우
// (급식 탭·지도 탭)에는 화면이 정한 값이 이기고, 홈 사진 분석처럼 모를 때만 이 값을 쓴다.
export const SCENE_TYPES = ['single', 'multi_dish', 'cafeteria_tray']

// 조리법 — 같은 재료라도 DB에 별개 레코드로 있고(고등어구이 vs 고등어조림), 사진으로는 양념 색과
// 국물 유무로만 구분해야 해서 AI가 가장 자주 틀리는 축이다. 확신이 없으면 null을 받아 1탭 보정으로
// 넘긴다 — 억지로 하나를 고르게 하면 틀린 확신이 그대로 수치가 된다.
export const COOKING_METHOD_VALUES = ['구이', '찜', '조림', '볶음', '튀김', '국']

// 사진·텍스트 공용 음식 식별 응답 (Analyze.jsx isIdentificationResult와 짝).
export const IDENTIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    sceneType: { type: 'string', enum: SCENE_TYPES },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          // ★ 검색어를 **여러 개** 받는 게 v2의 핵심이다. 이 앱의 정확도는 오랫동안 검색어 하나에
          // 걸려 있었다 — AI가 이름을 하나 잘못 지어내면 뒤의 매칭·중량·보정이 아무리 정확해도
          // 전부 다른 음식의 수치가 된다. 서버는 후보 전부를 역색인에 던지고 가장 잘 맞는 하나를 고른다.
          nameCandidates: { type: 'array', items: { type: 'string' } },
          dbSearchName: { type: 'string' },
          fallbackSearchName: { type: 'string' },
          displayName: { type: 'string' },
          servingContext: { type: 'string', enum: SERVING_CONTEXTS },
          role: { type: 'string', enum: MENU_ROLES },
          cookingMethod: { type: ['string', 'null'], enum: [...COOKING_METHOD_VALUES, null] },
          estimatedGrams: { type: 'number' },
          // "표준 1인분 대비 몇 배로 담겼나". LLM은 절대 그램수보다 상대적 양을 훨씬 잘 맞춘다 —
          // 200g인지 400g인지는 사진만으로 착각하기 쉽지만 "보통보다 조금 많다"는 잘 본다.
          // 표준 1인분을 아는 음식은 estimatedGrams 대신 표준×이 비율로 중량을 정한다.
          portionRatio: { type: 'number' },
          // ★ 식판 전용 — 그 칸을 얼마나 채웠나(0~1). 칸 크기는 물리적으로 고정이라 이 값은
          // portionRatio보다 분산이 작다. 둘을 섞어 쓰고, 크게 어긋나면 신뢰도를 낮춘다.
          trayFillRatio: { type: ['number', 'null'] },
          estimatedNutrients: NUTRIENT_SET_SCHEMA,
        },
        required: [
          'nameCandidates',
          'dbSearchName',
          'fallbackSearchName',
          'displayName',
          'servingContext',
          'role',
          'cookingMethod',
          'estimatedGrams',
          'portionRatio',
          'trayFillRatio',
          'estimatedNutrients',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['sceneType', 'items'],
  additionalProperties: false,
}

// 영양성분표 스캔 응답 (Analyze.jsx isLabelScanResult와 짝). 표에 없는 값은 null — 추정 금지 원칙.
const WEIGHT_SCHEMA = {
  type: ['object', 'null'],
  properties: {
    value: { type: ['number', 'null'] },
    unit: { type: ['string', 'null'] },
  },
  required: ['value', 'unit'],
  additionalProperties: false,
}

export const LABEL_SCAN_SCHEMA = {
  type: 'object',
  properties: {
    source: { type: 'string' },
    servingSize: WEIGHT_SCHEMA,
    totalWeight: WEIGHT_SCHEMA,
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          brand: { type: ['string', 'null'] },
          nutrients: NUTRIENT_SET_OR_NULL_SCHEMA,
        },
        required: ['name', 'brand', 'nutrients'],
        additionalProperties: false,
      },
    },
    total: NUTRIENT_SET_OR_NULL_SCHEMA,
  },
  required: ['source', 'servingSize', 'totalWeight', 'items', 'total'],
  additionalProperties: false,
}

// 식당 검색 키워드 응답 (MapPage.jsx fetchSearchKeywords와 짝).
export const KEYWORDS_SCHEMA = {
  type: 'object',
  properties: {
    keywords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          target: { type: 'string' },
        },
        required: ['keyword', 'target'],
        additionalProperties: false,
      },
    },
  },
  required: ['keywords'],
  additionalProperties: false,
}

// 식당 대표 메뉴 예상 섭취량 응답 (MapPage.jsx attachExpectedIntake와 짝).
// expected의 관련 없는 키는 null로 — 키를 빼는 대신 null을 쓰는 strict 모드 관례.
// 6주차 §5 — 대중적으로 가격대가 알려진 메뉴만 범위로 채우고, 확신 없으면 통째로 null(단정 가격 금지).
const PRICE_RANGE_SCHEMA = {
  type: ['object', 'null'],
  properties: { min: { type: 'number' }, max: { type: 'number' } },
  required: ['min', 'max'],
  additionalProperties: false,
}

export const EXPECTED_INTAKE_SCHEMA = {
  type: 'object',
  properties: {
    places: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          place_name: { type: 'string' },
          representativeMenu: { type: 'string' },
          expected: NUTRIENT_SET_OR_NULL_SCHEMA,
          priceRange: PRICE_RANGE_SCHEMA,
          // 전국 체인이면 업체가 식약처에 제출한 공식 영양성분(출처코드 2)이 존재할 가능성이 높다 —
          // 그 레코드를 우선 조회하도록 packaged 맥락으로 보낸다. 동네 식당이면 외식 분석 평균이 맞다.
          isFranchise: { type: 'boolean' },
        },
        required: ['place_name', 'representativeMenu', 'expected', 'priceRange', 'isFranchise'],
        additionalProperties: false,
      },
    },
  },
  required: ['places'],
  additionalProperties: false,
}

// 보충 추천 메뉴 응답 (Result.jsx isMenuRecommendationList와 짝).
export const RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reason: { type: 'string' },
          expected: NUTRIENT_SET_OR_NULL_SCHEMA,
        },
        required: ['name', 'reason', 'expected'],
        additionalProperties: false,
      },
    },
  },
  required: ['recommendations'],
  additionalProperties: false,
}

// AI 식습관 분석 응답 (DietAnalysisCard.jsx의 dietAnalysis.js parseDietAnalysisFindings와 짝).
// finding 1개 = { summary(1문장 단문), detail(1~2문장 근거 포함), type(good/warn/tip) }.
export const DIET_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          detail: { type: 'string' },
          type: { type: 'string', enum: ['good', 'warn', 'tip'] },
        },
        required: ['summary', 'detail', 'type'],
        additionalProperties: false,
      },
    },
  },
  required: ['findings'],
  additionalProperties: false,
}

// 한 판 통합 분석 응답 (trayAnalysis.js parseTrayAnalysisResult와 짝). items는 요청에 담긴 메뉴
// 개수만큼, 각 항목 6개 영양소 + total 6개 영양소 전부 숫자 필수.
export const TRAY_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          weight: { type: 'number' },
          ...Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, { type: 'number' }])),
        },
        required: ['name', 'weight', ...NUTRIENT_KEYS],
        additionalProperties: false,
      },
    },
    total: NUTRIENT_SET_SCHEMA,
  },
  required: ['items', 'total'],
  additionalProperties: false,
}

// 호출별 temperature (위 표와 동일 — 값을 바꿀 땐 표도 갱신).
export const GEMINI_TEMPERATURE = {
  identification: 0.2,
  labelScan: 0.1,
  keywords: 0.7,
  expectedIntake: 0.2,
  recommendation: 0.6,
  dietAnalysis: 0.5,
  trayAnalysis: 0.2,
}
