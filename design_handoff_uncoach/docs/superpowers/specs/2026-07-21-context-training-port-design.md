# 뉴스 맥락훈련 + 카톡 캡쳐 상황생성 — web/ 포팅 설계

## 배경

2026-07-20 커밋 `b83fcb0`("정리: 루트 커스텀 DSL 프로토타입 전체 제거, web/(Next.js)로 일원화")가 루트 프로토타입(`index.html` 등)을 전부 삭제했다. 그런데 그 안에는 같은 날 만들어져 라이브까지 배포됐던 기능 두 개가 web/(Next.js 재구현체)로 이식되지 않은 채로 들어있었다:

1. **맥락 읽기 — 요즘 뉴스**: Gemini Google Search grounding으로 실시간 뉴스 지문을 가져와 한 줄 요약을 훈련·채점하는 기능 (커밋 `aa9e25b`, `3d618ee`)
2. **카톡 캡쳐로 상황 만들기**: 메신저 대화 캡쳐 이미지를 Gemini vision으로 읽어 커스텀 상황 폼을 자동 채우는 기능 (커밋 `abe561a`)

`b83fcb0`은 아직 push되지 않았다(로컬 커밋만 존재). 이 스펙은 두 기능을 web/ 아키텍처로 포팅하기 위한 것이다. 포팅이 끝난 뒤에 `b83fcb0`을 push한다(그래야 삭제와 동시에 대체 구현이 갖춰진다).

기존 프로토타입 코드는 `git show b83fcb0~1:index.html`로 확인 가능(라인 963-2436 부근에 관련 상수·함수 존재).

## 결정된 제약

- 뉴스 검색(grounding)·요약 채점·캡쳐 이미지 분석은 **전부 Gemini**로 유지한다. 이유: 사용자가 무료 API 사용을 명시적으로 우선시함("모든 api는 무료로 이용하고 싶어. 클로드 사용하고 싶지만 호출비용이 든다면 제미나이로 일관되게 진행해"). 기존 채점(`score.ts`)·상황설계(`generate.ts`)는 이미 Claude를 쓰고 있고 비용이 수용된 상태이므로 그대로 둔다 — 이 두 기능을 위해 Claude를 추가로 쓰지 않는다.
- '맥락 읽기'는 **뉴스만** 포팅한다. 소설 지문 7편(`PASSAGES`, kind:'novel')은 포팅하지 않는다 — 삭제 직전 라이브 상태가 이미 "뉴스 전용"이었다(소설 탭은 UI에서 제거되고 데이터만 dormant로 파일에 남아있었음). 필요해지면 나중에 별도로 추가한다.
- 구 프로토타입의 "방문자가 자기 Gemini 키를 입력" 폴백(정적 호스팅용 B모드)은 포팅하지 않는다 — web/은 항상 서버 API 라우트(Node runtime)가 있으므로 불필요.

## 아키텍처

### `lib/scoring/gemini.ts` (신규)

구 `callGeminiWithBody`(index.html L1659-1693)를 서버 전용으로 이식한 공통 호출 함수.

```ts
export async function callGemini(
  model: string,
  body: object,           // system_instruction/contents/generationConfig/tools 등 Gemini API body 그대로
): Promise<GeminiRawResponse>  // 원본 응답(JSON) 반환 — grounding 메타데이터를 쓰는 news 라우트를 위해 텍스트만 뽑지 않는다
```

- 엔드포인트: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, 키는 `x-goog-api-key` 헤더(쿼리 아님).
- `GEMINI_API_KEY` 없으면 `NO_KEY` 에러 throw.
- 429/5xx 자동 재시도: 최대 3회, `RetryInfo.retryDelay` 파싱(구 `retryAfterSec`), 대기가 45초 넘으면 재시도 없이 에러로 넘김.
- 응답 파싱 실패·빈 응답(`finishReason` MAX_TOKENS/SAFETY 등) 처리는 구 로직(`friendlyError`, L1276-1291) 그대로 이식하되 에러 메시지는 그대로 한국어 유지.
- `parseLooseJson`(L1173-1186: 트레일링 콤마·스마트따옴표 관용 파서)도 이 파일에 이식.

### API 라우트 3개

기존 `situation/route.ts` 패턴을 그대로 따른다: `runtime = "nodejs"`, `sameOrigin` + `rateLimit(key, 10, 60_000)` 가드, 에러는 `NO_KEY`→503 / 그 외→500.

**`POST /api/context/news`** — `{ category: string }` (NEWS_CATEGORIES의 key)
→ Gemini에 `tools:[{google_search:{}}]` 포함 요청(NEWS_FETCH_SYSTEM 프롬프트, temperature 0.4) → `groundingMetadata.groundingChunks[].web.uri`에서 실제 출처 URL 추출(모델이 지어낸 URL 대신) → `{id, work, scene, text, keyPoints, sourceHint, sourceUrl, sourceTitle}` 형태의 news passage 반환.
레이트리밋: `context-news:${ip}`, 분당 10회. 클라이언트는 로딩 중 버튼 비활성화로 연타 방지(레이트리밋 보호 목적, 구 `newsBusy` 상태와 동일).

**`POST /api/context/summary`** — `{ passage: {text, keyPoints, kind:'news'}, draft: string }`
→ NEWS_SUMMARY_SYSTEM 프롬프트로 채점 → `{captured: string[], missed: string[], verdict: 'pass'|'partial'|'miss', coach: string}`.
`draft.length < 5`면 400.

**`POST /api/capture`** — `{ imageBase64: string, mimeType: string }`
→ CAPTURE_SYSTEM 프롬프트 + `inline_data`(mime_type/data)로 Gemini vision 호출 → `{title, who, rel, goal, tension}` 추출. `title` 빈 문자열이면 "대화를 인식하지 못했다" 에러로 취급(400).
이미지 6MB 상한(구 프록시의 `MAX_IMAGE_PAYLOAD_BYTES` 기준 유지), `image/*` 아닌 mimeType은 400.

### 도메인/프롬프트 모듈

- `lib/domain/news-categories.ts`: `NEWS_CATEGORIES` 배열 그대로 이식(경제·시장/IT·기술/스포츠/문화·연예/사회·생활, 각 key/label/query).
- `lib/scoring/context-system.ts`: `NEWS_FETCH_SYSTEM`, `NEWS_SUMMARY_SYSTEM`, `CAPTURE_SYSTEM` 세 프롬프트 상수를 구 index.html(L1104-1156)에서 그대로 옮긴다(번역·수정 없음 — 이미 검증된 프롬프트).
- `lib/domain/types.ts`에 `NewsPassage` 타입 추가: `{id, work, scene, text, keyPoints, sourceHint, sourceUrl, sourceTitle}`.

## 컴포넌트

**`Picker.tsx`**: 상단에 "요즘 뉴스" 섹션 추가. 카테고리 칩 5개, 클릭 시 `/api/context/news` 호출 → 성공하면 `ContextReading` 화면으로 전환. 로딩 중(`newsBusy`) 칩 비활성화. 실패 시 인라인 에러 메시지.

**`ContextReading.tsx`** (신규, `AppShell`의 `Screen` 유니온에 `'context'` 추가):
- `read` phase: 지문 본문 + 출처 링크(있으면 클릭 가능한 외부 링크, `sourceHint` 텍스트) 표시 + 한 줄 요약 입력창.
- `grading` phase: 채점 중 로딩.
- `result` phase: `captured`/`missed`/`verdict`/`coach` 표시, "다른 뉴스 보기"(Picker로 복귀) 버튼.

**`NewSituation.tsx`**: 폼 최상단에 "캡쳐 이미지로 채우기" 업로드 버튼 추가.
- 파일 선택 → `FileReader`로 dataURL 로드 → `<img>`에 그려 `compressImage`(canvas, maxDim 1280, quality 0.8, `toDataURL('image/jpeg', 0.8)`)로 축소·재인코딩(구 L1159-1167 그대로).
- `/api/capture` 호출 → 성공하면 기존 `title`/`who`/`goal`/`tension` state를 채운다(`rel`은 별도 필드가 없으므로 `who` 뒤에 괄호로 병합: `${who} (${rel})`).
- 이후 흐름은 기존 "AI로 상황 설계하기" 버튼(`design()` → Claude `generateSituation`)을 그대로 사용 — 캡쳐는 입력을 채우는 역할만 하고 별도 파이프라인을 만들지 않는다.

## 데이터 흐름

```
[캡쳐] 파일선택 → 클라이언트 축소(canvas) → base64
     → POST /api/capture (Gemini vision)
     → title/who/goal/tension 폼 자동채움 (사용자 검토·수정 가능)
     → 기존 design() 버튼 → POST /api/situation (Claude, 기존 라우트 무변경)

[뉴스] 카테고리 칩 클릭
     → POST /api/context/news (Gemini + google_search grounding)
     → ContextReading 화면(read) 진입
     → 한 줄 요약 제출 → POST /api/context/summary (Gemini)
     → result 표시
```

## 에러 처리

- `GEMINI_API_KEY` 미설정: 3개 라우트 모두 503 + `"GEMINI_API_KEY가 서버에 설정되지 않았습니다."` — `situation` 라우트의 `ANTHROPIC_API_KEY` 부재 처리와 동일한 형태.
- Gemini 429(무료 티어 한도): 자동 재시도 실패 시 "Gemini 요청 한도에 걸렸습니다. n초 뒤 다시 시도" 류 메시지 그대로 이식(구 `friendlyError`).
- 뉴스 grounding 결과가 비었거나(`scene`/`text`/`keyPoints` 중 하나라도 없음) 부적절하면 "마땅한 최신 뉴스를 찾지 못했어요" 에러.
- 캡쳐 인식 실패(`title` 빈 문자열): "대화를 인식하지 못했어요. 다른 캡쳐를 올리거나 직접 입력해주세요."
- 개인정보: CAPTURE_SYSTEM 프롬프트에 이미 익명화 지시 포함(실명·전화번호 등을 그대로 쓰지 말 것). UI에도 "이미지가 Gemini에 1회 전송된다"는 안내 문구를 캡쳐 버튼 근처에 유지(구 README 고지 수준).

## 테스트

- `lib/scoring/gemini.test.ts`: `parseLooseJson`(트레일링 콤마·스마트따옴표 케이스), `retryAfterSec`류 순수 파싱 함수 유닛 테스트.
- `lib/domain/news-categories.test.ts`: 카테고리 5개 key 유일성·label 존재 검증(기존 `situations.test.ts` 패턴).
- API 스모크: `GEMINI_API_KEY` 없는 상태에서 3개 라우트 503 확인(기존 무DB 스모크 패턴 재사용, `npm run build` 후 `next start`로 수동 또는 스크립트).
- 수동 검증(사용자 몫): 실제 `GEMINI_API_KEY`로 뉴스 grounding 출처링크 정확성, 캡쳐 좌우 말풍선 판별 정확도 — 이건 기존 프로토타입 때도 "미검증"으로 남아있던 항목.

## 추가 결정 (설계 승인 후 발견)

계획 수립 중 `web/`의 `Picker.tsx`에 2026-07-18에 이미 폐기 결정된 각색카드(`ctx:true`, "실전 사례" 탭) 8개가 남아있는 것을 발견했다. 사용자 결정: **"실전 사례" 탭을 "요즘 뉴스"로 교체**하고 `situations.json`의 ctx 카드 8개·`Situation.ctx` 필드·관련 죽은 분기(Home.tsx/Train.tsx)를 함께 제거한다. 구현 계획의 Task 1로 반영.

## 스코프 밖 (이번 포팅에서 하지 않음)

- 소설(`PASSAGES`, kind:'novel') 7편 포팅.
- 구 프로토타입의 "방문자 자기 키 입력"(B모드) 폴백.
- AI 모델(빠름/고급) 선택 UI — web/엔 이미 없고, 이번 기능도 하드코딩된 `gemini-2.5-flash` 하나만 쓴다(env `GEMINI_MODEL`로 override 가능하게만 열어둠, `SCORING_MODEL` 패턴과 동일).
