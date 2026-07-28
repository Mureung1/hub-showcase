// Gemini 사용량 소진(429)·키 없음·5xx 등으로 실제 호출이 막혔을 때 쓰는 폴백.
//
// 두 종류로 나눈다:
//  - 채점(점수·피드백)은 '판단'이라 가짜를 진짜로 착각하면 안 된다 → demo:true를 달아 화면에 라벨을 띄운다.
//  - 콘텐츠(뉴스 지문)는 '재료'라 큐레이션 목업으로 조용히 대체해도 훈련 경험이 유지된다.
//
// 캡처(이미지 OCR)는 폴백하지 않는다 — 가짜 추출은 오히려 오해를 부르고 데모 가치가 낮다.

import { totalOf } from "../domain/situations";
import { toScores, isCopied, type NewsScores } from "../domain/news-score";
import type { Attempt, Scores, Situation, NewsPassage, SummaryResult, AxisKey } from "../domain/types";
import type { ScoreInput } from "./score";
import type { GenerateInput } from "./generate";

const DEMO_COACH =
  "지금은 예시(데모) 채점이에요. AI 사용량이 회복되면 실제 채점이 다시 동작합니다.";

/** 채점 폴백 — 실제 판단이 아니라 중립 예시. demo:true로 화면에 '데모' 라벨을 띄운다. */
export function demoScore(input: ScoreInput): Attempt & { total: number; demo: true } {
  const scores: Scores = { context: 2, register: 2, strategy: 2 };
  const reason = "예시 채점이라 실제 근거가 아닙니다.";
  const reasons: Partial<Record<AxisKey, string>> = { context: reason, register: reason, strategy: reason };
  const isEmail = input.situation.medium === "email";
  return {
    text: input.draft,
    scores,
    reasons,
    deductions: [],
    coach: DEMO_COACH,
    fix: "",
    best: null,
    counterpartReply: isEmail ? "" : "(예시 응답) 네, 확인했어요. 이어서 이야기해요.",
    total: totalOf(scores),
    demo: true,
  };
}

/** 요약 채점 폴백 — 복붙 탐지(isCopied)는 순수 함수라 오프라인에서도 그대로 살린다. */
export function demoSummary(passage: { text: string; keyPoints: string[] }, draft: string): SummaryResult & { demo: true } {
  if (isCopied(draft, passage.text)) {
    const scores: NewsScores = { grasp: 1, accuracy: 2, concision: 1 };
    return {
      captured: [],
      missed: passage.keyPoints.slice(0, 2),
      verdict: totalOf(toScores(scores)) >= 50 ? "partial" : "miss",
      coach: "지문을 거의 그대로 옮겼어요. 요약은 핵심 하나를 골라 내 말로 압축하는 연습이에요. " + DEMO_COACH,
      scores,
      reasons: {
        grasp: "지문에서 직접 골라내지 않고 문장을 그대로 옮겼습니다.",
        concision: "내 말로 압축하지 않고 지문을 그대로 베꼈습니다.",
      },
      demo: true,
    };
  }
  const scores: NewsScores = { grasp: 2, accuracy: 2, concision: 2 };
  return {
    captured: [],
    missed: [],
    verdict: "partial",
    coach: DEMO_COACH,
    scores,
    reasons: { grasp: "예시 채점입니다.", accuracy: "예시 채점입니다.", concision: "예시 채점입니다." },
    demo: true,
  };
}

/** 콘텐츠 폴백 — 카테고리별 큐레이션 지문(시점에 안 걸리는 설명형). 라벨 없이 조용히 대체한다. */
const CURATED: Record<string, NewsPassage> = {
  market: {
    id: "demo_market",
    work: "경제·시장",
    scene: "기준금리와 물가, 그리고 내 지갑",
    text: "중앙은행은 물가가 너무 빠르게 오르면 기준금리를 올려 시중에 도는 돈을 줄인다. 금리가 오르면 대출 이자 부담이 커지고 소비와 투자가 줄어, 시간이 지나며 물가 상승 속도가 둔화된다. 반대로 경기가 가라앉으면 금리를 낮춰 돈이 더 돌게 한다. 그래서 금리 결정은 대출·예금·집값·주가까지 폭넓게 영향을 준다.",
    keyPoints: [
      "중앙은행은 물가를 잡으려 금리를 올리고, 경기를 살리려 금리를 내린다",
      "금리가 오르면 대출 이자가 늘어 소비·투자가 위축된다",
      "금리 한 번의 결정이 예금·집값·주가까지 넓게 파급된다",
    ],
    sourceHint: "예시 지문 (오프라인 데모)",
    sourceUrl: "",
    sourceTitle: "",
  },
  tech: {
    id: "demo_tech",
    work: "IT·기술",
    scene: "AI가 부른 반도체 수요, 왜 계속 커지나",
    text: "생성형 AI 모델을 학습·구동하려면 막대한 연산이 필요하고, 그 연산을 담당하는 것이 고성능 반도체다. 특히 대량의 데이터를 빠르게 주고받는 고대역폭 메모리(HBM) 수요가 급증했다. 데이터센터를 짓는 기업이 늘면서 전력·냉각 같은 인프라 부담도 함께 커지고 있다. 반도체 공급이 AI 서비스 확장의 속도를 좌우하는 병목이 된 셈이다.",
    keyPoints: [
      "AI 학습·구동에는 대량 연산이 필요해 고성능 반도체 수요가 늘었다",
      "특히 고대역폭 메모리(HBM)가 핵심 부품으로 떠올랐다",
      "반도체 공급이 AI 서비스 확장 속도의 병목이 되고 있다",
    ],
    sourceHint: "예시 지문 (오프라인 데모)",
    sourceUrl: "",
    sourceTitle: "",
  },
  sports: {
    id: "demo_sports",
    work: "스포츠",
    scene: "홈 어드밴티지는 정말 존재할까",
    text: "많은 종목에서 홈 팀이 원정 팀보다 승률이 조금 높은 경향이 관찰된다. 익숙한 경기장, 이동 피로가 없는 점, 응원의 힘 등이 원인으로 꼽힌다. 다만 관중 없는 경기가 늘었던 시기에는 그 효과가 줄었다는 분석도 있어, 응원의 비중이 생각보다 크다는 해석이 나온다. 홈 어드밴티지는 절대적이지 않고 종목과 상황에 따라 달라진다.",
    keyPoints: [
      "여러 종목에서 홈 팀 승률이 다소 높은 경향이 있다",
      "익숙한 환경·이동 피로·응원 등이 원인으로 꼽힌다",
      "무관중 시기 효과가 줄어 응원의 비중이 크다는 해석이 있다",
    ],
    sourceHint: "예시 지문 (오프라인 데모)",
    sourceUrl: "",
    sourceTitle: "",
  },
  culture: {
    id: "demo_culture",
    work: "문화·연예",
    scene: "스트리밍 시대, 음악은 어떻게 소비되나",
    text: "음악을 소장하기보다 필요할 때 흘려 듣는 스트리밍이 주류가 되면서, 곡의 도입부가 짧아지고 후렴이 빨리 나오는 경향이 생겼다. 재생 몇 초 안에 청취자를 붙잡아야 알고리즘 추천에 유리하기 때문이다. 앨범 단위보다 플레이리스트·개별 곡 중심으로 듣는 습관도 자리 잡았다. 창작 방식 자체가 소비 플랫폼의 구조에 맞춰 변하고 있는 것이다.",
    keyPoints: [
      "스트리밍이 주류가 되며 곡 도입부가 짧아지는 경향이 생겼다",
      "초반 몇 초에 청취자를 붙잡아야 추천에 유리하기 때문이다",
      "앨범보다 플레이리스트·개별 곡 중심 소비가 자리 잡았다",
    ],
    sourceHint: "예시 지문 (오프라인 데모)",
    sourceUrl: "",
    sourceTitle: "",
  },
  society: {
    id: "demo_society",
    work: "사회·생활",
    scene: "1인 가구 증가가 바꾸는 도시의 모습",
    text: "혼자 사는 가구가 꾸준히 늘면서 소형 주택 수요와 소포장 상품, 배달·구독 서비스가 함께 성장했다. 생활 방식이 달라지자 도시의 상권과 주거 형태도 그에 맞춰 재편되고 있다. 한편으로는 사회적 고립이나 돌봄 공백 같은 과제도 함께 커져, 공동체와 복지의 역할이 다시 주목받는다. 인구 구조의 변화가 일상 곳곳으로 번지는 셈이다.",
    keyPoints: [
      "1인 가구 증가로 소형 주택·소포장·구독 서비스가 성장했다",
      "생활 방식 변화에 맞춰 상권과 주거 형태가 재편되고 있다",
      "사회적 고립·돌봄 공백 같은 과제도 함께 커지고 있다",
    ],
    sourceHint: "예시 지문 (오프라인 데모)",
    sourceUrl: "",
    sourceTitle: "",
  },
};

export function curatedNews(category: string): NewsPassage {
  const p = CURATED[category] || CURATED.market;
  // id를 매번 다르게 해 '새 상황' XP 파밍은 뉴스 sid(카테고리 고정)가 막으므로 여기선 그대로 둔다.
  return { ...p };
}

const GENERIC_RUBRIC: [string, string, string] = [
  "상대·상황을 고려하지 않아 오해나 마찰을 부른다",
  "무난하지만 특별히 배려가 드러나지는 않는다",
  "상대와 목적에 맞아 자연스럽고 적절하다",
];

/** 상황 생성 폴백 — AI 없이 사용자가 쓴 입력만으로 최소 상황 카드를 구성한다. */
export function situationFromInput(input: GenerateInput): Situation {
  const medium = input.medium === "email" ? "email" : "chat";
  const title = input.title.length > 24 ? input.title.slice(0, 24) + "…" : input.title;
  return {
    id: "c" + Date.now(),
    roles: [],
    title,
    rel: input.who || "상대",
    counterpart: input.who || "",
    goal: input.goal || "",
    tension: input.tension || "",
    direction: "격식은 높을수록 좋은 게 아니라 상대·상황에 맞아야 합니다.",
    axis: "① 맥락",
    sample: "",
    opener: medium === "email" ? null : "안녕하세요, 잠깐 이야기 나눌 수 있을까요?",
    medium,
    rubric: { context: GENERIC_RUBRIC, register: GENERIC_RUBRIC, strategy: GENERIC_RUBRIC },
  };
}
