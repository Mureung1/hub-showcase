# 뉴스 맥락훈련 + 카톡 캡쳐 상황생성 web/ 포팅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 삭제된 루트 프로토타입(index.html)에만 있던 "요즘 뉴스" 맥락훈련(Gemini search grounding)과 "카톡 캡쳐로 상황 만들기"(Gemini vision) 기능을 web/(Next.js) 앱에 이식한다.

**Architecture:** 채점·상황설계는 기존대로 Claude(Anthropic SDK)를 쓰고, 이번에 포팅하는 두 기능(뉴스 grounding·요약채점·캡쳐vision)만 별도의 서버 전용 Gemini 호출 모듈(`lib/scoring/gemini.ts`)을 통해 신규 API 라우트 3개(`/api/context/news`, `/api/context/summary`, `/api/capture`)로 노출한다. 클라이언트는 새 화면 `ContextReading`과 기존 `Picker`/`NewSituation`에 진입점을 추가해 이 라우트들을 호출한다.

**Tech Stack:** Next.js 16(App Router, Node runtime route handlers), TypeScript, React 19, Gemini REST API(`generativelanguage.googleapis.com`, `x-goog-api-key` 헤더), Vitest.

## Global Constraints

- 뉴스 검색(grounding)·요약 채점·캡쳐 이미지 분석은 전부 **Gemini**로 구현한다 — Claude를 추가로 쓰지 않는다(무료 티어 유지가 목적).
- `GEMINI_API_KEY`는 **서버 환경변수에만** 둔다. 클라이언트에 키를 노출하거나 "방문자가 자기 키 입력" 폴백을 만들지 않는다.
- '맥락 읽기'는 **뉴스만** 포팅한다. 소설 지문(`PASSAGES`, kind:'novel')은 포팅하지 않는다.
- 이미지 업로드 상한 6MB, `image/*` mimeType만 허용.
- 신규 API 라우트는 기존 `web/src/app/api/situation/route.ts` 패턴을 그대로 따른다: `export const runtime = "nodejs"`, `sameOrigin` + `rateLimit(key, 10, 60_000)` 가드, `NO_KEY` 에러는 503으로 매핑.
- 참고 스펙: `docs/superpowers/specs/2026-07-21-context-training-port-design.md`. 구 프로토타입 원본 코드는 `git show b83fcb0~1:index.html`로 확인 가능(라인 963-2436).
- 작업 디렉터리는 `web/`(Next.js 프로젝트 루트) 기준. 모든 명령은 `web/`에서 실행한다.

---

## Task 1: 폐기된 '실전 사례' 각색카드 제거

web/의 `situations.json`에는 2026-07-18에 이미 폐기 결정된 각색카드(`ctx:true`) 8개가 남아있다(id: `cx_apology`, `cx_notice`, `cx_gapjil`, `cx_defense`, `cx_refund`, `cx_reject`, `cx_price`, `cx_review`, 파일의 1966~2227번째 줄). 이 데이터와 그걸 참조하는 `ctx` 필드·분기를 전부 제거해, 이후 태스크에서 그 자리에 "요즘 뉴스" 탭을 넣을 수 있게 정리한다.

**Files:**
- Modify: `web/src/lib/domain/situations.json:1965-2227`
- Modify: `web/src/lib/domain/situations.test.ts:76`
- Modify: `web/src/lib/domain/types.ts:29`
- Modify: `web/src/components/screens/Home.tsx:16`
- Modify: `web/src/components/screens/Train.tsx:117-122`

**Interfaces:**
- Produces: `Situation` 타입에서 `ctx` 필드 제거(이후 태스크는 이 필드를 참조하지 않는다).

- [ ] **Step 1: 기존 테스트가 69개 이상을 기대하는지 확인(실패 예정 확인용 베이스라인)**

Run: `npm test -- situations.test.ts`
Expected: PASS (아직 삭제 전이므로 현재는 통과 — 이 스텝은 베이스라인 확인용)

- [ ] **Step 2: situations.json에서 각색카드 8개 삭제**

`web/src/lib/domain/situations.json`의 1965번째 줄(`  },`)부터 1966번째 줄(`  {` — `cx_apology` 시작) 직전까지는 유지하고, 1966번째 줄부터 파일 끝(2227번째 줄, 배열을 닫는 `]` 직전의 마지막 `}`)까지의 8개 객체를 전부 삭제한다. 삭제 후 배열의 새 마지막 요소가 되는 직전 객체의 끝을 `  },`에서 `  }`로 바꿔 trailing comma를 없앤다(JSON 문법 오류 방지).

구체적으로: 1965번째 줄을
```
  },
```
에서
```
  }
```
로 바꾸고, 그 다음에 오던 `cx_apology`부터 `cx_review`까지의 8개 객체(원래의 1966~2227번째 줄)를 통째로 삭제한다. 파일은 `]`로 끝나야 한다.

- [ ] **Step 3: JSON 문법 검증**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/lib/domain/situations.json','utf8')); console.log('OK')"`
Expected: `OK` 출력(파싱 에러 없음)

- [ ] **Step 4: situations.test.ts의 길이 기대값을 61로 수정**

`web/src/lib/domain/situations.test.ts:76`의

```ts
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(69);
```

을 아래로 교체:

```ts
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(61);
```

같은 파일 75번째 줄의 주석도 맞춰 수정:

```ts
  it("61개 이상, 모든 상황에 id·title·rubric(3×3)", () => {
```

- [ ] **Step 5: 테스트 재실행 — 통과 확인**

Run: `npm test -- situations.test.ts`
Expected: PASS, `SITUATIONS.length`가 61

- [ ] **Step 6: `Situation` 타입에서 `ctx` 필드 제거**

`web/src/lib/domain/types.ts:29`의

```ts
  ctx?: boolean;
```

줄을 삭제한다.

- [ ] **Step 7: `Home.tsx`의 `!s.ctx` 필터 제거**

`web/src/components/screens/Home.tsx:16`을

```ts
  const mine = SITUATIONS.filter((s) => !s.ctx && (!app.profile?.role || s.roles?.includes(app.profile.role)));
```

에서

```ts
  const mine = SITUATIONS.filter((s) => !app.profile?.role || s.roles?.includes(app.profile.role));
```

로 교체.

- [ ] **Step 8: `Train.tsx`의 죽은 `sit.ctx` 분기 제거**

`web/src/components/screens/Train.tsx:117-122`의 아래 블록을 통째로 삭제:

```tsx
      {sit.ctx && sit.sample && (
        <div className="mb-3 rounded-2xl border p-4" style={{ background: "var(--bad-soft)", borderColor: "var(--bad)" }}>
          <div className="mb-2 text-[12px] font-extrabold" style={{ color: "var(--bad)" }}>🔴 실제로 나갔던 원문 — 무엇이 문제일까요?</div>
          <div className="rounded-lg border p-3 text-[13.5px]" style={{ background: "var(--surface)", borderColor: "var(--line)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{sit.sample}</div>
        </div>
      )}
```

- [ ] **Step 9: 타입체크·린트·전체 테스트 확인**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 전부 에러 없이 통과

- [ ] **Step 10: 커밋**

```bash
git add src/lib/domain/situations.json src/lib/domain/situations.test.ts src/lib/domain/types.ts src/components/screens/Home.tsx src/components/screens/Train.tsx
git commit -m "chore: 폐기된 실전 사례 각색카드(ctx) 8개 및 관련 코드 제거"
```

---

## Task 2: Gemini 호출 인프라

뉴스·요약채점·캡쳐 세 기능이 공유할 서버 전용 Gemini REST 호출 모듈을 만든다. `web/src/lib/scoring/score.ts`(Claude 호출)와 나란히 두되 별도 provider이므로 완전히 독립된 파일이다.

**Files:**
- Create: `web/src/lib/scoring/gemini.ts`
- Test: `web/src/lib/scoring/gemini.test.ts`

**Interfaces:**
- Produces:
  - `GEMINI_MODEL: string`
  - `interface GeminiPart { text?: string; inline_data?: { mime_type: string; data: string } }`
  - `interface GeminiBody { system_instruction?: { parts: [{ text: string }] }; contents: [{ role: "user"; parts: GeminiPart[] }]; generationConfig?: Record<string, unknown>; tools?: Array<Record<string, unknown>> }`
  - `interface GeminiResponse { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string; groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }>; promptFeedback?: { blockReason?: string }; error?: { message?: string; details?: Array<{ retryDelay?: string; retryInfo?: { retryDelay?: string } }> } }`
  - `parseLooseJson(raw: string): any` — 다음 태스크들이 Gemini 텍스트 응답을 파싱할 때 쓴다.
  - `extractText(data: GeminiResponse): string`
  - `extractSource(data: GeminiResponse): { uri: string; title: string } | null`
  - `callGemini(model: string, body: GeminiBody): Promise<GeminiResponse>` — `GEMINI_API_KEY` 없으면 `Error('NO_KEY')` throw. 429/5xx는 최대 3회, 45초 상한으로 자동 재시도.

- [ ] **Step 1: 실패하는 테스트 작성 — `parseLooseJson`**

`web/src/lib/scoring/gemini.test.ts` 생성:

```ts
import { describe, it, expect } from "vitest";
import { parseLooseJson } from "./gemini";

describe("parseLooseJson", () => {
  it("정상 JSON을 그대로 파싱", () => {
    expect(parseLooseJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });
  it("트레일링 콤마를 관대하게 처리", () => {
    expect(parseLooseJson('{"a":1,"b":[1,2,],}')).toEqual({ a: 1, b: [1, 2] });
  });
  it("스마트 따옴표를 표준 따옴표로 변환", () => {
    const raw = "{“a”:1}";
    expect(parseLooseJson(raw)).toEqual({ a: 1 });
  });
  it("응답 앞뒤에 텍스트가 섞여 있어도 첫 JSON 블록만 추출", () => {
    expect(parseLooseJson('here is json: {"a":1} thanks')).toEqual({ a: 1 });
  });
  it("JSON 블록이 없으면 에러", () => {
    expect(() => parseLooseJson("no json here")).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test -- gemini.test.ts`
Expected: FAIL(`./gemini` 모듈이 없음)

- [ ] **Step 3: `gemini.ts` 구현**

`web/src/lib/scoring/gemini.ts` 생성:

```ts
// Gemini 서버 호출 인프라 — 뉴스 grounding·요약채점·캡쳐vision 전용.
// Claude(score.ts/generate.ts)와 별도 provider — 무료 티어 유지 목적으로 이 세 기능만 Gemini를 쓴다.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export interface GeminiBody {
  system_instruction?: { parts: [{ text: string }] };
  contents: [{ role: "user"; parts: GeminiPart[] }];
  generationConfig?: Record<string, unknown>;
  tools?: Array<Record<string, unknown>>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; details?: Array<{ retryDelay?: string; retryInfo?: { retryDelay?: string } }> };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryAfterSec(data: GeminiResponse | null): number | null {
  const details = data?.error?.details || [];
  for (const d of details) {
    const v = d.retryDelay || d.retryInfo?.retryDelay;
    const n = v ? parseFloat(v) : NaN;
    if (n > 0) return n;
  }
  const m = (data?.error?.message || "").match(/retry in ([\d.]+)\s*s/i);
  return m ? parseFloat(m[1]) : null;
}

function friendlyError(status: number, data: GeminiResponse | null): Error {
  const raw = data?.error?.message || `HTTP ${status}`;
  if (status === 429) {
    const s = retryAfterSec(data);
    if (!s || s > 300) {
      const when = s ? `약 ${Math.ceil(s / 60)}분 뒤` : "내일";
      return new Error(`Gemini 무료 사용량 한도를 다 썼습니다. ${when}에 다시 시도해주세요.`);
    }
    return new Error(`Gemini 요청 한도에 걸렸습니다. 약 ${Math.ceil(s)}초 뒤에 다시 시도해주세요.`);
  }
  if (status === 400 && /API[_ ]key not valid|API_KEY_INVALID/i.test(raw)) {
    return new Error("Gemini API 키가 올바르지 않습니다.");
  }
  if (status === 403) return new Error("이 Gemini API 키로는 요청이 거부되었습니다.");
  if (status >= 500) return new Error("Gemini 서버가 일시적으로 불안정합니다. 잠시 뒤 다시 시도해주세요.");
  return new Error(raw);
}

/** Gemini 응답에서 첫 JSON 블록을 관대하게 파싱한다(트레일링 콤마·스마트따옴표 허용). */
export function parseLooseJson(raw: string) {
  const text = String(raw ?? "");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`JSON 형식이 아닌 응답: ${text.slice(0, 150)}`);
  try {
    return JSON.parse(m[0]);
  } catch {
    const cleaned = m[0]
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    return JSON.parse(cleaned);
  }
}

/** 응답 후보의 텍스트 파트를 이어붙인다. */
export function extractText(data: GeminiResponse): string {
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
}

/** grounding 메타데이터에서 첫 실제 출처 URL을 뽑는다(모델이 지어낸 링크 대신 실제 검색 결과 링크). */
export function extractSource(data: GeminiResponse): { uri: string; title: string } | null {
  const chunks = (data.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web)
    .filter((w): w is { uri: string; title?: string } => !!w?.uri);
  const src = chunks[0];
  return src ? { uri: src.uri, title: src.title || "" } : null;
}

/** Gemini generateContent 호출. 429/5xx는 RetryInfo 기반 자동 재시도(최대 3회, 45초 상한). */
export async function callGemini(model: string, body: GeminiBody): Promise<GeminiResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const MAX_ATTEMPTS = 3;
  const MAX_WAIT_SEC = 45;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as GeminiResponse | null;

    if (res.ok) {
      const text = extractText(data || {});
      if (text) return data as GeminiResponse;
      const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || "알 수 없음";
      if (reason === "MAX_TOKENS") throw new Error("응답이 너무 길어 잘렸습니다.");
      if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT") throw new Error("안전 필터에 걸려 처리하지 못했습니다.");
      throw new Error(`Gemini가 빈 응답을 보냈습니다 (사유: ${reason})`);
    }

    const retryable = res.status === 429 || res.status >= 500;
    const wait = res.status === 429 ? (retryAfterSec(data) ?? 20) : 2 * attempt;
    if (retryable && attempt < MAX_ATTEMPTS && wait <= MAX_WAIT_SEC) {
      await sleep(wait * 1000 + 400);
      continue;
    }
    throw friendlyError(res.status, data);
  }
}
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

Run: `npm test -- gemini.test.ts`
Expected: PASS(5개 테스트 전부)

- [ ] **Step 5: 타입체크·린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/lib/scoring/gemini.ts src/lib/scoring/gemini.test.ts
git commit -m "feat: Gemini 서버 호출 인프라(재시도·grounding 소스 추출·관대한 JSON 파싱)"
```

---

## Task 3: 프롬프트 · 뉴스 카테고리 · 도메인 타입

**Files:**
- Create: `web/src/lib/scoring/context-system.ts`
- Create: `web/src/lib/domain/news-categories.ts`
- Test: `web/src/lib/domain/news-categories.test.ts`
- Modify: `web/src/lib/domain/types.ts`

**Interfaces:**
- Consumes: 없음(순수 데이터/상수 모듈).
- Produces:
  - `NEWS_FETCH_SYSTEM: string`, `NEWS_SUMMARY_SYSTEM: string`, `CAPTURE_SYSTEM: string`
  - `interface NewsCategory { key: string; label: string; query: string }`, `NEWS_CATEGORIES: NewsCategory[]`
  - `interface NewsPassage { id: string; work: string; scene: string; text: string; keyPoints: string[]; sourceHint: string; sourceUrl: string; sourceTitle: string }`
  - `interface SummaryResult { captured: string[]; missed: string[]; verdict: "pass" | "partial" | "miss"; coach: string }`
  - `interface CaptureExtract { title: string; who: string; rel: string; goal: string; tension: string }`

- [ ] **Step 1: 프롬프트 상수 파일 작성**

`web/src/lib/scoring/context-system.ts` 생성(구 index.html L1104-1156 그대로 이식, 번역·수정 없음):

```ts
// 뉴스 맥락훈련 + 카톡 캡쳐 상황생성용 Gemini 프롬프트.
// 구 루트 프로토타입(index.html, 삭제된 커밋 b83fcb0 직전)에서 그대로 이식 — 검증된 프롬프트, 수정하지 않는다.

export const NEWS_SUMMARY_SYSTEM = `당신은 한국어 '뉴스 핵심 파악' 채점자입니다. 사용자가 최신 뉴스 한 편을 읽고 쓴 '한 줄 요약'이, 그 기사의 핵심 요지(무슨 일이 일어났고, 무엇이 왜 중요하며, 어떤 영향·쟁점이 있는가)를 제대로 담았는지 채점합니다.

[가장 중요] 지엽적인 세부사항 나열이 아니라, 이 뉴스에서 가장 중요한 한 가지(핵심 사실과 그 의미)를 짚었는지를 봅니다. 다만 이건 글쓰기 시험이 아니라 '읽는 눈'을 키우는 연습입니다 — 관대하게 채점하세요.

핵심 포인트(keyPoints) 목록이 주어집니다. 사용자 요약이 각 포인트를 담았는지 넉넉하게 판정하세요 — 표현이 달라도 뜻이 통하면 담긴 것으로 봅니다. keyPoints를 전부 담을 필요는 없습니다.

[채점 기준 — 완화]
- pass: 이 뉴스의 핵심 방향(무슨 일이고 왜 중요한지)을 잡았으면 pass. 세부 하나둘 놓쳐도, 표현이 투박해도 방향만 맞으면 통과입니다.
- partial: 방향은 얼추 맞지만 요지가 너무 두루뭉술하거나, 중심이 아닌 곁가지를 핵심처럼 잡았을 때.
- miss: 핵심을 전혀 못 짚었거나(사실 나열만), 기사와 어긋난 이해일 때만.
기본적으로 pass 쪽으로 관대하게 기울이되, coach로 더 나아질 지점을 부드럽게 짚어주세요.

[출력 — 아래 JSON만, 다른 텍스트·마크다운 금지]
{"captured":["사용자가 제대로 짚은 핵심(짧게)"],"missed":["놓친 핵심(원래 keyPoint를 짧게)"],"verdict":"pass|partial|miss","coach":"코칭 2~3문장 — 잘 짚은 점을 구체적으로(사용자가 쓴 표현을 콕 집어) 인정하고, 더 나아질 지점을 부드럽게 제안. 다그치지 말고 격려하는 선배 톤. 존댓말."}`;

// 뉴스 지문 생성 — Google 검색 grounding으로 최신 뉴스를 가져와 스키마로 반환.
export const NEWS_FETCH_SYSTEM = `당신은 한국어 뉴스 큐레이터입니다. 방금 검색한 결과를 바탕으로, 사용자가 읽고 '한 줄 요약'을 연습할 뉴스 하나를 골라 아래 JSON으로만 반환합니다.

[최신성 — 가장 중요]
- 반드시 가능한 한 오늘~최근 며칠 이내의 '최신' 기사를 고르세요. 검색 결과에 여러 개가 있으면 가장 날짜가 최근인 것을 우선합니다.
- 오래된 기사, 일반 상식·백과사전식 설명글, 시점이 불분명한 글은 고르지 마세요.

[내용 원칙]
- 실제로 검색 결과에 있는 사실만 씁니다. 지어내지 마세요.
- 특정 정당·정치인에 대한 편향, 확인되지 않은 소문, 자극적 가십은 피합니다. 시장·경제·산업·생활·기술 중심의 담백한 뉴스가 좋습니다.
- 본문(text)은 배경을 모르는 사람도 흐름을 이해할 수 있게 **5~8문장**으로 상세히 씁니다: (1) 무슨 일이 있었는지 → (2) 배경·경위 → (3) 관련 수치나 구체적 사실 → (4) 앞으로의 전망이나 파장. 기사 문장을 그대로 베끼지 말고 자연스러운 우리말로 다시 씁니다.
- keyPoints는 이 뉴스의 '핵심 요지' 3가지(핵심 사실 + 그것이 왜 중요한지/무슨 영향인지)를 각각 한 문장으로.
- sourceHint에는 매체명과 보도 시점을 확실한 경우에만 적고, 불확실하면 시점은 생략하세요(지어내지 말 것). 실제 기사 링크는 시스템이 검색 메타데이터에서 따로 붙입니다.

[출력 — 아래 JSON만, 다른 텍스트·마크다운 금지]
{"work":"카테고리 라벨(짧게, 예: 경제·시장)","scene":"기사 헤드라인 한 줄","text":"5~8문장 상세 요약","keyPoints":["핵심 요지1","핵심 요지2","핵심 요지3"],"sourceHint":"매체·시점 한 줄(예: 연합뉴스 · 2026년 7월)"}
검색 결과가 비었거나 마땅한 최신 뉴스가 없으면 scene 을 빈 문자열("")로 두세요.`;

export const CAPTURE_SYSTEM = `당신은 카카오톡 등 메신저 대화 캡쳐 이미지를 읽고, 화용 훈련용 '상황 정보'를 추출하는 도우미입니다.

[개인정보 — 반드시]
- 실명·전화번호·주소·이메일 등 개인정보는 절대 그대로 쓰지 말고 익명화하세요(상대, ○○, 나).
- 대화 원문을 그대로 옮기지 말고, 상황을 일반화해 요약하세요.

[관점] 캡쳐를 올린 사용자는 대화의 한쪽 당사자('나')입니다. 보통 오른쪽 말풍선이 '나'입니다. 확실치 않으면 맥락으로 추정하세요(사용자가 나중에 수정합니다).

[출력 — 아래 JSON만, 다른 텍스트·마크다운 금지]
{"title":"이 상황을 한 줄로(예: 팀장에게 일정 변경 부탁하기)","who":"상대가 누구이고 어떤 사람인지 익명화해 한 문장","rel":"관계 라벨 짧게(예: 직장 상사/친구/거래처)","goal":"내가 이 대화에서 이루려는 목적 한 문장","tension":"이 상황의 핵심 긴장·조심할 점 한 문장"}
대화 캡쳐가 아니거나 읽을 수 없으면 title 을 빈 문자열("")로 두세요.`;
```

- [ ] **Step 2: 실패하는 테스트 작성 — 뉴스 카테고리**

`web/src/lib/domain/news-categories.test.ts` 생성:

```ts
import { describe, it, expect } from "vitest";
import { NEWS_CATEGORIES } from "./news-categories";

describe("NEWS_CATEGORIES", () => {
  it("5개, key 유일성, label·query 존재", () => {
    expect(NEWS_CATEGORIES).toHaveLength(5);
    const keys = NEWS_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of NEWS_CATEGORIES) {
      expect(c.label).toBeTruthy();
      expect(c.query).toBeTruthy();
    }
  });
});
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

Run: `npm test -- news-categories.test.ts`
Expected: FAIL(`./news-categories` 모듈 없음)

- [ ] **Step 4: `news-categories.ts` 구현**

`web/src/lib/domain/news-categories.ts` 생성(구 index.html L1138-1144 그대로):

```ts
// 요즘 뉴스 카테고리 칩 — key(내부), label(표시), query(Gemini 검색 키워드)
export interface NewsCategory {
  key: string;
  label: string;
  query: string;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  { key: "market", label: "경제·시장", query: "한국 경제 시장 증시 물가 최신 뉴스" },
  { key: "tech", label: "IT·기술", query: "한국 IT 기술 인공지능 반도체 최신 뉴스" },
  { key: "sports", label: "스포츠", query: "한국 스포츠 최신 뉴스" },
  { key: "culture", label: "문화·연예", query: "한국 문화 연예 영화 음악 최신 뉴스" },
  { key: "society", label: "사회·생활", query: "한국 사회 생활 정책 최신 뉴스" },
];
```

- [ ] **Step 5: 테스트 재실행 — 통과 확인**

Run: `npm test -- news-categories.test.ts`
Expected: PASS

- [ ] **Step 6: 도메인 타입 추가**

`web/src/lib/domain/types.ts` 파일 맨 끝(96번째 줄, `AppStateBlob` 인터페이스 뒤)에 추가:

```ts

/** 요즘 뉴스 지문 — Gemini search grounding으로 생성 */
export interface NewsPassage {
  id: string;
  work: string;
  scene: string;
  text: string;
  keyPoints: string[];
  sourceHint: string;
  sourceUrl: string;
  sourceTitle: string;
}

/** 한 줄 요약 채점 결과 */
export interface SummaryResult {
  captured: string[];
  missed: string[];
  verdict: 'pass' | 'partial' | 'miss';
  coach: string;
}

/** 카톡 캡쳐에서 추출한 상황 정보 */
export interface CaptureExtract {
  title: string;
  who: string;
  rel: string;
  goal: string;
  tension: string;
}
```

- [ ] **Step 7: 타입체크·린트·전체 테스트**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 전부 통과

- [ ] **Step 8: 커밋**

```bash
git add src/lib/scoring/context-system.ts src/lib/domain/news-categories.ts src/lib/domain/news-categories.test.ts src/lib/domain/types.ts
git commit -m "feat: 뉴스·캡쳐 프롬프트·카테고리·도메인 타입 추가"
```

---

## Task 4: API 라우트 — `/api/context/news`

**Files:**
- Create: `web/src/app/api/context/news/route.ts`

**Interfaces:**
- Consumes: `callGemini`, `extractText`, `extractSource`, `parseLooseJson`, `GEMINI_MODEL`(Task 2), `NEWS_FETCH_SYSTEM`(Task 3), `NEWS_CATEGORIES`(Task 3), `NewsPassage`(Task 3), `sameOrigin`/`rateLimit`/`clientIp`(기존 `lib/server/guard.ts`)
- Produces: `POST /api/context/news` — 요청 `{category: string}` → 응답 `{passage: NewsPassage}` 또는 `{error: string}`

- [ ] **Step 1: 라우트 구현**

`web/src/app/api/context/news/route.ts` 생성:

```ts
import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, extractSource, parseLooseJson, GEMINI_MODEL } from "@/lib/scoring/gemini";
import { NEWS_FETCH_SYSTEM } from "@/lib/scoring/context-system";
import { NEWS_CATEGORIES } from "@/lib/domain/news-categories";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";
import type { NewsPassage } from "@/lib/domain/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`context-news:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: { category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const cat = NEWS_CATEGORIES.find((c) => c.key === body.category);
  if (!cat) return NextResponse.json({ error: "알 수 없는 카테고리입니다." }, { status: 400 });

  try {
    const data = await callGemini(GEMINI_MODEL, {
      system_instruction: { parts: [{ text: NEWS_FETCH_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: `${cat.query}. 위에서 최신 뉴스 하나를 골라 JSON으로만 반환하세요.` }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    });
    const out = parseLooseJson(extractText(data));
    const keyPoints = Array.isArray(out.keyPoints) ? out.keyPoints.map((x: unknown) => String(x)).filter(Boolean) : [];
    if (!out.scene || !out.text || keyPoints.length === 0) {
      return NextResponse.json(
        { error: "마땅한 최신 뉴스를 찾지 못했어요. 다른 카테고리를 눌러보세요." },
        { status: 502 },
      );
    }
    const src = extractSource(data);
    const passage: NewsPassage = {
      id: "news_" + Date.now(),
      work: String(out.work || cat.label),
      scene: String(out.scene),
      text: String(out.text),
      keyPoints: keyPoints.slice(0, 4),
      sourceHint: String(out.sourceHint || ""),
      sourceUrl: src?.uri || "",
      sourceTitle: src?.title || "",
    };
    return NextResponse.json({ passage });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NO_KEY") {
      return NextResponse.json({ error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다." }, { status: 503 });
    }
    console.error("[api/context/news]", e);
    return NextResponse.json({ error: msg || "뉴스를 불러오지 못했어요." }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입체크·린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: `GEMINI_API_KEY` 없는 상태에서 503 스모크 테스트**

Run: `npm run build && (npm run start &) && sleep 3 && curl -s -X POST http://localhost:3000/api/context/news -H "Content-Type: application/json" -d '{"category":"tech"}'`
Expected: `{"error":"GEMINI_API_KEY가 서버에 설정되지 않았습니다."}` (HTTP 503) — 개발 환경에 `GEMINI_API_KEY`가 없다는 전제. 확인 후 `kill %1` 등으로 서버 종료.

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/context/news/route.ts
git commit -m "feat: /api/context/news — Gemini search grounding 뉴스 지문 라우트"
```

---

## Task 5: API 라우트 — `/api/context/summary`

**Files:**
- Create: `web/src/app/api/context/summary/route.ts`

**Interfaces:**
- Consumes: `callGemini`, `extractText`, `parseLooseJson`, `GEMINI_MODEL`(Task 2), `NEWS_SUMMARY_SYSTEM`(Task 3), `sameOrigin`/`rateLimit`/`clientIp`
- Produces: `POST /api/context/summary` — 요청 `{passage: {text: string; keyPoints: string[]}, draft: string}` → 응답 `SummaryResult` 또는 `{error: string}`

- [ ] **Step 1: 라우트 구현**

`web/src/app/api/context/summary/route.ts` 생성:

```ts
import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, parseLooseJson, GEMINI_MODEL } from "@/lib/scoring/gemini";
import { NEWS_SUMMARY_SYSTEM } from "@/lib/scoring/context-system";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`context-summary:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: { passage?: { text?: string; keyPoints?: string[] }; draft?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const draft = (body.draft || "").trim();
  const passage = body.passage;
  if (!passage?.text || !Array.isArray(passage.keyPoints)) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (draft.length < 5) {
    return NextResponse.json({ error: "요약을 조금 더 써주세요 — 이 지문의 핵심을 한 문장으로." }, { status: 400 });
  }

  const userMsg =
    `[지문]\n${passage.text}\n\n[이 지문의 핵심 포인트 — 요약이 담아야 할 핵심 요지]\n` +
    passage.keyPoints.map((k) => "- " + k).join("\n") +
    `\n\n[사용자의 한 줄 요약]\n${draft}\n\n위 요약이 핵심 포인트를 담았는지 채점해 JSON으로만 출력하세요.`;

  try {
    const data = await callGemini(GEMINI_MODEL, {
      system_instruction: { parts: [{ text: NEWS_SUMMARY_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: userMsg }] }],
      generationConfig: { maxOutputTokens: 2048, responseMimeType: "application/json" },
    });
    const out = parseLooseJson(extractText(data));
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);
    const captured = arr(out.captured);
    const missed = arr(out.missed);
    const verdict = ["pass", "partial", "miss"].includes(out.verdict)
      ? out.verdict
      : missed.length === 0
        ? "pass"
        : captured.length === 0
          ? "miss"
          : "partial";
    return NextResponse.json({ captured, missed, verdict, coach: String(out.coach || "") });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NO_KEY") {
      return NextResponse.json({ error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다." }, { status: 503 });
    }
    console.error("[api/context/summary]", e);
    return NextResponse.json({ error: msg || "채점에 실패했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입체크·린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 짧은 draft 400 검증 + `GEMINI_API_KEY` 없을 때 503 스모크**

Run: `npm run build && (npm run start &) && sleep 3 && curl -s -X POST http://localhost:3000/api/context/summary -H "Content-Type: application/json" -d '{"passage":{"text":"t","keyPoints":["k"]},"draft":"짧"}'`
Expected: `{"error":"요약을 조금 더 써주세요 — 이 지문의 핵심을 한 문장으로."}` (HTTP 400)

Run: `curl -s -X POST http://localhost:3000/api/context/summary -H "Content-Type: application/json" -d '{"passage":{"text":"t","keyPoints":["k"]},"draft":"충분히 긴 요약 문장입니다"}'`
Expected: `{"error":"GEMINI_API_KEY가 서버에 설정되지 않았습니다."}` (HTTP 503). 확인 후 서버 종료.

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/context/summary/route.ts
git commit -m "feat: /api/context/summary — 뉴스 한 줄 요약 채점 라우트"
```

---

## Task 6: API 라우트 — `/api/capture`

**Files:**
- Create: `web/src/app/api/capture/route.ts`

**Interfaces:**
- Consumes: `callGemini`, `extractText`, `parseLooseJson`, `GEMINI_MODEL`(Task 2), `CAPTURE_SYSTEM`(Task 3), `sameOrigin`/`rateLimit`/`clientIp`
- Produces: `POST /api/capture` — 요청 `{imageBase64: string, mimeType: string}` → 응답 `CaptureExtract` 또는 `{error: string}`

- [ ] **Step 1: 라우트 구현**

`web/src/app/api/capture/route.ts` 생성:

```ts
import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, parseLooseJson, GEMINI_MODEL } from "@/lib/scoring/gemini";
import { CAPTURE_SYSTEM } from "@/lib/scoring/context-system";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`capture:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { imageBase64, mimeType } = body;
  if (!imageBase64 || !mimeType || !/^image\//.test(mimeType)) {
    return NextResponse.json({ error: "이미지 파일을 올려주세요." }, { status: 400 });
  }
  if (imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 413 });
  }

  try {
    const data = await callGemini(GEMINI_MODEL, {
      system_instruction: { parts: [{ text: CAPTURE_SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: "위 대화 캡쳐를 읽고 훈련 상황 정보를 JSON으로 추출하세요. 실명·전화번호 등 개인정보는 반드시 익명화하세요." },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 1024, responseMimeType: "application/json" },
    });
    const out = parseLooseJson(extractText(data));
    const clip = (v: unknown, n: number) => String(v || "").slice(0, n);
    const title = clip(out.title, 60).trim();
    if (!title) {
      return NextResponse.json(
        { error: "대화를 인식하지 못했어요. 다른 캡쳐를 올리거나 직접 입력해주세요." },
        { status: 422 },
      );
    }
    return NextResponse.json({
      title,
      who: clip(out.who, 120),
      rel: clip(out.rel, 30),
      goal: clip(out.goal, 120),
      tension: clip(out.tension, 120),
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NO_KEY") {
      return NextResponse.json({ error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다." }, { status: 503 });
    }
    console.error("[api/capture]", e);
    return NextResponse.json({ error: msg || "캡쳐에서 상황을 읽지 못했어요." }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입체크·린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: mimeType 검증 + `GEMINI_API_KEY` 없을 때 503 스모크**

Run: `npm run build && (npm run start &) && sleep 3 && curl -s -X POST http://localhost:3000/api/capture -H "Content-Type: application/json" -d '{"imageBase64":"AAAA","mimeType":"text/plain"}'`
Expected: `{"error":"이미지 파일을 올려주세요."}` (HTTP 400)

Run: `curl -s -X POST http://localhost:3000/api/capture -H "Content-Type: application/json" -d '{"imageBase64":"AAAA","mimeType":"image/jpeg"}'`
Expected: `{"error":"GEMINI_API_KEY가 서버에 설정되지 않았습니다."}` (HTTP 503). 확인 후 서버 종료.

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/capture/route.ts
git commit -m "feat: /api/capture — 카톡 캡쳐 Gemini vision 상황추출 라우트"
```

---

## Task 7: 클라이언트 API 래퍼

**Files:**
- Modify: `web/src/lib/client/api.ts`

**Interfaces:**
- Consumes: `NewsPassage`, `SummaryResult`, `CaptureExtract`(Task 3), 신규 라우트 3개(Task 4-6)
- Produces:
  - `fetchNewsPassage(category: string): Promise<NewsPassage>`
  - `gradeSummary(passage: {text: string; keyPoints: string[]}, draft: string): Promise<SummaryResult>`
  - `extractCapture(imageBase64: string, mimeType: string): Promise<CaptureExtract>`

- [ ] **Step 1: import에 신규 타입 추가**

`web/src/lib/client/api.ts:2`를

```ts
import type { AppStateBlob, Attempt, Situation, ThreadItem, Profile } from "@/lib/domain/types";
```

에서

```ts
import type { AppStateBlob, Attempt, Situation, ThreadItem, Profile, NewsPassage, SummaryResult, CaptureExtract } from "@/lib/domain/types";
```

로 교체.

- [ ] **Step 2: 파일 끝에 래퍼 3개 추가**

`web/src/lib/client/api.ts` 맨 끝(94번째 줄, `generateSituation` 함수 뒤)에 추가:

```ts

export async function fetchNewsPassage(category: string): Promise<NewsPassage> {
  const r = await fetch("/api/context/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "뉴스를 불러오지 못했어요.");
  return j.passage as NewsPassage;
}

export async function gradeSummary(
  passage: { text: string; keyPoints: string[] },
  draft: string,
): Promise<SummaryResult> {
  const r = await fetch("/api/context/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passage, draft }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "채점에 실패했습니다.");
  return j as SummaryResult;
}

export async function extractCapture(imageBase64: string, mimeType: string): Promise<CaptureExtract> {
  const r = await fetch("/api/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "캡쳐에서 상황을 읽지 못했어요.");
  return j as CaptureExtract;
}
```

- [ ] **Step 3: 타입체크·린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음(사용처가 아직 없어 미사용 export 경고는 없음 — named export는 lint 대상 아님)

- [ ] **Step 4: 커밋**

```bash
git add src/lib/client/api.ts
git commit -m "feat: 뉴스·요약채점·캡쳐 클라이언트 API 래퍼 추가"
```

---

## Task 8: `ContextReading` 화면

**Files:**
- Create: `web/src/components/screens/ContextReading.tsx`

**Interfaces:**
- Consumes: `gradeSummary`(Task 7), `NewsPassage`/`SummaryResult`(Task 3)
- Produces: `ContextReading({passage: NewsPassage, onExit: () => void})` React 컴포넌트 — Task 10(AppShell)에서 렌더링.

- [ ] **Step 1: 컴포넌트 구현**

`web/src/components/screens/ContextReading.tsx` 생성:

```tsx
"use client";
import { useState } from "react";
import { gradeSummary } from "@/lib/client/api";
import type { NewsPassage, SummaryResult } from "@/lib/domain/types";

type Phase = "read" | "grading" | "result";

export default function ContextReading({ passage, onExit }: { passage: NewsPassage; onExit: () => void }) {
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("read");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(null);

  async function submit() {
    const text = draft.trim();
    if (text.length < 5) {
      setError("요약을 조금 더 써주세요 — 이 지문의 핵심을 한 문장으로.");
      return;
    }
    setError(null);
    setPhase("grading");
    try {
      const r = await gradeSummary({ text: passage.text, keyPoints: passage.keyPoints }, text);
      setResult(r);
      setPhase("result");
    } catch (e) {
      setError((e as Error).message);
      setPhase("read");
    }
  }

  const verdictColor =
    result?.verdict === "pass" ? "good" : result?.verdict === "partial" ? "warn" : "bad";

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onExit}
          className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold"
          style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)" }}
        >
          ← 뒤로
        </button>
        <h1 className="flex-1 text-xl font-extrabold">맥락 읽기 — {passage.work}</h1>
      </div>

      <div className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div className="mb-2 text-[15px] font-bold">{passage.scene}</div>
        <p className="text-[13.5px]" style={{ color: "var(--ink)", lineHeight: 1.7 }}>
          {passage.text}
        </p>
        {passage.sourceUrl ? (
          <a
            href={passage.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-[12px]"
            style={{ color: "var(--accent)" }}
          >
            출처: {passage.sourceTitle || passage.sourceUrl}
          </a>
        ) : (
          passage.sourceHint && (
            <div className="mt-3 text-[12px]" style={{ color: "var(--sub)" }}>
              {passage.sourceHint}
            </div>
          )
        )}
      </div>

      {phase !== "result" && (
        <div className="mt-4">
          <label className="mb-1 block text-[13px] font-bold">이 뉴스를 한 줄로 요약하면?</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
          />
          {error && (
            <div
              className="mt-2 rounded-lg px-3 py-2 text-[12.5px]"
              style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
            >
              {error}
            </div>
          )}
          <button
            onClick={submit}
            disabled={phase === "grading"}
            className="mt-3 w-full rounded-xl py-3 text-[14.5px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", opacity: phase === "grading" ? 0.6 : 1 }}
          >
            {phase === "grading" ? "채점 중…" : "맥락 확인하기"}
          </button>
        </div>
      )}

      {phase === "result" && result && (
        <div className="mt-4 rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <div
            className="mb-3 inline-block rounded-full px-3 py-1 text-[12px] font-extrabold"
            style={{ color: `var(--${verdictColor})`, background: `var(--${verdictColor}-soft)` }}
          >
            {result.verdict === "pass" ? "핵심을 잘 짚었어요" : result.verdict === "partial" ? "일부만 짚었어요" : "핵심을 놓쳤어요"}
          </div>
          {result.captured.length > 0 && (
            <div className="mb-2 text-[13px]" style={{ color: "var(--ink)" }}>
              <strong>짚은 점:</strong> {result.captured.join(" · ")}
            </div>
          )}
          {result.missed.length > 0 && (
            <div className="mb-2 text-[13px]" style={{ color: "var(--sub)" }}>
              <strong>놓친 점:</strong> {result.missed.join(" · ")}
            </div>
          )}
          <p className="mt-2 text-[13.5px]" style={{ color: "var(--ink)", lineHeight: 1.6 }}>
            {result.coach}
          </p>
          <button
            onClick={onExit}
            className="mt-4 w-full rounded-xl py-3 text-[14.5px] font-bold"
            style={{ background: "var(--good)", color: "#fff" }}
          >
            다른 뉴스 보기
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음(아직 어디서도 import하지 않으므로 미사용 컴포넌트 — Task 10에서 연결)

- [ ] **Step 3: 커밋**

```bash
git add src/components/screens/ContextReading.tsx
git commit -m "feat: ContextReading 화면 — 뉴스 읽기·한줄요약·채점결과"
```

---

## Task 9: `Picker.tsx` — '실전 사례' 탭을 '요즘 뉴스'로 교체

**Files:**
- Modify: `web/src/components/screens/Picker.tsx` (전체 교체)

**Interfaces:**
- Consumes: `fetchNewsPassage`(Task 7), `NEWS_CATEGORIES`(Task 3), `NewsPassage`(Task 3)
- Produces: `Picker({onPick, onNewSit, onNewsPassage}: {onPick: (s: Situation) => void; onNewSit: () => void; onNewsPassage: (p: NewsPassage) => void})` — `onNewsPassage`는 신규 prop, Task 10(AppShell)이 넘겨준다.

- [ ] **Step 1: `Picker.tsx` 전체 교체**

`web/src/components/screens/Picker.tsx` 전체를 아래로 교체(Task 1에서 `ctx` 카드가 이미 제거됐으므로 `contextSits`/`s.ctx` 로직을 걷어내고 뉴스 섹션으로 대체):

```tsx
"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import { SITUATIONS, REL_HINTS, personaOf } from "@/lib/domain/situations";
import { NEWS_CATEGORIES } from "@/lib/domain/news-categories";
import { fetchNewsPassage } from "@/lib/client/api";
import type { Situation, NewsPassage } from "@/lib/domain/types";

export default function Picker({
  onPick,
  onNewSit,
  onNewsPassage,
}: {
  onPick: (s: Situation) => void;
  onNewSit: () => void;
  onNewsPassage: (p: NewsPassage) => void;
}) {
  const app = useApp();
  const [mode, setMode] = useState<"scenario" | "news">("scenario");
  const [q, setQ] = useState("");
  const [newsBusy, setNewsBusy] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const role = app.profile?.role;

  const query = q.trim().toLowerCase();
  const match = (s: Situation) =>
    !query || `${s.title} ${s.rel} ${s.tension} ${s.counterpart} ${s.goal}`.toLowerCase().includes(query);

  const all = useMemo(() => [...SITUATIONS, ...app.customSits], [app.customSits]);
  const customIds = useMemo(() => new Set(app.customSits.map((s) => s.id)), [app.customSits]);
  const scenarioSits = all.filter(
    (s) => (!role || !s.roles || s.roles.includes(role) || customIds.has(s.id)) && match(s),
  );

  const relGroups = useMemo(() => {
    const order = [...new Set(scenarioSits.map((s) => s.rel))];
    return order.map((rel) => ({ rel, hint: REL_HINTS[rel] || "", items: scenarioSits.filter((s) => s.rel === rel) }));
  }, [scenarioSits]);

  async function pickNews(cat: (typeof NEWS_CATEGORIES)[number]) {
    if (newsBusy) return;
    setNewsBusy(true);
    setNewsError(null);
    try {
      const passage = await fetchNewsPassage(cat.key);
      onNewsPassage(passage);
    } catch (e) {
      setNewsError((e as Error).message);
    } finally {
      setNewsBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold">훈련 상황</h1>
        <button
          onClick={onNewSit}
          className="shrink-0 rounded-lg px-3 py-2 text-[12.5px] font-bold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          ＋ 내 상황
        </button>
      </div>
      <p className="mb-3.5 text-[13.5px]" style={{ color: "var(--sub)" }}>
        &apos;적절&apos;의 방향은 관계마다 달라집니다 — 교수에게는 완충이, 조원에게는 가벼움이 3점입니다.
      </p>

      <div className="mb-3 flex gap-1.5 rounded-xl border p-1.5" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <Tab on={mode === "scenario"} onClick={() => setMode("scenario")}>
          시나리오 훈련 · {scenarioSits.length}
        </Tab>
        <Tab on={mode === "news"} onClick={() => setMode("news")}>
          요즘 뉴스
        </Tab>
      </div>

      {mode === "scenario" && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="상황 검색 — 제목·관계·긴장 포인트"
          className="mb-5 w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
        />
      )}

      {mode === "scenario" && scenarioSits.length === 0 && (
        <div
          className="rounded-2xl border border-dashed p-9 text-center text-[13.5px]"
          style={{ borderColor: "var(--line)", color: "var(--sub)" }}
        >
          {query ? `'${q}'에 맞는 상황이 없어요. 검색어를 지우거나 다른 탭을 확인해보세요.` : "표시할 상황이 없어요."}
        </div>
      )}

      {mode === "news" && (
        <div
          className="rounded-2xl border p-5"
          style={{ background: "linear-gradient(135deg,var(--accent-soft),var(--surface))", borderColor: "var(--accent)" }}
        >
          <div className="mb-3.5 text-[12.5px]" style={{ color: "var(--sub)" }}>
            요즘 뉴스 한 편을 읽고 핵심을 한 줄로 요약해보세요 — 사건 나열이 아니라 무엇이 왜 중요한지를 짚는 연습입니다.
          </div>
          <div className="flex flex-wrap gap-2">
            {NEWS_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => pickNews(c)}
                disabled={newsBusy}
                className="rounded-full border px-4 py-2 text-[13px] font-bold"
                style={{ background: "var(--surface)", borderColor: "var(--accent)", color: "var(--accent)", opacity: newsBusy ? 0.6 : 1 }}
              >
                {c.label}
              </button>
            ))}
          </div>
          {newsBusy && (
            <div className="mt-3 text-[12.5px]" style={{ color: "var(--sub)" }}>
              최신 뉴스를 가져오는 중…
            </div>
          )}
          {newsError && (
            <div className="mt-3 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>
              {newsError}
            </div>
          )}
        </div>
      )}

      {mode === "scenario" &&
        relGroups.map((g) => (
          <div key={g.rel} className="mb-6">
            <div className="mb-2.5 flex items-baseline gap-2.5">
              <span
                className="rounded-full px-3 py-1 text-[12px] font-extrabold"
                style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
              >
                {g.rel}
              </span>
              <span className="text-[12px]" style={{ color: "var(--sub)" }}>
                {g.hint}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {g.items.map((s) => (
                <SitCard
                  key={s.id}
                  s={s}
                  chip={customIds.has(s.id) ? "내 상황" : `핵심 ${s.axis}`}
                  onClick={() => onPick(s)}
                  onDelete={customIds.has(s.id) ? () => app.removeCustomSit(s.id) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg py-2.5 text-center text-[13.5px] font-bold transition"
      style={{ background: on ? "var(--accent)" : "transparent", color: on ? "var(--accent-ink)" : "var(--sub)" }}
    >
      {children}
    </button>
  );
}

function SitCard({
  s,
  chip,
  onClick,
  onDelete,
}: {
  s: Situation;
  chip: string;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const p = personaOf(s);
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="flex w-full flex-col gap-1.5 rounded-xl border p-4 text-left transition"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <span className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <span className="flex items-center gap-1.5 text-[14.5px] font-bold" style={{ minWidth: 0 }}>
            <span>{p.emoji}</span>
            {s.title}
          </span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
            style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
          >
            {chip}
          </span>
        </span>
        <span className="text-[12.5px]" style={{ color: "var(--sub)", lineHeight: 1.55 }}>
          {s.tension}
        </span>
      </button>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("이 상황을 삭제할까요?")) onDelete();
          }}
          aria-label="삭제"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-[14px] transition"
          style={{ color: "var(--sub)" }}
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: `AppShell.tsx`에서 `<Picker onPick=... onNewSit=... />`에 `onNewsPassage`를 안 넘겨서 에러가 날 수 있음 — 이 에러는 Task 10에서 해소된다. 지금 단계에서 `Picker.tsx` 자체의 타입 에러(정의부)가 없는지만 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/components/screens/Picker.tsx
git commit -m "feat: Picker '실전 사례' 탭을 '요즘 뉴스' 카테고리 칩으로 교체"
```

---

## Task 10: `AppShell.tsx` 배선 — `context` 화면 추가

**Files:**
- Modify: `web/src/components/AppShell.tsx`

**Interfaces:**
- Consumes: `ContextReading`(Task 8), `Picker`의 `onNewsPassage` prop(Task 9), `NewsPassage`(Task 3)
- Produces: `Screen` 유니온에 `"context"` 추가 — 이 시점부터 앱이 다시 타입체크 통과.

- [ ] **Step 1: import 추가**

`web/src/components/AppShell.tsx:4`(타입 import) 아래, `Settings` import(11번째 줄) 뒤에 추가:

```ts
import ContextReading from "./screens/ContextReading";
```

`web/src/components/AppShell.tsx:4`를

```ts
import type { Situation } from "@/lib/domain/types";
```

에서

```ts
import type { Situation, NewsPassage } from "@/lib/domain/types";
```

로 교체.

- [ ] **Step 2: `Screen` 유니온에 `"context"` 추가**

`web/src/components/AppShell.tsx:13`을

```ts
export type Screen = "home" | "picker" | "train" | "trajectory" | "newsit" | "settings";
```

에서

```ts
export type Screen = "home" | "picker" | "train" | "trajectory" | "newsit" | "context" | "settings";
```

로 교체.

- [ ] **Step 3: `activePassage` 상태 추가**

`web/src/components/AppShell.tsx:25`(`const [activeSit, ...]` 다음 줄)에 추가:

```ts
  const [activePassage, setActivePassage] = useState<NewsPassage | null>(null);
```

- [ ] **Step 4: nav 활성 상태에 `context` 포함**

`web/src/components/AppShell.tsx:51-52`를

```ts
  const navActive = (key: Screen) =>
    screen === key || (key === "picker" && (screen === "train" || screen === "newsit"));
```

에서

```ts
  const navActive = (key: Screen) =>
    screen === key || (key === "picker" && (screen === "train" || screen === "newsit" || screen === "context"));
```

로 교체.

- [ ] **Step 5: `Picker` 렌더링에 `onNewsPassage` 연결 + `context` 화면 렌더링 추가**

`web/src/components/AppShell.tsx:93`를

```tsx
          {screen === "picker" && <Picker onPick={startSit} onNewSit={() => setScreen("newsit")} />}
```

에서

```tsx
          {screen === "picker" && (
            <Picker
              onPick={startSit}
              onNewSit={() => setScreen("newsit")}
              onNewsPassage={(p) => {
                setActivePassage(p);
                setScreen("context");
              }}
            />
          )}
```

로 교체. 그리고 97번째 줄(`{screen === "newsit" && ...}`) 바로 뒤에 추가:

```tsx
          {screen === "context" && activePassage && (
            <ContextReading passage={activePassage} onExit={() => setScreen("picker")} />
          )}
```

- [ ] **Step 6: 타입체크·린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음(Task 9에서 남겨둔 `onNewsPassage` 미전달 에러가 여기서 해소됨)

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 8: 커밋**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: AppShell에 context 화면 배선(요즘 뉴스 → 읽기·요약 흐름)"
```

---

## Task 11: `NewSituation.tsx` — 카톡 캡쳐로 채우기

**Files:**
- Modify: `web/src/components/screens/NewSituation.tsx`

**Interfaces:**
- Consumes: `extractCapture`(Task 7)
- Produces: 없음(리프 UI 태스크, 이후 태스크가 의존하지 않음)

- [ ] **Step 1: import 및 state 추가**

`web/src/components/screens/NewSituation.tsx:1-21`을

```tsx
"use client";
import { useState } from "react";
import { useApp } from "@/lib/client/store";
import { generateSituation } from "@/lib/client/api";
import type { Situation } from "@/lib/domain/types";

export default function NewSituation({
  onStart,
  onCancel,
}: {
  onStart: (s: Situation) => void;
  onCancel: () => void;
}) {
  const app = useApp();
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("");
  const [goal, setGoal] = useState("");
  const [tension, setTension] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Situation | null>(null);
```

에서

```tsx
"use client";
import { useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { generateSituation, extractCapture } from "@/lib/client/api";
import type { Situation } from "@/lib/domain/types";

/** 캡쳐 이미지를 브라우저에서 축소·재인코딩해 전송량을 줄인다. */
function compressImage(img: HTMLImageElement, maxDim = 1280, quality = 0.8): string {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDim || h > maxDim) {
    const r = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function NewSituation({
  onStart,
  onCancel,
}: {
  onStart: (s: Situation) => void;
  onCancel: () => void;
}) {
  const app = useApp();
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("");
  const [goal, setGoal] = useState("");
  const [tension, setTension] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Situation | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 2: 캡쳐 핸들러 추가**

`web/src/components/screens/NewSituation.tsx`의 `design()` 함수(23-38번째 줄) 뒤에 추가:

```tsx
  function onCaptureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setCaptureError("이미지 파일을 올려주세요.");
      return;
    }
    setCaptureBusy(true);
    setCaptureError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const dataUrl = compressImage(img);
        const m = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
        if (!m) {
          setCaptureBusy(false);
          setCaptureError("이미지 형식을 인식하지 못했어요.");
          return;
        }
        try {
          const out = await extractCapture(m[2], m[1]);
          setTitle(out.title);
          setWho(out.rel ? `${out.who} (${out.rel})` : out.who);
          setGoal(out.goal);
          setTension(out.tension);
        } catch (err) {
          setCaptureError((err as Error).message);
        } finally {
          setCaptureBusy(false);
        }
      };
      img.onerror = () => {
        setCaptureBusy(false);
        setCaptureError("이미지를 읽지 못했어요.");
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => {
      setCaptureBusy(false);
      setCaptureError("파일을 읽지 못했어요.");
    };
    reader.readAsDataURL(file);
  }
```

- [ ] **Step 3: 폼 상단에 캡쳐 업로드 버튼 추가**

`web/src/components/screens/NewSituation.tsx`의(원본 기준 54-57번째 줄 부근) 아래 블록

```tsx
      <p className="mb-4 text-[13px]" style={{ color: "var(--sub)" }}>
        연습하고 싶은 상황을 적으면 AI가 관계·긴장·채점 기준을 설계해줍니다.
      </p>

      {!preview && (
```

을

```tsx
      <p className="mb-4 text-[13px]" style={{ color: "var(--sub)" }}>
        연습하고 싶은 상황을 적으면 AI가 관계·긴장·채점 기준을 설계해줍니다.
      </p>

      {!preview && (
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onCaptureFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={captureBusy}
            className="w-full rounded-xl border border-dashed px-3.5 py-2.5 text-[13px] font-semibold"
            style={{ borderColor: "var(--line)", color: "var(--sub)", opacity: captureBusy ? 0.6 : 1 }}
          >
            {captureBusy ? "캡쳐에서 상황을 읽는 중…" : "📷 카톡 캡쳐로 채우기"}
          </button>
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--sub)" }}>
            이미지는 저장되지 않지만, 인식을 위해 Gemini에 1회 전송됩니다. 상대 동의 없는 사적 대화는 주의하세요.
          </p>
          {captureError && (
            <div className="mt-2 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>
              {captureError}
            </div>
          )}
        </div>
      )}

      {!preview && (
```

- [ ] **Step 4: 타입체크·린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 빌드**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 6: 전체 테스트 스위트 재확인**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 통과 — 여기까지가 이번 포팅의 완료 기준.

- [ ] **Step 7: `GEMINI_API_KEY` 환경변수 안내 추가**

`web/.env.local.example`에 아래 줄 추가(파일이 권한상 열리지 않으면 이 스텝은 건너뛰고 사용자에게 직접 추가하도록 안내):

```
GEMINI_API_KEY=
```

- [ ] **Step 8: 커밋**

```bash
git add src/components/screens/NewSituation.tsx .env.local.example
git commit -m "feat: 카톡 캡쳐로 상황 폼 자동채움 + GEMINI_API_KEY 안내"
```

---

## 완료 후 확인 (사용자 몫)

- 실제 `GEMINI_API_KEY`(무료 티어)를 `web/.env.local`에 넣고 `npm run dev`로 뉴스 grounding·출처링크·캡쳐 인식 정확도를 수동 확인. 이건 구 프로토타입 때도 "미검증"으로 남아있던 항목이라 이번에도 자동화하지 않는다.
- 이 계획이 끝나면(`b83fcb0` 삭제 커밋이 더 이상 기능을 유실시키지 않는 상태가 되면) `git push`로 그동안 보류했던 로컬 커밋들을 올린다.
