# Code Review P0/P1 분류 패턴 — 14일차 리뷰

> 외부 리뷰어가 ShowUp 코드를 검토한 결과를 타당성 검증 후 분류한 패턴.
> 향후 유사 Firebase + React SPA 프로젝트에서 사전 점검 체크리스트로 사용.

## P0 — 반드시 수정 (타당)

### 1. SPA 라우트 경로 불일치
- **증상**: `<Link to={`/customers/${id}`}>` — 보호 라우트는 `/app/customers/:id`인데 `/customers/:id`로 링크
- **결과**: NotFound 페이지로 이동, 핵심 기능 차단
- **검증**: `grep -rn "to={\`/" src/pages/ | grep -v "/app/"` — `/app` 접두사 없는 Link 전수 확인

### 2. Modal footer가 form 밖에 있어 submit 안 됨
- **증상**: `<Modal footer={<Button type="submit">}>` — Modal 컴포넌트가 footer를 form 밖에 렌더링
- **결과**: 사건 기록 저장 실패, 위험도 갱신 실패, 경고 배너 동작 실패
- **해결**: `<form id="incident-form">` + `<Button type="submit" form="incident-form">` — HTML5 `form` 속성으로 연결

### 3. 중복 고객 검사 로직 깨짐
- **증상 1**: 마스킹된 번호(`0105678`)와 원본(`01012345678`)을 문자열 비교 — 같을 수 없음
- **증상 2**: `await checkDuplicate()` 후 `if (existingCustomer)` — React state가 즉시 반영되지 않아 항상 null
- **해결**: `checkDuplicate`가 결과를 반환하게 하고, `onSubmit`에서 직접 검사: `const existing = await findCustomerByPhone(...); if (existing) { setExistingCustomer(existing); return }`

## P1 — 수정 권장 (타당)

### Firestore 복합 인덱스 누락
- `getTopRiskyCustomers()`: `orderBy('riskStats.score', 'desc'), orderBy('createdAt', 'desc')` — 인덱스 없음
- `firestore.indexes.json`에 customers 복합 인덱스 추가 필요

### noEmit: false로 .js 파일 생성
- `tsconfig.app.json`의 `noEmit`이 false → `tsc -b`가 `src/**/*.js` 생성
- Vite가 오래된 .js를 모듈로 읽을 수 있음
- **해결**: `noEmit: true`로 변경, 기존 .js 파일 삭제

### 오류를 빈 상태로 숨김
- `catch` 블록에서 `setResults([])`만 하고 에러를 무시 → 사용자가 "데이터 없음"과 "서버 오류"를 구분 못 함
- **해결**: `const [error, setError] = useState<string | null>(null)` 추가, catch에서 `setError()`

### 테스트 명령 경로 불일치
- `package.json`의 `test:security`가 `.cjs` 파일을 가리키지만 실제는 `.mjs` + `.gitignore`로 추적 안 됨
- **해결**: 경로 수정 + `.mjs`를 git 추적 대상으로 변경

## 어쩔 수 없음 (MVP/Firestore 한계)

| 항목 | 이유 |
|------|------|
| riskStats 클라이언트 조작 가능 | Spark 요금제 → Cloud Functions 배포 불가, TODO 명시 |
| 원본 전화번호 브라우저 전달 | Firestore Rules 필드 단위 read 제한 미지원 |
| 개인정보처리방침/약관 미완성 | Phase 2 범위 |

## 놔둘 것 (P2~P3)

- N+1 조회, 대시보드 중복 조회 — MVP 규모에서 문제 없음
- Modal 접근성 — 데모 단계 비필수
- strict: false — 현재 타입 오류 없음
- 데모 계정 비밀번호 공개 — 의도적, 종료 후 비활성화