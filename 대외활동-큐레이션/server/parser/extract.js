// LLM 파싱. API·소스가 구조로 주는 값(지역, 분야)은 규칙으로 매핑하고,
// 크롤링한 자유 문장 참가조건만 LLM 에 맡긴다. 프롬프트와 강제 JSON 은 docs/schema.md 부록3.
// 우선순위 필드(학년·전공·지역)를 responseSchema 로 강제해서 형식 이탈 없이 뽑는다.
// 모델은 Gemini 3.5 Flash-Lite(무료 등급). 예전엔 Claude Haiku 였는데, 같은 파싱을 무료로 할 수
// 있어 갈아탔다(비용 이슈 해소). 무료 등급 한도는 하루 1000콜·분당 15콜이라, 돈 대신 '콜 수'를 지킨다.
import { GoogleGenAI, Type } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.5-flash-lite"; // 무료 등급 lite 모델. 2.5-flash-lite는 신규 키에 막혀 3.5로. docs/데이터-수집.md 참고.
const CONFIDENCE_THRESHOLD = 0.5; // 미만이면 needs_review.

// 무료 등급이라 돈은 안 새지만, 하루 1000콜 한도가 있다. 한 실행이 그걸 통째로 태우지 않게
// 콜 수 상한을 둔다(다른 로직이 전부 실패해도 이 카운터는 무조건 지켜진다 = 독립적인 안전장치).
// 한도를 넘으면 예외를 던져 그 실행 전체를 즉시 멈춘다(개별 공고만 스킵하지 않음).
// 분당 15콜 rate limit 은 호출하는 쪽(배치 루프)에서 간격을 줘 지킨다 - 여기선 콜 수만 센다.
const MAX_CALLS_PER_RUN = Number(process.env.GEMINI_MAX_CALLS) || 200;

let callCount = 0;

// 새 실행(배치) 시작할 때 호출해서 카운터를 0으로. 안 부르면 이전 실행 값이 이어짐(더 안전한 쪽).
export function resetBudget() { callCount = 0; }
export function getBudgetStatus() { return { callCount, MAX_CALLS_PER_RUN }; }

function checkBudgetOrThrow() {
  if (callCount >= MAX_CALLS_PER_RUN) {
    throw new Error(`[안전장치] 이번 실행 호출 상한(${MAX_CALLS_PER_RUN}회) 도달. 남은 공고는 다음 실행으로 미룸.`);
  }
}

// 넓은 표현을 canonical 전공(MAJORS)으로 펼친다. (schema.md 정규화 규칙)
export const MAJOR_MAP = {
  이공계: ["과학", "IT", "의학"],
  상경: ["경영", "경제"],
  상경계열: ["경영", "경제"],
  인문사회: ["인문", "경영", "경제", "교육"],
  인문계열: ["인문"],
  예체능: ["예술"],
  전공무관: [],
  // 소스가 주는 분야 태그 -> canonical
  "웹/모바일/IT": ["IT"], "게임/소프트웨어": ["IT"], "과학/공학": ["과학"],
  "광고/마케팅": ["경영"], "기획/아이디어": ["경영"],
};

// 지역 권역 펼치기 -> canonical REGIONS
export const REGION_MAP = {
  수도권: ["서울", "경기", "인천"],
  영남: ["부산", "대구", "울산", "경상"],
  호남: ["광주", "전라"],
  충청권: ["대전", "충청"],
  전국: [], // 무관
  제한없음: [],
};

// LLM이 준 값을 canonical(MAJORS/REGIONS)로 정규화. 이미 canonical이면 그대로, 매핑에 있으면 펼침.
function normalize(values, map) {
  const out = new Set();
  for (const v of values || []) {
    const mapped = map[v];
    if (mapped) mapped.forEach((m) => out.add(m));
    else out.add(v); // 이미 canonical이거나 매핑에 없는 값은 그대로 둔다
  }
  return [...out];
}

// 강제 JSON 스키마. Anthropic tool use 의 input_schema 를 Gemini responseSchema 로 옮겼다.
// Gemini 구조화 출력은 더 빡세다: 자유형 object(키 미정)와 integer enum 을 안 받아준다. 그래서
// found_in_text 는 필드별 근거를 명시 속성으로 두고, grades 는 enum 없이 정수 배열(1~4는 프롬프트로 제한).
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    track: { type: Type.STRING, enum: ["activity", "scholarship"] },
    category: { type: Type.STRING, enum: ["대외활동", "공모전", "장학"] },
    grades: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    enrollment_status: { type: Type.ARRAY, items: { type: Type.STRING, enum: ["재학", "휴학", "졸업예정"] } },
    majors: { type: Type.ARRAY, items: { type: Type.STRING } },
    regions: { type: Type.ARRAY, items: { type: Type.STRING } },
    found_in_text: {
      type: Type.OBJECT,
      properties: {
        grades: { type: Type.STRING },
        majors: { type: Type.STRING },
        regions: { type: Type.STRING },
        enrollment: { type: Type.STRING },
      },
    },
    confidence: { type: Type.NUMBER },
  },
  required: ["track", "category", "grades", "enrollment_status", "majors", "regions", "found_in_text", "confidence"],
};

const INSTRUCTION = `다음 공고를 분류하고, 지원에 '필수'인 자격조건만 뽑아라.
- track: activity(대외활동·공모전) 또는 scholarship(장학·지원금)
- category: 대외활동 / 공모전 / 장학 중 하나
- track이 scholarship이면 grades/majors/regions 등은 빈 배열로 둬라(장학 필드는 이후 별도 처리).
- grades는 1~4(학년) 정수만 담는다. 학년 제한이 없으면 빈 배열.
- 우대·우선 조건은 무시한다. 원문에 없는 조건은 추측하지 말고 빈 배열이나 빈 문자열로 둔다.
- 각 필드마다 근거가 된 원문 문장을 found_in_text에 그대로 담는다(없으면 빈 문자열).
- 확신이 낮으면 confidence를 0.5 이하로 준다.`;

// 분류(track/category) + 우선순위 필드(학년·전공·지역) 추출을 한 콜에 합친다.
// 원래 2콜(classify+extract)이었는데, 어차피 매번 둘 다 필요해서 나눌 이유가 없었다.
// 합치면 호출 수 -> 절반, 고정 프롬프트 오버헤드(지시문 반복)도 절반으로 줄어 무료 한도를 그만큼 아낀다.
async function classifyAndExtract(rawTitle, rawText) {
  checkBudgetOrThrow();
  const res = await client.models.generateContent({
    model: MODEL,
    contents: `${INSTRUCTION}\n공고: """${rawTitle}\n${rawText}"""`,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 600,
    },
  });
  callCount += 1;
  const text = res.text;
  if (!text) throw new Error("빈 응답(형식 강제 실패). 확인 필요로 떨어뜨린다.");
  return JSON.parse(text);
}

// 크롤링한 자유 문장 하나를 파싱해 우리 eligibility(camelCase, canonical) 모양으로 반환.
// 형식이 깨지거나 confidence가 낮으면 parseStatus를 needs_review로 둔다(공고 전체가 아니라 판정 자체를 보류).
export async function parse(rawTitle, rawText) {
  try {
    const ex = await classifyAndExtract(rawTitle, rawText);
    if (ex.track !== "activity") {
      // 장학(scholarship) 추출은 아직(3주차 범위 밖). 확인 필요로 둔다.
      return { track: ex.track, category: ex.category, eligibility: null, confidence: 0, parseStatus: "needs_review" };
    }
    const eligibility = {
      grades: ex.grades || [],
      majors: normalize(ex.majors, MAJOR_MAP),
      regions: normalize(ex.regions, REGION_MAP),
      enrollment: ex.enrollment_status || [],
      incomeMax: null,
      gpaMin: null,
      text: rawText.slice(0, 300),
    };
    const parseStatus = ex.confidence < CONFIDENCE_THRESHOLD ? "needs_review" : "curated";
    return { track: ex.track, category: ex.category, eligibility, confidence: ex.confidence, parseStatus, foundInText: ex.found_in_text };
  } catch (e) {
    // 호출 실패·형식 이탈 등은 전부 확인 필요로 안전하게 떨어뜨린다.
    // [안전장치]로 시작하는 에러는 호출 상한 도달 - 호출 자체가 안 나갔다는 표시를 남겨 나중에 구분한다.
    const isBudgetStop = e.message.startsWith("[안전장치]");
    return { track: null, category: null, eligibility: null, confidence: 0, parseStatus: "needs_review", error: e.message, isBudgetStop };
  }
}
