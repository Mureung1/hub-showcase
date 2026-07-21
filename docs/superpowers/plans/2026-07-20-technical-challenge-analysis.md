# 근거 기반 기술적 도전 후보 분석 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Issue #14의 요구사항에 맞춰 Repository 분석 결과와 선택된 파일 내용을 근거로 포트폴리오에 활용할 수 있는 기술적 도전 후보를 제안하고, 각 후보에 근거·신뢰도·사용자 확인 필요 여부를 함께 제공한다.

**Architecture:** 기존 RepositoryAnalysisService가 GitHub 원본을 수집하고 구조화 분석을 만든 뒤, TechnicalChallengeContextBuilder가 README·설정·진입점·API·테스트 파일을 우선순위에 따라 선별한다. TechnicalChallengeAnalyzer는 제한된 컨텍스트와 기존 evidence를 AI provider에 전달하고, 구조화된 응답을 검증한 뒤 후보를 반환한다. AI 결과는 분석 snapshot에 저장하지만 사용자 역할이나 문제 난이도를 사실처럼 확정하지 않는다.

**Tech Stack:** NestJS, TypeScript, GitHub REST API, Supabase, React, npm workspaces, Node test runner, Jest, HTTP 기반 AI provider

## Global Constraints

- apps/api는 NestJS 모듈 구조를 유지한다.
- packages/contracts의 타입을 API와 React가 함께 사용한다.
- GitHub API에서 확인하지 못한 내용을 분석 결과에 임의로 채우지 않는다.
- commit 수와 변경 줄 수만으로 기술 난이도나 실제 기여도를 단정하지 않는다.
- AI는 사용자의 역할, 해결한 문제, 작업 난이도를 확정적으로 서술하지 않는다.
- 모든 기술적 도전 후보는 최소 하나의 Repository 근거를 가져야 한다.
- 근거가 부족한 후보는 requiresUserConfirmation: true로 표시한다.
- AI 응답이 잘못된 JSON이면 성공한 분석 결과처럼 저장하지 않는다.
- 초기 범위에서는 벡터 DB와 임베딩을 추가하지 않는다. 우선순위 기반 검색으로 먼저 검증하고 RAG 도입 판단을 문서화한다.
- .github/ 디렉토리와 GitHub Actions workflow는 수정하지 않는다.
- 외부 UI 라이브러리는 추가하지 않는다.

## 파일 구조와 책임

### 생성 파일

- apps/api/src/repository-analysis/technical-challenge.models.ts: AI 컨텍스트·후보·근거 참조 타입
- apps/api/src/repository-analysis/technical-challenge.context.ts: 파일 우선순위와 문자·토큰 예산 계산
- apps/api/src/repository-analysis/technical-challenge.prompt.ts: AI 지침과 구조화 프롬프트 생성
- apps/api/src/repository-analysis/technical-challenge.analyzer.ts: AI 응답 파싱과 후보 검증
- apps/api/src/repository-analysis/technical-challenge.client.ts: 외부 AI HTTP 호출 경계
- apps/api/src/repository-analysis/technical-challenge.context.spec.ts: 컨텍스트 선별 테스트
- apps/api/src/repository-analysis/technical-challenge.analyzer.spec.ts: AI 응답 검증 테스트
- supabase/migrations/20260720_add_technical_challenges.sql: 분석 결과 후보 저장 컬럼
- docs/research/issue14-ai-analysis-strategy.md: 프롬프트·검색·RAG 선택 근거

### 수정 파일

- packages/contracts/src/repository-analysis.ts, packages/contracts/src/index.ts: 후보 API 계약
- apps/api/src/repository-analysis/repository-analysis.models.ts: 선택 파일 내용 타입
- apps/api/src/repository-analysis/github-repository.client.ts: 분석 대상 파일 내용 조회
- apps/api/src/repository-analysis/repository-analysis.module.ts: AI provider 등록
- apps/api/src/repository-analysis/repository-analysis.service.ts: 분석 흐름 연결
- apps/api/src/repository-analysis/repository-analysis.persistence.ts: 후보 저장·재사용
- 관련 API·단위·통합 테스트, apps/api/.env.example, React 결과 화면, 문서 링크

### 후보 API 계약

~~~ts
export type TechnicalChallengeConfidence = "high" | "medium" | "low";

export type TechnicalChallengeEvidenceReference = {
  evidenceType: RepositoryAnalysisEvidenceType;
  referenceId: string | null;
  title: string;
  url: string | null;
  filePath: string | null;
};

export type TechnicalChallengeCandidate = {
  title: string;
  summary: string;
  background: string | null;
  problem: string | null;
  solution: string | null;
  technicalChallenge: string;
  whyItMatters: string;
  confidence: TechnicalChallengeConfidence;
  requiresUserConfirmation: boolean;
  evidence: TechnicalChallengeEvidenceReference[];
};
~~~

## Task 1: 후보 계약과 저장 모델 정의

**Files:** packages/contracts/src/repository-analysis.ts, packages/contracts/src/index.ts, apps/api/src/repository-analysis/repository-analysis.models.ts, supabase/migrations/20260720_add_technical_challenges.sql, docs/development/supabase-data-model.md

- [ ] RepositoryAnalysisDetails와 persistence input에 technicalChallenges: TechnicalChallengeCandidate[]를 추가한다.
- [ ] web fixture에 후보 한 건을 추가하고 confidence, 확인 필요 여부, filePath가 보존되는지 테스트한다.
- [ ] npm run typecheck:contracts로 타입을 검증한다.
- [ ] Supabase에 다음 컬럼과 배열 제약을 추가한다.

~~~sql
alter table public.analysis_results
  add column technical_challenges jsonb not null default '[]'::jsonb;

alter table public.analysis_results
  add constraint analysis_results_technical_challenges_array
  check (jsonb_typeof(technical_challenges) = 'array');
~~~

- [ ] 데이터 모델 문서에 후보는 AI 제안 snapshot이며 실제 역할·성과·난이도는 사용자 확인 전 사실이 아니라는 원칙을 기록한다.
- [ ] git diff --check 후 feat: 기술적 도전 후보 계약과 저장 모델 추가로 커밋한다.

## Task 2: AI 입력 컨텍스트와 토큰 예산 구현

**Files:** apps/api/src/repository-analysis/technical-challenge.models.ts, technical-challenge.context.ts, technical-challenge.context.spec.ts

**Interface:**

~~~ts
export type RepositoryContextFile = {
  path: string;
  content: string;
  priority: "critical" | "high" | "normal";
  truncated: boolean;
  estimatedTokens: number;
};

export type TechnicalChallengeContext = {
  repository: GitHubRepositoryAnalysisSource["repository"];
  analysis: RepositoryAnalysisDetails;
  files: RepositoryContextFile[];
  evidence: RepositoryAnalysisEvidence[];
  estimatedTokens: number;
  truncated: boolean;
};

export function buildTechnicalChallengeContext(
  source: GitHubRepositoryAnalysisSource,
  analysis: RepositoryAnalysisDetails,
): TechnicalChallengeContext;
~~~

- [ ] 파일 우선순위를 README/package/config → entrypoint → API/feature → test → CI/deployment 순으로 고정하고, 동일 순위는 경로순으로 정렬한다.
- [ ] 다음 예산 상수를 테스트와 구현에 함께 사용한다.

~~~ts
export const TECHNICAL_CHALLENGE_CONTEXT_LIMITS = {
  maxFiles: 20,
  maxCharactersPerFile: 6_000,
  maxCharactersTotal: 40_000,
  charactersPerEstimatedToken: 4,
} as const;
~~~

- [ ] 파일별·전체 문자 제한, 예상 토큰 수, truncated 상태를 검증한다.
- [ ] lock 파일, node_modules, 빌드 결과, 이미지·폰트·바이너리 파일을 제외한다.
- [ ] npm run test:api -- --runInBand apps/api/src/repository-analysis/technical-challenge.context.spec.ts를 실행하고 커밋한다.

## Task 3: GitHub 선택 파일 내용 수집

**Files:** apps/api/src/repository-analysis/github-repository.client.ts, 해당 spec, repository-analysis.models.ts

- [ ] tree 응답에서 우선순위 대상 파일을 고르고 /contents/{path} 응답을 컨텍스트용 파일로 정규화하는 mock 테스트를 작성한다.
- [ ] 상세 조회는 최대 20개로 제한하고, 선택 파일 조회 실패는 전체 분석 실패가 아니라 warnings에 기록한다.
- [ ] default branch 기준 blob/{branch}/{path} URL을 생성하고, 내용이 없으면 contentAvailable: false로 남긴다.
- [ ] 파일 내용 잘라내기는 client가 아니라 Task 2의 context builder가 담당하도록 분리한다.
- [ ] npm run test:api -- --runInBand apps/api/src/repository-analysis/github-repository.client.spec.ts를 실행하고 feat: 기술적 도전 후보용 파일 내용 수집으로 커밋한다.

## Task 4: AI prompt와 구조화 응답 검증

**Files:** technical-challenge.prompt.ts, technical-challenge.analyzer.ts, technical-challenge.analyzer.spec.ts

**Interfaces:**

~~~ts
export function createTechnicalChallengePrompt(
  context: TechnicalChallengeContext,
): TechnicalChallengeAiRequest;

export function parseTechnicalChallengeResponse(
  rawResponse: string,
): TechnicalChallengeCandidate[];
~~~

- [ ] 프롬프트에 근거 외 사실 생성 금지, commit 수만으로 난이도 판단 금지, 역할 단정 금지, 후보별 evidence 필수, 사용자 확인 표시, JSON 외 문장 금지 규칙을 포함한다.
- [ ] 정상 JSON, JSON code fence, malformed JSON, 필수 문자열 누락, evidence 빈 배열을 각각 테스트한다.
- [ ] evidence가 없는 후보는 제거하고 전체 후보가 제거되면 AiResponseValidationError를 발생시킨다.
- [ ] confidence가 low이거나 사용자 경험을 설명하는 문장이 있는 후보는 requiresUserConfirmation: true로 강제한다.
- [ ] npm run test:api -- --runInBand apps/api/src/repository-analysis/technical-challenge.analyzer.spec.ts 후 feat: 근거 기반 기술적 도전 후보 검증으로 커밋한다.

## Task 5: AI provider 경계와 환경 설정

**Files:** technical-challenge.client.ts, analyzer, module, controller, apps/api/.env.example 및 관련 spec

**Interface:**

~~~ts
export type TechnicalChallengeAiRequest = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
};

export type TechnicalChallengeAiClient = {
  generate(request: TechnicalChallengeAiRequest): Promise<string>;
};
~~~

- [ ] AI_API_KEY 또는 AI_MODEL이 없으면 외부 요청 없이 TechnicalChallengeAiUnavailableError를 반환하는 테스트를 작성한다.
- [ ] 2xx 응답을 반환하고 4xx·5xx·body 누락을 TechnicalChallengeAiResponseError로 변환한다. API key는 로그와 오류 메시지에 포함하지 않는다.
- [ ] Nest token provider로 client를 주입해 테스트에서 mock으로 교체할 수 있게 한다.
- [ ] AI 설정 누락은 technicalChallenges: []와 warning을 반환하고 기존 구조화 분석은 유지한다. malformed 응답도 임의 후보를 만들지 않는다.
- [ ] npm run test:api && npm run typecheck:api 실행 후 feat: 기술적 도전 분석 AI provider 연결로 커밋한다.

## Task 6: 분석 서비스와 Supabase 저장 연결

**Files:** repository-analysis.service.ts, repository-analysis.persistence.ts, 관련 unit/controller/e2e spec

- [ ] mock source를 사용해 createAnalysisDetails → buildTechnicalChallengeContext → AI analyzer → persistence 순서를 검증한다.
- [ ] AI 미설정·malformed 응답에서도 구조화 분석은 반환되고 후보는 빈 배열이며 warning이 남는지 테스트한다.
- [ ] analysis_results.technical_challenges에 후보가 저장되고, 동일 resultHash 재사용 시 새 AI 호출과 snapshot을 만들지 않는지 검증한다.
- [ ] AI 모델·프롬프트 규칙 변경 시 analyzerVersion을 변경해 재분석하도록 한다.
- [ ] pending 저장 실패 시 기존 정리 정책을 유지한다.
- [ ] npm run test:api && npm run typecheck:api 실행 후 feat: 기술적 도전 후보 분석과 저장 연결로 커밋한다.

## Task 7: React 결과 화면에 후보와 근거 표시

**Files:** apps/web/src/features/repository-analysis/AnalysisResult.tsx, repositoryAnalysis.ts, 관련 test, apps/web/src/style.css

- [ ] 후보 제목, 기술적 도전, Background/Problem/Solution 초안, confidence, 확인 필요 상태, evidence 링크가 view model에 보존되는지 테스트한다.
- [ ] 후보가 없으면 실패한 분석처럼 보이지 않도록 근거 기반 후보를 만들 수 없음과 warning을 표시한다.
- [ ] 결과 화면에 후보 카드와 후보, 신뢰도, 사용자 확인 필요 상태를 표시한다.
- [ ] 근거 링크는 GitHub URL로 이동하고 파일 경로·긴 제목은 모바일에서 줄바꿈한다.
- [ ] npm run test:web && npm run typecheck:web && npm run build:web 실행 후 feat: 기술적 도전 후보 결과 화면 추가로 커밋한다.

## Task 8: RAG 선택 근거와 운영 제한 문서화

**Files:** docs/research/issue14-ai-analysis-strategy.md, docs/document-map.md, docs/records/agent-record.md

- [ ] 전체 Repository prompt, 우선순위 파일 검색, 임베딩 기반 RAG를 비용·토큰·운영 복잡도·근거 추적성 기준으로 비교한다.
- [ ] 초기에는 Repository 하나의 제한된 컨텍스트에 우선순위 검색을 적용하고, 대규모 Repository·반복 질의·사용자 채팅이 필요해질 때 RAG를 재검토한다고 기록한다.
- [ ] max 20 files, 파일당 6,000자, 전체 40,000자, 문자 4개당 1토큰 추정과 제외 파일을 기록한다.
- [ ] AI 결과는 포트폴리오 완성본이 아니라 검증 가능한 후보이며, 실제 역할·성과·난이도는 사용자가 확인해야 한다고 기록한다.
- [ ] 관련 문서 링크와 git diff --check를 확인하고 docs: AI 기술적 도전 분석 전략 기록으로 커밋한다.

## Task 9: 통합 검증

**Files:** API·web 전체 테스트, migration, e2e

- [ ] npm test, npm run typecheck, npm run build를 실행한다.
- [ ] 원격 Supabase 적용 전 supabase db push --dry-run으로 기존 컬럼 삭제나 데이터 변경이 없는지 확인한다.
- [ ] AI 환경변수가 없는 환경에서 구조화 분석은 유지되고 후보 배열은 비어 있으며 warning이 표시되는지 확인한다.
- [ ] mock AI 응답 한 건으로 API 응답, Supabase JSONB, React의 evidence 링크가 동일한 filePath와 referenceId를 사용하는지 확인한다.
- [ ] git diff --check와 git status --short를 확인한다.
- [ ] 최종 검증 결과를 test: 기술적 도전 후보 분석 통합 검증으로 커밋한다.

## 완료 기준

- AI가 Repository 분석 결과에서 기술적 도전 후보를 제안한다.
- 모든 후보에 하나 이상의 GitHub 파일·commit·PR·Issue 근거가 연결된다.
- 근거가 부족한 후보는 requiresUserConfirmation: true로 표시된다.
- commit 수와 변경 줄 수만으로 기술 난이도나 실제 역할을 단정하지 않는다.
- malformed JSON이어도 서버가 임의의 성공 결과를 만들지 않는다.
- AI provider 설정이 없어도 기존 구조화 Repository 분석은 동작한다.
- 후보 결과가 Supabase snapshot에 저장되고 동일 결과는 재사용된다.
- React에서 후보, 신뢰도, 확인 필요 상태, 근거 링크를 확인할 수 있다.
- RAG를 초기 범위에 도입하지 않은 이유와 향후 도입 조건이 문서화된다.
- npm test, npm run typecheck, npm run build가 통과한다.
