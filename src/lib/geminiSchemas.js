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

// 사진·텍스트 공용 음식 식별 응답 (Analyze.jsx isIdentificationResult와 짝).
export const IDENTIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dbSearchName: { type: 'string' },
          fallbackSearchName: { type: 'string' },
          displayName: { type: 'string' },
          estimatedGrams: { type: 'number' },
          estimatedNutrients: NUTRIENT_SET_SCHEMA,
        },
        required: ['dbSearchName', 'fallbackSearchName', 'displayName', 'estimatedGrams', 'estimatedNutrients'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
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
        },
        required: ['place_name', 'representativeMenu', 'expected', 'priceRange'],
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
