// LLM 파싱. API·소스가 구조로 주는 값(지역, 연령, 분야)은 규칙으로 매핑하고,
// 크롤링한 자유 문장 참가조건만 LLM 에 맡긴다. 프롬프트와 강제 JSON 은 docs/schema.md 부록3.
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 넓은 표현을 canonical 전공으로 펼친다. (schema.md 정규화 규칙)
export const MAJOR_MAP = {
  이공계: ["과학", "IT", "의학"],
  상경: ["경영", "경제"],
  상경계열: ["경영", "경제"],
  인문사회: ["인문", "경영", "경제", "교육"],
  예체능: ["예술"],
  // TODO(#4): 소스가 주는 분야 태그도 여기에 (웹/모바일/IT -> IT, 과학/공학 -> 과학 등)
};

// 지역 권역 펼치기
export const REGION_MAP = {
  수도권: ["서울", "경기", "인천"],
  영남: ["부산", "대구", "울산", "경상"],
  호남: ["광주", "전라"],
  충청권: ["대전", "충청"],
  // TODO(3)
};

// 1단계 분류 -> 2단계 추출. found_in_text 와 confidence 포함. 실패는 needs_review.
export async function parse(rawText) {
  // TODO(3): client.chat.completions ... structured outputs 로 schema.md JSON 강제
  return { track: null, category: null, eligibility: null, confidence: 0 };
}
