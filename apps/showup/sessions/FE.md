# ShowUp FE Session

> 공통 규칙은 [sessions/_COMMON.md](_COMMON.md)를 참조.

## 역할

ShowUp의 프론트엔드 화면, 컴포넌트, 라우팅, 폼, 상태 표시, 반응형 UI를 담당한다.
사용자는 소상공인 사장님이므로 화면은 모바일 우선, 빠른 검색, 큰 터치 영역,
명확한 경고 표시를 기준으로 만든다.

- **모델**: Qwen 3.5 (Ollama 연결)
- 서버/UI 상태: 현재 주요 화면은 React hooks + Firebase 서비스 레이어 사용. TanStack Query/Zustand 미사용
- 폼: React Hook Form + Zod

## 담당 영역

- `apps/showup/src/components/`
- `apps/showup/src/pages/`
- `apps/showup/src/hooks/`
- `apps/showup/src/utils/` — 프론트엔드 전용 util만
- `apps/showup/src/types/` — 프론트엔드 전용 타입만
- 프론트엔드 스타일과 반응형 레이아웃

**제외 — 다른 세션 소유 (읽기만, 수정 금지):**

- `src/types/schema.ts` — BE
- `src/utils/risk.ts`, `src/utils/phone.ts` — BE
- `src/lib/firebase.ts`, `src/services/` — BE
- `src/pages/Privacy.tsx`, `src/pages/Terms.tsx` — 문안은 보안 소유, FE는 라우팅 연결과 레이아웃 래핑만

## MVP 화면

- `/login`, `/register`, `/app/dashboard`, `/app/customers`, `/app/customers/:id`
- `/app/reservations`, `/app/reservations/new`, `/privacy`, `/terms`

`/stats`와 `/me`는 MVP 이후 단계다.

## 주요 컴포넌트

- `RiskBadge`: 안심, 주의, 위험 3등급 표시와 "참고용 지표" 문구
- `RiskAlertBanner`: 노쇼 3회 이상 또는 abuse 1회 이상일 때만 표시
- `CustomerSearch`: 전화번호 뒤 4자리/이름 검색, 300ms debounce
- `CustomerCard`: 이름, 마스킹 전화번호, 위험도 표시
- `CustomerTimeline`: 예약 이벤트와 사건을 시간순 표시
- `ReservationStatusActions`: 방문, 노쇼, 당일 취소 원터치 버튼
- `IncidentFormModal`: 카테고리 선택과 사실 메모 입력
- `AppLayout`: 모바일 하단 네비 4탭, PC 사이드바

## 건드려도 되는 것

- React 페이지와 컴포넌트
- 프론트엔드 전용 hook
- 프론트엔드 전용 util
- Tailwind 스타일
- mock 데이터
- 로딩, 에러, 빈 상태 UI
- 접근성, 반응형 개선

## 건드리면 안 되는 것

- Firebase Security Rules
- Cloud Functions 구현
- Firestore 데이터 모델의 임의 변경
- 실제 `.env`
- `main` 브랜치 작업
- `.omc/`, `node_modules/`, `dist/`

## UI 원칙

- Mobile-first로 설계한다.
- 터치 타겟은 최소 44px 이상으로 만든다.
- 전화번호는 항상 `010-****-1234` 형태로 표시한다.
- 전화번호 뒤 4자리 검색 결과는 단일 자동 매칭하지 않고 후보 목록으로 표시한다.
- 위험도는 "블랙리스트"가 아니라 "참고용 지표"로 표현한다.
- 노쇼 3회 이상 또는 abuse 1회 이상이면 검색 결과와 예약 생성 화면에 경고 배너를 강제 표시한다.
- 자동 차단처럼 보이는 문구를 피하고, 사장님의 최종 판단을 돕는 문구를 사용한다.
- 모든 주요 화면에 loading, error, empty 상태를 포함한다.
- **이모지 금지** — UI 텍스트에 이모지 넣지 말 것. SVG line icon 사용.

## 작업 순서

1. 작업 대상 화면과 상태를 먼저 정의한다.
2. 필요한 props와 TypeScript 타입을 확인한다.
3. BE가 확정한 `types/schema.ts`가 있으면 우선 사용한다.
4. Firestore 연결 전에는 mock 데이터로 UI를 먼저 만든다.
5. 폼은 React Hook Form + Zod 기준으로 작성한다.
6. 서버 데이터는 현재 React hooks + Firebase 서비스 레이어로 관리한다.
7. 모바일 375px 기준으로 레이아웃을 확인한다.
8. 긴 이름, 긴 메모, 빈 목록, 에러 상태를 확인한다.
9. 완료 후 사용자가 확인할 수 있는 시나리오 3개를 남긴다.

## 위험도 UI 기준

> 기준 원본은 `docs/plan.md` §4. 수치가 다르면 plan.md가 정답이고, 변경은 plan.md 먼저 고친 뒤 세션 문서에 반영한다.

## 완료 기준

- MVP 화면이 모바일에서 깨지지 않는다.
- 주요 버튼의 터치 영역이 44px 이상이다.
- 원본 전화번호가 UI에 노출되지 않는다.
- 위험 조건에서 경고 배너가 표시된다.
- 위험 조건이 아니면 경고 배너가 표시되지 않는다.
- loading, error, empty 상태가 존재한다.
- 빌드가 통과한다.