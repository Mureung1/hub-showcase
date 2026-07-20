// LLM 파싱. API·소스가 구조로 주는 값(지역, 연령, 분야)은 규칙으로 매핑하고,
// 크롤링한 자유 문장 참가조건만 LLM 에 맡긴다. 프롬프트와 강제 JSON 은 docs/schema.md 부록3.
// 우선순위 필드(학년·전공·지역·나이)를 tool use 로 강제해서 형식 이탈 없이 뽑는다.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001"; // 저렴한 모델. 비용은 극단적으로 줄인다(docs/데이터-수집.md).
const CONFIDENCE_THRESHOLD = 0.5; // 미만이면 needs_review.

// 돈이 새는 걸 막는 하드 상한. 만료건 감지 같은 다른 로직이 전부 실패해도
// 이 카운터·비용 합계는 무조건 지켜진다(같은 조건에 안 걸림 = 독립적인 안전장치).
// 한도를 넘으면 예외를 던져 그 실행 전체를 즉시 멈춘다(개별 공고만 스킵하지 않음).
const MAX_CALLS_PER_RUN = 30;
const MAX_COST_PER_RUN_USD = 0.5;
const PRICE = { input: 1 / 1_000_000, output: 5 / 1_000_000 }; // Haiku 4.5: $1.00 / $5.00 per 1M

let callCount = 0;
let cumulativeCostUsd = 0;

// 새 실행(배치) 시작할 때 호출해서 카운터를 0으로. 안 부르면 이전 실행 값이 이어짐(더 안전한 쪽).
export function resetBudget() { callCount = 0; cumulativeCostUsd = 0; }
export function getBudgetStatus() { return { callCount, cumulativeCostUsd, MAX_CALLS_PER_RUN, MAX_COST_PER_RUN_USD }; }

function checkBudgetOrThrow() {
  if (callCount >= MAX_CALLS_PER_RUN) {
    throw new Error(`[안전장치] 이번 실행 호출 상한(${MAX_CALLS_PER_RUN}회) 도달. 남은 공고는 다음 실행으로 미룸.`);
  }
  if (cumulativeCostUsd >= MAX_COST_PER_RUN_USD) {
    throw new Error(`[안전장치] 이번 실행 누적 예상비용 상한($${MAX_COST_PER_RUN_USD}) 도달. 남은 공고는 다음 실행으로 미룸.`);
  }
}

function recordUsage(usage) {
  callCount += 1;
  cumulativeCostUsd += (usage?.input_tokens || 0) * PRICE.input + (usage?.output_tokens || 0) * PRICE.output;
}

// 호출 없이(무료) 대략적인 비용을 미리 가늠하는 로컬 추정치. 한글은 대략 1.8자당 1토큰으로 근사.
// 실행 전 "몇 건, 예상 $X" 를 사람이 보고 판단할 수 있게 하는 드라이런용.
export function estimateCostUsd(rawText) {
  const inputTokens = Math.ceil((rawText || "").length / 1.8) + 300; // 프롬프트 고정분 여유
  const outputTokens = 200;
  return inputTokens * PRICE.input + outputTokens * PRICE.output; // 분류+추출 1콜로 합침
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

// 분류(track/category) + 우선순위 필드(학년·전공·지역·나이) 추출을 한 콜에 합친다.
// 원래 2콜(classify+extract)이었는데, 어차피 매번 둘 다 필요해서 나눌 이유가 없었다.
// 합치면 호출 수 -> 절반, 고정 프롬프트 오버헤드(지시문 반복)도 절반으로 줄어 비용이 그만큼 준다.
async function classifyAndExtract(rawTitle, rawText) {
  checkBudgetOrThrow();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    tools: [{
      name: "parse_posting",
      description: "공고를 분류하고 자격요건에서 필수 조건만 추출",
      input_schema: {
        type: "object",
        properties: {
          track: { type: "string", enum: ["activity", "scholarship"] },
          category: { type: "string", enum: ["대외활동", "공모전", "봉사", "장학"] },
          grades: { type: "array", items: { type: "integer", enum: [1, 2, 3, 4] } },
          enrollment_status: { type: "array", items: { type: "string", enum: ["재학", "휴학", "졸업예정"] } },
          majors: { type: "array", items: { type: "string" } },
          regions: { type: "array", items: { type: "string" } },
          age_min: { type: ["integer", "null"] },
          age_max: { type: ["integer", "null"] },
          found_in_text: { type: "object" },
          confidence: { type: "number" },
        },
        required: ["track", "category", "grades", "enrollment_status", "majors", "regions", "age_min", "age_max", "found_in_text", "confidence"],
        additionalProperties: false,
      },
    }],
    tool_choice: { type: "tool", name: "parse_posting" },
    messages: [{ role: "user", content: `다음 공고를 분류하고, 지원에 '필수'인 자격조건만 뽑아라.\n- track: activity(대외활동·공모전·봉사) 또는 scholarship(장학·지원금)\n- category: 대외활동 / 공모전 / 봉사 / 장학 중 하나\n- track이 scholarship이면 grades/majors/regions/age 등은 빈 배열·null로 둬라(장학 필드는 이후 별도 처리).\n- 우대·우선 조건은 무시한다. 원문에 없는 조건은 추측하지 말고 빈 배열이나 null로 둔다.\n- 각 필드마다 근거가 된 원문 문장을 found_in_text에 그대로 담는다.\n- 확신이 낮으면 confidence를 0.5 이하로 준다.\n공고: """${rawTitle}\n${rawText}"""` }],
  });
  recordUsage(res.usage);
  const tool = res.content.find((c) => c.type === "tool_use");
  return tool.input;
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
      ageMin: ex.age_min ?? null,
      ageMax: ex.age_max ?? null,
      incomeMax: null,
      gpaMin: null,
      text: rawText.slice(0, 300),
    };
    const parseStatus = ex.confidence < CONFIDENCE_THRESHOLD ? "needs_review" : "curated";
    return { track: ex.track, category: ex.category, eligibility, confidence: ex.confidence, parseStatus, foundInText: ex.found_in_text };
  } catch (e) {
    // 호출 실패·형식 이탈 등은 전부 확인 필요로 안전하게 떨어뜨린다.
    // [안전장치]로 시작하는 에러는 예산 상한 도달 - 호출 자체가 안 나갔다는 표시를 남겨 나중에 구분한다.
    const isBudgetStop = e.message.startsWith("[안전장치]");
    return { track: null, category: null, eligibility: null, confidence: 0, parseStatus: "needs_review", error: e.message, isBudgetStop };
  }
}
