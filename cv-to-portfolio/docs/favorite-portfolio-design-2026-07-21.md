# 다음 기능 설계 — 저장 포트폴리오 즐겨찾기

> 설계일: 2026-07-21
> 우선순위: P1 — 학교 AI API P0 이슈 #12~#14 완료 후 착수
> 목표: 별 클릭 → Express PATCH → Supabase UPDATE → React 갱신 → 새로고침 후 유지

## 왜 이 기능인가

저장·목록·상세 조회로 INSERT와 SELECT를 학습했다. 다음 작은 기능으로 즐겨찾기를 추가하면 기존 구조를 크게 흔들지 않고 migration과 UPDATE를 학습할 수 있다.

- 삭제보다 사용자의 실수 위험이 작다.
- 태그 기능처럼 새 테이블과 관계 설계가 필요하지 않다.
- 기존 최근 포트폴리오 목록에 작은 UI를 추가하면 된다.
- 학교 AI API 수직슬라이스와 독립적이어서 P1로 격리할 수 있다.

## 사용자 시나리오

1. 사용자가 최근 포트폴리오 목록에서 별 버튼을 누른다.
2. 화면은 해당 행만 저장 중 상태로 만든다.
3. Express가 boolean 입력을 검증하고 Supabase 행을 갱신한다.
4. 성공 응답으로 React 목록 state의 해당 항목을 교체한다.
5. 사용자가 즐겨찾기만 필터를 켜서 중요한 결과만 본다.
6. 새로고침하거나 서버를 재시작해도 별 상태가 유지된다.

## 화면 설계

~~~text
┌ 최근 포트폴리오 ──────────────────────────────┐
│ 검색 [             ]  테마 [전체]  [✓ 즐겨찾기만] │
│                                                │
│ 김지우 · Frontend Engineer     [☆ 즐겨찾기] [불러오기] │
│ 이서연 · Product Designer      [★ 해제]      [불러오기] │
│                                                │
│ 필터 결과가 없으면: 즐겨찾기 결과가 없습니다.       │
└────────────────────────────────────────────────┘
~~~

상태별 요구사항:

- 기본: ☆ 즐겨찾기
- 선택: ★ 즐겨찾기 해제
- 저장 중: 해당 버튼만 disabled, 저장 중…
- 실패: 기존 별 상태를 유지하고 해당 행에 오류 표시
- 빈 목록: 저장된 포트폴리오가 없다는 문구
- 필터 빈 결과: 즐겨찾기 결과가 없다는 별도 문구

첫 구현은 서버 성공 응답 후 state를 바꾸는 보수적 흐름을 사용한다. 낙관적 업데이트와 실패 rollback은 이번 조각에서 제외해 상태 복잡도를 줄인다.

## 데이터 설계

기존 portfolios 테이블에 boolean 열 하나를 추가한다.

~~~sql
alter table public.portfolios
  add column if not exists is_favorite boolean not null default false;
~~~

- 기존 행: migration 적용 시 false
- 신규 행: 값을 보내지 않아도 false
- 서버 응답: snake_case is_favorite를 camelCase isFavorite로 변환
- 별도 테이블이나 사용자별 관계는 아직 만들지 않는다.

## API 계약

### 요청

~~~http
PATCH /api/portfolios/:id/favorite
Content-Type: application/json

{ "isFavorite": true }
~~~

### 성공

~~~json
{
  "portfolio": {
    "id": "uuid",
    "isFavorite": true
  }
}
~~~

### 오류

| 조건 | 상태 |
| --- | ---: |
| isFavorite 누락 또는 boolean이 아님 | 400 |
| UUID 형식 오류 또는 존재하지 않는 행 | 404 |
| Supabase 설정 없음 | 503 |
| Supabase 네트워크·쿼리 실패 | 502 |

## 흐름

~~~mermaid
sequenceDiagram
  actor U as 사용자
  participant FE as React PortfolioLibrary
  participant BE as Express
  participant DB as Supabase portfolios
  U->>FE: 별 버튼 클릭
  FE->>FE: 해당 행 pending
  FE->>BE: PATCH /api/portfolios/:id/favorite
  BE->>BE: UUID와 boolean 검증
  BE->>DB: UPDATE is_favorite WHERE id
  DB-->>BE: 갱신된 행
  BE-->>FE: 200 portfolio
  FE->>FE: 목록 state의 해당 항목 교체
  U->>FE: 새로고침
  FE->>BE: GET /api/portfolios
  BE->>DB: SELECT
  DB-->>FE: isFavorite=true 유지
~~~

## 작업 분해

| 순서 | 작업 | 우선순위 | 크기 | 선행 | 완료 기준 |
| ---: | --- | :-: | :-: | --- | --- |
| 1 | 컬럼 migration과 응답 매핑 | P1 | S | 없음 | 기존·신규 행 false, 목록·상세 boolean 응답, 서버 테스트 |
| 2 | 즐겨찾기 PATCH API | P1 | S | 1 | true/false 200, 잘못된 입력 400, 없는 ID 404, DB 실패 구분 |
| 3 | React 토글과 즐겨찾기 필터 | P1 | S | 2 | 토글·필터·pending·오류·빈 상태, 클라이언트 테스트·빌드 |
| 4 | 실제 Supabase E2E와 문서 | P2 | S | 1~3 | 토글 후 새로고침·서버 재시작 유지, test·lint·build |

## AI 계획 검토와 조정

Agent 초안은 migration → PATCH → React → E2E 순서로 적절했다. 다음 항목은 그대로 받지 않고 조정했다.

- 모든 작업을 하루 이내 S로 제한했다.
- AI API P0와 경쟁하지 않도록 전부 P1/P2로 내렸다.
- 목록 서버 필터, 별도 테이블, 정렬, 인증은 범위에서 제외했다.
- 낙관적 UI 대신 응답 후 반영을 선택해 rollback 상태를 제거했다.
- strict boolean, 404, DB 실패, 중복 클릭, 두 종류의 빈 상태를 완료 기준에 추가했다.
- #12~#14가 완료되지 않으면 이 기능을 착수하지 않고 다음 주로 넘긴다.

## 제외 범위와 한계

- 사용자 인증 전에는 모든 포트폴리오가 전역 데이터라는 한계가 있다.
- 사용자별 즐겨찾기와 user_id 기반 RLS는 인증 기능과 함께 설계한다.
- 서버 측 favorite=true 목록 쿼리는 데이터가 많아질 때 별도 이슈로 분리한다.
- 즐겨찾기 정렬, 대표 포트폴리오 하나만 선택, 낙관적 UI는 포함하지 않는다.
