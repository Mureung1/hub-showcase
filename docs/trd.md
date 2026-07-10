# 모두의 뇌 TRD

## 1. 문서 목적

이 문서는 모두의 뇌 MVP를 구현하기 위한 기술 요구사항을 정리한다. React 화면, 서버 API, 로컬 분석기, 선택형 OpenAI provider가 같은 응답 계약을 사용하도록 고정한다.

## 2. 기술 목표

- React + TypeScript 기반으로 MVP 화면을 구현한다.
- AI 응답은 JSON 스키마로 고정해 UI가 안정적으로 렌더링되게 한다.
- 기본 실행은 API 키가 필요 없는 로컬 휴리스틱을 사용하고, 설정 시 OpenAI Responses API로 교체한다.
- 외부 UI 라이브러리 없이 CSS Modules 또는 일반 CSS로 구성한다.

## 3. 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Styling | CSS Modules, CSS |
| Data | 사용자 입력 기반 API 응답 JSON, 명시적으로 선택한 샘플 JSON |
| Visualization | SVG 또는 React 컴포넌트 기반 노드 그래프 |
| AI 연동 | local-heuristic, 선택형 OpenAI Responses API 구조화 출력 |
| Validation | Zod(서버 provider 응답), 클라이언트 런타임 응답 검증 |
| Quality | ESLint, Vitest, TypeScript, Vite build |

## 4. MVP 아키텍처

```text
사용자 입력
  -> InputForm
  -> analyzeContext()
  -> ContextAnalysisResult
  -> SummaryPanel
  -> ParticipantAgentPanel
  -> PerspectiveTable
  -> QuestionList
  -> KnowledgeMap
  -> OnboardingSummary
```

현재 구현에서는 `analyzeContext()`가 `/api/context-analysis`를 호출한다. Vite 개발 서버와 `server/server.mjs`가 같은 API 계약을 제공한다. 기본 `local-heuristic` provider는 키 없이 동작하고, `openai` provider는 서버 환경변수가 모두 있을 때만 OpenAI Responses API의 구조화 출력을 요청한다. 키나 모델이 없거나 응답 스키마가 잘못되면 샘플로 대체하지 않고 구조화된 API 오류를 반환한다.

## 5. 디렉터리 구조 제안

```text
src/
  components/
    NewsCard.tsx
    ContextInput.tsx
    SummaryPanel.tsx
    PerspectiveTable.tsx
    QuestionList.tsx
    KnowledgeMap.tsx
    OnboardingSummary.tsx
  data/
    sampleAnalysis.ts
  types/
    context.ts
  services/
    analyzeContext.ts
server/
  contextAnalysisErrors.mjs
  contextAnalysisSchema.mjs
  contextAnalysisCore.mjs
  contextAnalysisApi.mjs
  providers/openaiContextAnalysis.mjs
  server.mjs
```

## 6. 핵심 타입 정의

```ts
export type NodeType = "topic" | "person" | "role" | "decision" | "question";

export type KnowledgeNode = {
  id: string;
  label: string;
  type: NodeType;
  summary: string;
};

export type KnowledgeLink = {
  from: string;
  to: string;
  relation: string;
};

export type PerspectiveItem = {
  actor: string;
  role: string;
  focus: string;
  concern: string;
  question: string;
};

export type ContextAnalysisResult = {
  projectTitle: string;
  summary: {
    projectTitle: string;
    overview: string[];
    sourceLength: number;
    generatedAt: string;
  };
  keyTerms: {
    term: string;
    meaning: string;
  }[];
  decisions: {
    decision: string;
    reason: string;
    status: "confirmed" | "tentative" | "unclear";
  }[];
  participants: PerspectiveItem[];
  questions: {
    question: string;
    reason: string;
    ownerHint: string;
  }[];
  knowledgeMap: {
    nodes: KnowledgeNode[];
    links: KnowledgeLink[];
  };
  onboardingSummary: {
    items: string[];
    currentDecisions: string[];
    remainingQuestions: string[];
    shareText: string;
  };
};
```

## 7. 서비스 함수

### 7.1 현재 API 연동 함수

```ts
export async function analyzeContext(
  projectTitle: string,
  inputText: string,
): Promise<ContextAnalysisResult>
```

### 7.2 API 계약

```http
POST /api/context-analysis
Content-Type: application/json
```

요청:

```json
{
  "projectTitle": "프로젝트 이름",
  "rawText": "회의록, 조사 메모, 피드백, 결정사항"
}
```

오류 응답:

```json
{
  "error": {
    "code": "RAW_TEXT_TOO_SHORT",
    "message": "회의록, 메모, 피드백을 120자 이상 입력하세요.",
    "details": {
      "minLength": 120,
      "currentLength": 30
    }
  }
}
```

환경변수:

| 이름 | 설명 |
| --- | --- |
| `MODU_BRAIN_ANALYSIS_PROVIDER` | `local-heuristic`(기본값) 또는 `openai` |
| `MODU_BRAIN_OPENAI_MODEL` | `openai` 사용 시 명시하는 구조화 출력 지원 모델 ID |
| `OPENAI_API_KEY` | `openai` 사용 시 서버에서만 읽는 API 키 |
| `HOST` | 빌드 결과 서버 바인딩 주소. 기본값은 `127.0.0.1` |

OpenAI provider는 비용을 임의로 발생시키지 않도록 provider, 모델, 키를 모두 명시해야 활성화된다. API 키는 Vite 클라이언트 환경에 노출하지 않는다. 외부 공개 배포는 이 MVP의 기본 범위가 아니며, `HOST`를 외부 주소로 바꾸기 전에 인증과 요청 제한을 추가해야 한다. 사용자가 입력을 수정하거나 새 분석을 시작해 브라우저 요청을 취소하면 서버의 AbortSignal을 OpenAI SDK 호출까지 전달한다.

## 8. 화면 요구사항

### 8.1 입력 화면

- 프로젝트 이름 입력
- 프로젝트 이름 2~120자 제한
- 문서 텍스트 입력
- 예시 입력 버튼
- 분석 버튼
- 민감 정보 입력 주의 문구

### 8.2 결과 화면

- 프로젝트 맥락 요약
- 핵심 용어 목록
- 결정사항 목록
- 참여자별 관점 표
- 미결 질문 목록
- 공유 지식맵
- 새 참여자 온보딩 요약

## 9. 상태 관리

MVP에서는 React 기본 상태만 사용한다.

```ts
type AnalyzeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ContextAnalysisResult }
  | { status: "error"; message: string };
```

전역 상태 관리 라이브러리는 MVP에서 제외한다.

## 10. 에러 처리

| 상황 | 처리 |
| --- | --- |
| 빈 입력 | 분석 버튼 비활성화 |
| 너무 짧은 입력 | 안내 문구 표시 |
| API 실패 | 다시 시도 버튼 표시 |
| JSON 파싱 실패 | 원문 응답을 보여주지 않고 오류 메시지 표시 |
| 결과 일부 누락 | 빈 상태 UI 표시 |
| API 미실행 | 샘플 데이터를 몰래 표시하지 않고 연결 오류를 표시 |

## 11. 팀원별 관점 에이전트 확장

MVP에서는 별도의 자율 에이전트 프레임워크를 도입하지 않는다. 대신 입력 기록에서 확인 가능한 발언과 역할만 근거로 `participantAgents` 결과를 생성한다.

분석 순서:

1. 참여자 이름과 발언 문장을 찾는다.
2. 각 참여자의 역할, 우선순위, 우려, 질문을 구조화한다.
3. 참여자별 해석 차이와 공통 합의점을 비교한다.
4. 공유 에이전트가 다음 회의 질문과 온보딩 요약으로 종합한다.

개인정보 원칙:

- 팀원의 성격을 추정하지 않는다.
- 말투나 인격 자체를 단정하지 않는다.
- 입력 기록에 근거가 있는 `프로젝트 관점`만 UI에 표시한다.

## 12. 보안 및 개인정보

- 사용자가 민감한 개인정보를 입력하지 않도록 안내한다.
- OpenAI provider 활성화 시 원문이 외부로 전송된다는 조건을 제출 전에 안내한다.
- API 키는 클라이언트에 노출하지 않는다.
- OpenAI 요청은 `server/providers/openaiContextAnalysis.mjs`에서만 처리한다.
- 외부 provider 오류 원문이나 API 키를 클라이언트 응답과 로그에 포함하지 않는다.
- 입력 원문 저장은 MVP에서 제외한다.
- 빌드 결과 서버는 기본적으로 `127.0.0.1`에만 바인딩한다.
- 정적 응답에 CSP, frame 차단, referrer 제한, `nosniff` 보안 헤더를 적용한다.

## 13. 품질 게이트

`npm run check`는 아래 검증을 순서대로 실행한다.

1. ESLint 정적 검사
2. Vitest 서버·클라이언트 회귀 테스트
3. TypeScript 타입 검사와 Vite 프로덕션 빌드

필수 회귀 범위:

- 2~120자 제목, 120~20,000자 원문 경계와 잘못된 JSON/HTTP 메서드
- 20,001자 및 100KB 초과 요청이 연결 종료가 아닌 구조화 413을 반환하는지
- local/OpenAI provider 선택, 설정 누락, 외부 응답 스키마 오류
- provider를 포함한 클라이언트 전체 응답 계약
- idle/sample/loading/success/error 상태와 샘플의 명시적 선택
- 실제 API가 생성하는 동적 노드 ID의 지식맵 렌더링
- 정적 서버의 잘못 인코딩된 URL과 디렉터리 요청 복구
- 클라이언트 연결 종료가 진행 중 provider 요청까지 취소되는지
- Windows encoded traversal 차단과 정적 응답 보안 헤더

## 14. 구현 순서

1. 요청·응답 타입과 런타임 스키마 고정
2. local-heuristic 및 OpenAI provider 분리
3. 입력·결과·참여자 관점·동적 지식맵 UI 구현
4. idle/sample/loading/success/error 상태 분리
5. 서버·클라이언트 회귀 테스트와 lint 추가
6. `npm run check` 및 실제 브라우저 검증
