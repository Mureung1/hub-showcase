# Phase 9: Rule-based Action Item Extraction (공모전)

이 계획서는 크롤러가 수집한 위비티(Wevity) 공모전/대외활동 `RawInformation`을 AI 없이 규칙 기반(Rule-based)으로 `ActionItem`으로 자동 변환하는 파이프라인 고도화 계획입니다.

## 1. Goal Description
현재 `LlmPipelineService`의 가짜(Mock) LLM 로직은 특정 키워드("과제", "장학금", "이의신청")에만 하드코딩 되어 있습니다.
이를 고도화하여 위비티에서 수집한 `CONTEST` 타입 데이터에 대해 다음과 같은 규칙을 적용하여 `ActionItem`을 생성합니다.

- **분석 로직 (키워드 기반)**:
  - "해커톤", "공모전", "콘테스트" 키워드 포함 -> 우선순위 80, 기한 +14일, 카테고리 `CONTEST`
  - "서포터즈", "기자단", "대외활동" 키워드 포함 -> 우선순위 70, 기한 +10일, 카테고리 `EXTRACURRICULAR`
  - 기타 위비티 데이터 -> 우선순위 50, 기한 +7일, 카테고리 `ETC`
- **목표**: 프론트엔드 대시보드의 'Action Items' (메인 영역)에 실제 공모전이 To-Do 리스트처럼 노출되게 함.

## 2. Tasks

| 작업명 (Task) | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| `LlmPipelineService` 수정 | `mockLlmReasoning` 내에 `SourceType.CONTEST` 분기 및 키워드 추출 로직 추가 | [x] | 백엔드 코드 수정 |
| 대시보드 API 엔드포인트 연동 | 프론트엔드 `Dashboard.tsx`에서 Action Item 렌더링 확인 | [x] | |
| 파이프라인 전체 통합 테스트 | `trigger-crawler` 후 `trigger-llm` 연쇄 호출로 데이터 흐름 검증 | [x] | |

## 3. Open Questions (사용자 확인 필요)
- 크롤러로 긁어온 정보를 매시간 정각에 자동으로 Action Item으로 변환하도록 백그라운드 스케줄러를 달아둘까요? 아니면 당분간은 `trigger-llm` API로 수동 실행하시겠습니까?
