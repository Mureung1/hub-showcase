# 알바노트 컨벤션과 커밋 로그 규칙

## 1. 기본 원칙

- 코드는 읽는 사람이 기능의 의도를 빠르게 이해할 수 있게 작성한다.
- 기능별 코드는 가능한 한 해당 `features` 또는 `modules` 폴더 안에 둔다.
- 공통으로 재사용되는 코드만 `shared` 또는 `common`으로 이동한다.
- 구현 전에 `Architecture.md`, `Design.md`, `StructureAndLibraries.md`를 확인한다.
- `any` 타입은 사용하지 않는다.
- 외부 UI 라이브러리는 별도 합의 전까지 사용하지 않는다.

## 2. 네이밍 규칙

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| React 컴포넌트 | PascalCase | `WorkerDashboardPage` |
| TypeScript 타입/인터페이스 | PascalCase | `SubstituteRequestStatus` |
| 함수 | camelCase | `createSubstituteRequest` |
| 변수 | camelCase | `selectedStoreId` |
| 상수 | UPPER_SNAKE_CASE | `REQUEST_STATUS` |
| 파일명: 컴포넌트 | PascalCase | `WorkerDashboardPage.tsx` |
| 파일명: 일반 TS | camelCase 또는 역할명 | `scheduleService.ts` |
| CSS 클래스 | kebab-case | `calendar-card` |
| API URL | kebab-case | `/substitute-requests` |

## 3. Frontend 코드 규칙

- 페이지 컴포넌트는 `pages`에 둔다.
- 기능 전용 컴포넌트, 훅, API 함수는 해당 `features` 폴더에 둔다.
- 여러 기능에서 함께 쓰는 컴포넌트와 유틸만 `shared`에 둔다.
- 서버 데이터는 추후 `@tanstack/react-query`를 기준으로 관리한다.
- 폼은 추후 `react-hook-form`과 `zod` 조합을 기준으로 관리한다.
- 디자인은 `docs/Design.md`의 색상, 폰트, 여백, 카드 규칙을 따른다.
- 화면에 불필요한 설명 문구를 많이 넣지 않고, 정보 밀도를 깔끔하게 유지한다.

## 4. Backend 코드 규칙

- 기능별 API는 `modules` 안에 둔다.
- 기본 흐름은 `routes -> controller -> service -> repository`를 따른다.
- `controller`는 요청/응답과 검증을 담당한다.
- `service`는 비즈니스 규칙과 상태 변경을 담당한다.
- `repository`는 DB 접근만 담당한다.
- 환경 변수는 `common/config`에서만 직접 읽는다.
- 권한 검사는 프론트엔드 표시 제어와 별개로 백엔드에서 반드시 다시 확인한다.

## 5. 커밋 메시지 형식

커밋 메시지는 다음 형식을 사용한다.

```txt
type: subject
```

예시:

```txt
feat: 공개 대타 요청 등록 API 추가
fix: 근무표 날짜 표시 오류 수정
docs: 디렉토리 구조 결정 문서 추가
```

## 6. 커밋 타입

| 타입 | 의미 | 예시 |
| --- | --- | --- |
| `feat` | 새로운 기능 추가 | `feat: 대타 요청 목록 화면 추가` |
| `fix` | 버그 수정 | `fix: 일간 근무표 이동 오류 수정` |
| `refactor` | 동작 변화 없는 코드 개선 | `refactor: 대타 요청 상태 계산 분리` |
| `docs` | 문서 수정 | `docs: 커밋 규칙 문서화` |
| `style` | 포맷팅, CSS 등 스타일 수정 | `style: 카드 여백 조정` |
| `test` | 테스트 추가/수정 | `test: 대타 신청 상태 전이 테스트 추가` |
| `chore` | 설정, 빌드, 패키지 관리 | `chore: 라우터 라이브러리 설치` |

## 7. 커밋 작성 규칙

- 제목은 한 줄로 작성한다.
- 제목 끝에 마침표를 붙이지 않는다.
- 가능한 한 한 커밋에는 하나의 목적만 담는다.
- 기능 구현과 문서 수정이 명확히 분리되면 커밋도 분리한다.
- 커밋 제목은 한국어로 작성한다.
- 타입은 영어 소문자로 작성한다.

## 8. 좋은 커밋 예시

```txt
feat: 근무표 월간 조회 화면 추가
feat: 공개 대타 요청 신청 API 추가
fix: 승인 대기 상태 배지 색상 수정
refactor: 급여 계산 로직을 strategy로 분리
docs: 아키텍처 패턴 설명 보강
chore: 프론트엔드 라우팅 라이브러리 추가
```

## 9. 피해야 할 커밋 예시

```txt
수정
작업함
feat: 이것저것 추가
fix: 버그 수정.
update: 코드 변경
```

이런 메시지는 변경 목적이 불명확하므로 사용하지 않는다.
