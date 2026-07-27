# 보안

마지막 업데이트: 2026-07-27

## 이 문서의 목적

코드로 확인된 입력 검증, 비밀 관리, 개인정보 경계와 운영상 확인 항목을 정리한다.

## 빠른 요약

API는 strict JSON 계약과 in-memory rate limit을 적용한다. Gemini/DB/Voyage secret은 환경 변수로 읽고 클라이언트에 노출하는 코드가 없다. 사용자 메시지 원문은 DB schema의 generation/interaction 행에 저장되지 않는다.

## 구현된 통제

|영역|구현 근거|설명|
|---|---|---|
|요청 검증|`src/shared/generation/contracts.ts`, `src/shared/interaction/contracts.ts`|허용 키, enum, 길이, 조건부 필드를 검사|
|서버 재검증|`api/_lib/generation/handler.ts`, `api/_lib/interaction/handler.ts`|POST/JSON/계약을 다시 검증|
|출력 안전성|`createGenerationResponse` 및 `unsafeExpression` in `src/shared/generation/contracts.ts`|공격 표현·빈값·길이·톤 중복을 거부|
|제한|`api/_lib/generation/rateLimiter.ts`|IP 헤더 기반 키당 기본 10회/60초|
|secret 분리|`.env.example`, `.gitignore`, `api/_lib/generation/geminiProvider.ts`|키는 `process.env`; env 파일은 ignore|
|원문 비저장 매핑|`api/_lib/db/repositories.ts`, `api/_lib/db/schema.ts`|generation/event row에 메시지·상황 본문 열 없음|
|브라우저 임시 보관|`src/pages/message-flow/MessageFlow.tsx`|`sessionStorage` key `dabnyangi:flow`, TTL 30분|

## 인증/인가

인증, 사용자 계정, 권한 모델은 API와 schema에서 발견되지 않았다. 따라서 API는 현재 코드상 공개 endpoint로 취급해야 하며, 외부 경계의 인증/WAF 여부는 별도 확인이 필요하다.

## 민감 데이터 처리 지점

- `receivedMessage`, `situation`, 이메일 상세 값은 클라이언트 상태와 sessionStorage에 존재한다.
- `manual_ai`/`guided_ai`는 `/api/generate`를 거쳐 Gemini provider에 전달될 수 있다.
- DB repository mapper는 원문이 아닌 enum/상태/지연시간 등의 메타데이터만 구성한다.

## 권장 보안 체크리스트

- [ ] Vercel의 `GEMINI_API_KEY`, `DATABASE_URL`, `VOYAGE_API_KEY` scope와 rotation을 확인한다.
- [ ] production에서 IP forwarding header의 신뢰 경계를 확인한다.
- [ ] rate limit을 다중 인스턴스에서도 강제해야 하는지 검토한다.
- [ ] 데이터 보존·삭제·접근권한 및 provider 전송 고지를 검토한다.
- [ ] dependency vulnerability scan과 secret scanning의 실제 활성화를 확인한다.

## 근거

위 표의 각 파일 및 `.gitignore`.

## 주의사항/함정

in-memory limiter는 프로세스 재시작과 인스턴스 확장에 걸쳐 공유되지 않는다. sessionStorage는 같은 브라우저 탭에서 접근 가능하므로 민감한 원문을 불필요하게 입력하지 않도록 UX 고지가 필요할 수 있다.

## TODO/확인 필요

- TLS, CSP, CORS, CSP nonce, DB encryption, secret manager, 보안 incident 절차는 확인 필요.
