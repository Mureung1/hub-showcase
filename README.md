# 모두의 뇌

여러 사람이 하나의 프로젝트를 함께 진행할 때 각자 알고 있는 배경지식, 결정사항, 용어, 미결 질문을 하나의 공유 지식망으로 정리해주는 협업 맥락 AI 에이전트 기획입니다.

## 서비스 한 줄 설명

모두의 뇌는 회의록, 연구 메모, 팀 피드백, 보고서에 흩어진 프로젝트 맥락을 연결해 팀 전체가 함께 쓰는 두 번째 뇌를 만들어주는 AI 에이전트입니다.

## 문서

- [기초 개발 기획서](docs/plan.md)
- [PRD](docs/prd.md)
- [TRD](docs/trd.md)
- [프롬프트 디자인](docs/prompt-design.md)
- [시장 조사 및 경쟁 분석](docs/market-research.md)
- [디자인 산출물 링크](docs/design-assets.md)
- [Figma 디자인 시스템](docs/figma-design-system.md)
- [모두의 뇌 Design Skill](docs/modu-brain-design-skill.md)
- [Figma 개발 핸드오프](docs/figma-handoff.md)
- [작업 분해 체크리스트](docs/checklist.md)
- [PR 벤치마크와 적용 근거](docs/benchmark-prs.md)
- [PR 설명 초안](docs/pr-description-draft.md)

## 기획 시각화

![모두의 뇌 기획 대표 이미지](docs/images/modu-brain-cover.png)

- [HTML 상세 보기](docs/visualization.html)
- [Figma 보드 프리뷰](docs/figma-board-preview.html)
- [최신 데스크톱 웹 캡처](docs/images/modu-brain-web-desktop.png)
- [최신 모바일 웹 캡처](docs/images/modu-brain-web-mobile.png)

## 현재 개발 방향

오늘 단계에서는 회의 요약 도구와 구분되는 기획 방향을 명확히 하기 위해, `할 일 정리`보다 `맥락 공유`를 핵심 문제로 둡니다. 첨부 개발 패키지의 PRD/TRD/화면설계를 기준으로 React 프로토타입을 구성했습니다.

1. 문제 정의를 협업 맥락 손실 문제로 바꿉니다.
2. 핵심 기능을 프로젝트 맥락 추출과 공유 지식맵 생성으로 좁힙니다.
3. 시장 조사와 경쟁 분석으로 기획 타당성을 보강합니다.
4. 기초 화면 개발을 위해 React + TypeScript 컴포넌트를 추가합니다.
5. 결과 화면은 `개요 / 지식맵 / 온보딩 요약` 탭으로 나눠 보여줍니다.
6. 예시와 실제 API 결과를 구분하고, 오류 시 이전 결과나 샘플로 대체하지 않습니다.

## MVP 핵심 기능

- 회의록/연구 메모/팀 피드백에서 주제, 용어, 결정사항, 미결 질문 추출
- 사람/역할/주제를 연결한 공유 지식맵과 맥락 요약 생성
- 참여자별 해석을 입력 근거 문장, 공통 합의, 관점 충돌과 함께 표시

## React 프로토타입 구성

- 입력: [ContextInput](src/components/ContextInput.tsx)
- 분석 대기/진행/오류 상태: [AnalysisPlaceholder](src/components/AnalysisPlaceholder.tsx)
- 요약: [SummaryPanel](src/components/SummaryPanel.tsx)
- 관점 표: [PerspectiveTable](src/components/PerspectiveTable.tsx)
- 참여자 근거·합의·긴장: [ParticipantAgentPanel](src/components/ParticipantAgentPanel.tsx)
- 미결 질문: [QuestionList](src/components/QuestionList.tsx)
- 결정사항: [DecisionList](src/components/DecisionList.tsx)
- 핵심 용어: [KeyTerms](src/components/KeyTerms.tsx)
- 지식맵: [KnowledgeMap](src/components/KnowledgeMap.tsx)
- 온보딩 요약: [OnboardingSummary](src/components/OnboardingSummary.tsx)

## 로컬 실행

```bash
npm install
npm run dev
```

Vite 개발 서버는 `/api/context-analysis` 개발용 API를 함께 제공합니다.

빌드 결과를 같은 API와 함께 확인하려면 다음 순서로 실행합니다.

```bash
npm run build
npm run start
```

lint, test, typecheck와 production build를 한 번에 확인하려면 다음 품질 게이트를 실행합니다.

```bash
npm run check
```

## 맥락 분석 API

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

응답은 `summary`, `participants`, `decisions`, `questions`, `keyTerms`, `knowledgeMap`, `onboardingSummary`, `participantAgents`, `provider`를 포함합니다.

| provider | 계약 | 필요한 서버 설정 |
| --- | --- | --- |
| `local-heuristic` | 기본값. 외부 모델을 호출하지 않고 입력 문장을 규칙 기반으로 구조화하며 응답에 `usedExternalModel: false`를 표시합니다. | 없음 |
| `openai` | OpenAI Responses API의 구조화 출력을 요청하고 응답에 실제 모델 이름과 `usedExternalModel: true`를 표시합니다. 키·모델 누락이나 잘못된 응답은 명시적 API 오류로 반환하며 로컬 결과로 조용히 대체하지 않습니다. | `MODU_BRAIN_ANALYSIS_PROVIDER=openai`, `MODU_BRAIN_OPENAI_MODEL`, `OPENAI_API_KEY` |

OpenAI 키는 `server/providers/openaiContextAnalysis.mjs`에서만 읽고 클라이언트 요청, 번들과 저장소에는 넣지 않습니다. **OpenAI live paid call은 아직 실행하지 않았습니다.** 현재 확인된 외부 provider 범위는 mock client를 사용한 계약과 오류 처리이며, 실제 모델 품질·비용·권한은 별도 검증이 필요합니다.

입력 화면은 OpenAI 활성화 시 원문이 외부 provider로 전송된다는 점을 제출 전에 고지합니다. 빌드 결과 서버는 기본적으로 `127.0.0.1`에만 바인딩되며, 이 MVP를 외부에 공개할 때는 `HOST`를 변경하기 전에 인증과 요청 제한을 추가해야 합니다. 입력을 수정하거나 새 분석을 시작하면 진행 중 요청을 브라우저와 OpenAI SDK까지 취소 전파합니다.

## 정직한 화면 상태와 동적 결과

- 첫 진입은 결과가 없는 `idle` 상태이며 샘플을 자동으로 표시하지 않습니다.
- `예시 불러오기`를 직접 눌렀을 때만 `sample` 배지가 표시됩니다.
- 실제 요청은 `loading → success` 또는 `loading → error`로 전이합니다. 오류가 나면 이전 결과나 샘플을 성공 결과처럼 남기지 않습니다.
- 개요에는 참여자별 관점과 함께 입력 근거 문장, 공통 합의, 관점 충돌·확인 필요 항목을 표시합니다.
- 기록에 근거가 없는 결정, 참여자, 질문, 핵심 용어는 억지로 만들지 않고 명시적인 빈 상태로 표시합니다.
- 지식맵은 고정된 장식이 아니라 API의 node ID, type, link를 사용해 lane과 높이를 계산하는 동적 SVG이며, 같은 내용을 텍스트 목록으로도 제공합니다.

## 품질 검증과 CI 상태

- `npm run check`: ESLint → Vitest 서버·클라이언트 회귀 테스트 → TypeScript typecheck와 Vite build
- `.github/workflows/modu-brain-quality.yml`은 같은 품질 게이트를 위한 로컬 준비본입니다. 현재 GitHub CLI OAuth에 `workflow` scope가 없어 PR 브랜치에는 포함하지 않았습니다.
- 따라서 현재 증거는 `npm ci` 직후 실행한 로컬 `npm run check` 성공이며, 기존 auto-merge workflow를 품질 CI 성공으로 간주하지 않습니다.

## 브라우저 확인 시나리오

1. 첫 진입에서 `분석 대기`가 보이고 샘플 결과가 자동 표시되지 않는지 확인합니다.
2. `예시 불러오기`를 누른 뒤에만 `예시 데이터 데모` 배지와 결과가 보이는지 확인합니다.
3. `맥락 분석하기`를 누르면 중복 제출이 막히고, 성공 시 `local-heuristic 분석 결과`처럼 provider가 표시되는지 확인합니다.
4. 개요에서 참여자별 입력 근거, 공통 합의, 관점 충돌·확인 필요 항목을 확인합니다.
5. 지식맵 탭에서 API가 만든 노드와 링크가 표시되고, 온보딩 요약 탭으로 전환되는지 확인합니다.
6. 입력을 수정하거나 API 오류가 발생하면 이전 결과를 숨기고 대기·오류 상태를 정직하게 표시하는지 확인합니다.
7. 모바일 폭에서도 텍스트, 카드와 동적 지식맵이 가로로 넘치지 않는지 확인합니다.
