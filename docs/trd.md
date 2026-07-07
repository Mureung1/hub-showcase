# 모두의 뇌 TRD

## 1. 문서 목적

이 문서는 모두의 뇌 MVP를 구현하기 위한 기술 요구사항을 정리한다. 현재 단계에서는 실제 AI API 연동 전, React 기반 화면과 데이터 구조를 먼저 고정한다.

## 2. 기술 목표

- React + TypeScript 기반으로 MVP 화면을 구현한다.
- AI 응답은 JSON 스키마로 고정해 UI가 안정적으로 렌더링되게 한다.
- 초기에는 더미 데이터를 사용하고, 이후 LLM API로 교체 가능하게 만든다.
- 외부 UI 라이브러리 없이 CSS Modules 또는 일반 CSS로 구성한다.

## 3. 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Styling | CSS Modules, CSS |
| Data | Static JSON, 이후 API 응답 JSON |
| Visualization | SVG 또는 React 컴포넌트 기반 노드 그래프 |
| AI 연동 예정 | LLM API |
| Build | `npm run build` |

## 4. MVP 아키텍처

```text
사용자 입력
  -> InputForm
  -> analyzeContext()
  -> ContextAnalysisResult
  -> SummaryPanel
  -> PerspectiveTable
  -> QuestionList
  -> KnowledgeMap
  -> OnboardingSummary
```

초기 구현에서는 `analyzeContext()`가 더미 데이터를 반환한다. 이후 같은 함수 내부만 API 호출로 교체한다.

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
  contextSummary: string[];
  keyTerms: {
    term: string;
    meaning: string;
  }[];
  decisions: {
    decision: string;
    reason: string;
    status: "confirmed" | "tentative" | "unclear";
  }[];
  perspectives: PerspectiveItem[];
  unresolvedQuestions: string[];
  knowledgeMap: {
    nodes: KnowledgeNode[];
    links: KnowledgeLink[];
  };
  onboardingSummary: string[];
};
```

## 7. 서비스 함수

### 7.1 초기 더미 분석 함수

```ts
export async function analyzeContext(input: string): Promise<ContextAnalysisResult> {
  return sampleAnalysis;
}
```

### 7.2 추후 API 연동 함수

```ts
export async function analyzeContext(input: string): Promise<ContextAnalysisResult> {
  const response = await fetch("/api/analyze-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new Error("맥락 분석에 실패했습니다.");
  }

  return response.json();
}
```

## 8. 화면 요구사항

### 8.1 입력 화면

- 프로젝트 이름 입력
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

## 11. 보안 및 개인정보

- 사용자가 민감한 개인정보를 입력하지 않도록 안내한다.
- API 키는 클라이언트에 노출하지 않는다.
- 실제 API 연동 시 서버 또는 서버리스 함수에서 LLM 요청을 처리한다.
- 입력 원문 저장은 MVP에서 제외한다.

## 12. 테스트 계획

- `npm run build`가 통과해야 한다.
- 빈 입력 상태에서 분석 버튼이 비활성화되는지 확인한다.
- 예시 입력을 불러오면 분석 버튼이 활성화되는지 확인한다.
- 더미 분석 결과가 모든 섹션에 렌더링되는지 확인한다.
- 긴 텍스트가 모바일 화면에서 레이아웃을 깨지 않는지 확인한다.

## 13. 구현 순서

1. `types/context.ts` 작성
2. `data/sampleAnalysis.ts` 작성
3. `services/analyzeContext.ts` 작성
4. 입력 컴포넌트 구현
5. 결과 패널 컴포넌트 구현
6. 지식맵 컴포넌트 구현
7. 더미 데이터 연결
8. 빌드 검증
