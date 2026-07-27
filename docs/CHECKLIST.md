# 기능 개발 체크리스트 (의존성 순서)

> 구현 항목의 **완료 체크는 이 문서가 단일 기준**이다 — PLAN.md는 주차 일정 매핑용이며 주차 결산 시에만 갱신한다.
> 순서 규칙: 각 항목은 자신보다 앞 번호(의존 열에 명시된 항목)에만 의존한다. 의존이 겹치지 않는 항목은 병렬 진행 가능.
> 모든 코드 항목은 해당 항목의 테스트 작성·통과까지 포함해야 완료다 (AGENTS.md: 테스트 없이 완료 선언 금지).
> 신규 항목은 기존 T번호 참조(문서·스킬)를 깨지 않도록 끝번호 T25~T27로 부여했다 — 번호 순서가 아니라 의존 열이 진행 순서다. 변경 이력·근거는 docs/LOG.md 참고.

## 0단계 — 기반 (모든 것의 선행)

- [x] **T1. Vitest + React Testing Library 도입** — 의존: 없음. 테스트 규칙 이행의 전제. 완료(jsdom 환경, `npm test` 스크립트, 스모크 테스트 1건)
- [x] **T2. 시나리오·톤·목적·상황카드 상수/타입 정의** — 의존: 없음. SPEC 1장 확정값(시나리오 4개 id·카드 문구, 공통 톤 라벨 3단계, 목적 6개, 상황 카드 9개) 그대로, `any` 금지. 완료(`src/domain/message.ts`, 카탈로그 단위 테스트)
- [x] **T3. 생성 API 계약 타입 정의** — 의존: T2. SPEC 2장 요청/응답/오류 스키마 (목·프록시·UI가 전부 이 타입을 씀). 완료(`src/services/generation/contracts.ts`, 구조화 응답 런타임 검증 테스트)
- [x] **T4. 목(mock) 생성 모듈** — 의존: T3. 계약 구현 + 강제 케이스 스위치(normal / delay 25초 / error500 / error429). 완료(`src/services/generation/mockGenerator.ts`, 강제 케이스 테스트)

## 1단계 — 화면 골격 (사용자 흐름 순서)

- [x] **T5. step 상태 관리** — 의존: T2. `mode | scenario | input | result` 전환 + sessionStorage 보존(카톡 전환 리로드 대응). 완료(세션 복원·관계 변경·초기화 테스트)
- [x] **T27. S0 답장/먼저 연락 선택 화면** — 의존: T2, T5. 큰 선택지 2개, 진입점(뒤로가기 없음). 선택 결과가 이후 S2 필드 구성을 결정 (SCREENS S0). 완료(App 흐름 테스트)
- [x] **T6. S1 시나리오 선택 화면** — 의존: T2, T5, T27. 카드 4개 + "← 방식 다시 고르기"(S0 복귀), DESIGN.md 토큰(tertiary 단일 액센트). 완료(도메인 카탈로그·App 흐름 테스트)
- [x] **T7. S2 상황 선택 화면** — 의존: T2, T5, T27. **S2-a(기본)**: 상황 카드 6개(시나리오당 공통5+특화1, SPEC 1장 taxonomy로 렌더 — 실제 템플릿 문구는 T25 완료 전까지 목(mock) 텍스트로 대체) + "직접 설명할게요" 이탈 버튼, 카드 탭 시 템플릿 즉시 조회 후 S3 전환(로딩 없음). **S2-b(이탈)**: 목적 칩 6개(필수) + 모드별 필드(답장: 받은 메시지 필수·상황 설명 선택 / 먼저 연락: 상황 설명만 필수, 500/300자)+남은 글자 수, 개인정보 안내, 버튼 활성 조건·미충족 안내. 모드 변경 시 입력 초기화 (EDGE_CASES 1-1). 완료(App 흐름·입력 검증 테스트)
- [x] **T8. 생성 요청 파이프라인** — 의존: T4, T7. S2-a(카드)→템플릿 동기 조회→S3 즉시 전환(로딩 없음) / S2-b(직접 설명)→목 호출→S3 전환. 로딩(스켈레톤+문구 로테이션, UX.md)/실패/429/20초 타임아웃 상태(S2-b만 해당) — 목의 강제 케이스로 검증. 완료(목 정상·429·500·25초 지연, UI 입력 보존·타임아웃 테스트)
- [x] **T9. S3 결과 화면** — 의존: T8. 톤 배지 후보 3카드, toneLevel 오름차순 배치(기본이 맨 위). 완료(템플릿·목 응답 후보 3개와 공통 톤 라벨 테스트)
- [x] **T10. 복사 기능** — 의존: T9. 공통 성공 피드백은 버튼 "복사됨" 1.5초 상태 전환, 실패 시 텍스트 자동 선택 폴백. 자리 표시자가 있으면 "복사 후 빈칸 채우기"와 후속 안내. 접근 가능한 live 피드백 테스트 포함. 앱 토스트는 기본 요구하지 않고 T23의 플랫폼별 시스템 피드백 확인 뒤 필요할 때만 추가 (UX.md 4장). 완료(성공 전환·1.5초 원복·`role="status"` 안내·자리 표시자 지속 안내·리롤 초기화·폴백 테스트 + 실브라우저 클립보드 검증)
- [x] **T11. 플레이스홀더 감지** — 의존: T9. `[...]`·`OO` 패턴 하이라이트 + "빈칸을 채워주세요" 배지. 완료(본문 강조·배지 렌더 테스트)
- [x] **T12. 재시도 동선** — 의존: T9. 템플릿은 "내 상황에 더 맞추기"→S2-b, AI는 "다시 만들기"→같은 입력 즉시 리롤. 보조 복귀 라벨은 템플릿의 "상황 다시 고르기"→S2-a, AI의 "입력 내용 수정하기"→입력 보존 S2-b로 구분. 리롤 중 상태 + 실패 시 기존 후보 유지 테스트. 완료(source별 라벨·동선 분리, 리롤 중 비활성, 실패 시 후보 유지 테스트 5개 + 실브라우저 동선 검증)
- [x] **T13. 이동 규칙** — 의존: T6, T9, T27. 모드 변경(입력 초기화, S0 복귀) + 시나리오 변경(입력 유지·결과 폐기) + S2-a↔S2-b 이동("직접 설명할게요"·"← 자주 쓰는 상황에서 고르기") + "처음으로"(S0로 전체 초기화). 완료(같은 모드 재선택 입력 유지·모드 변경 초기화+관계 유지·시나리오 변경 결과 폐기 테스트 3개 + 실브라우저 왕복 검증)
- [x] **T14. 모바일·접근성 마감** — 의존: T6~T13, T27 전부. 375×667에서 S0 선택 2개 초기 노출, 320×568 무가로넘침, 상황 카드 2열, 키보드+sticky CTA+safe area. 답장 카드/원문 반영 기대 문구, 실제 provider 진행을 가장하지 않는 대기 문구, 내부 S0~S3 비노출, 단계 초점·스크롤, 44px, AA 대비, `aria-pressed`·legend·`aria-busy`, 전체 `:focus-visible`, reduced motion, 동일 결과 카드 표면, 긴 문장 줄바꿈, 입력 삭제 동선 지속 노출 검증. 완료(간극 15개 수정 + 테스트 5개 + 실브라우저 전수: 320 무넘침·2열, 대비 실측 CTA 4.69/muted 5.27/배지 6.25, 단일 결과 표면, 44px, 키보드 순회·초점 이동)
- [x] **T28. 가이드형 챗 UI 전환** — 의존: T2, T5, T7~T14, T27. 내부 S0~S3·생성 계약은 유지하면서 냥이 헤더, 발자국형 진행 표시, 이전 선택 사용자 말풍선, 냥이 질문, 빠른 답변, 결과 3개 말 꾸러미로 표현한다. 선택 턴 AI 호출·전체 자유 대화·히스토리 저장·새 UI 라이브러리는 도입하지 않는다. 375×667에서 헤더·첫 질문·첫 선택지가 보이고, 320×568 무가로넘침, 화자 텍스트 구분, 단계 초점·키보드·reduced motion, 기존 템플릿/AI/복사/실패/이동 회귀 테스트를 통과해야 완료. 완료(2026-07-15: 가이드 UI 구현, 전체 69개 테스트·lint·build·diff 통과, 사용자 직접 모바일·키보드·reduced-motion 검증 완료 확인)
- [x] **T29. Three.js 냥이 캐릭터 스테이지** — 의존: T28 구현·자동검증 + 사용자 제공 캐릭터 에셋. Three.js·React Three Fiber를 사용하되 전체 앱에 Canvas 1개만 두고 `idle | selected | generating | result` 상태 반응만 구현한다. 관계 카드 네 냥이는 정적 썸네일을 사용하고, DOM UI·냥이 이름/상태 텍스트를 유지한다. `prefers-reduced-motion`, WebGL 초기화/렌더 오류, 저사양·에셋 미제공은 정적 이미지 또는 `냥` 배지로 폴백한다. 완료(2026-07-15: 브랜드 패널 단일 지연 Canvas, 4상태, 관계별 정적 아바타·전신·생성 중 생각냥, 정적/reduced-motion/오류 폴백, 런타임 투명 WebP 512,178 bytes로 PNG 대비 92.7% 감축, 전체 69개 테스트·lint·build·diff 통과, 사용자 직접 320×568·375×667·WebGL·DOM 비차단·reduced-motion 검증 완료 확인. 원시 수동 검증 자료는 미보관)

## 2단계 — 콘텐츠 (코드와 병행 가능 — 언제든 착수)

- [x] **T15. 시드 1차 12개 재검수** — 의존: 코드 없음(SPEC 4장만). 2026-07-11 감사에서 G-B 내용 변화와 P-A 행동 단정이 발견되어 완료를 다시 열었다. `/seed`로 수정 후 사실 근거·세트 내용 동일성 자체 스크리닝 재통과 필요. 완료(2026-07-12 G-B tone3 선택 요청 복원·P-A 첨부 단정 제거 후 12개 자체 스크리닝 재통과, 검수지 재생성)
- [x] **T16. 시드 2차 12개 + 24개 전수 검수** — 의존: T15. 완료(2026-07-20: 24개 자체 스크리닝 재통과에 이어 제3자 블라인드 정렬 8/8·전송 가능성 24/24 완료를 사용자가 승인. 검수자 식별정보·원시 검수지는 저장소에 보관하지 않음). `decline` 목적 0건은 holdout/프롬프트 검수에서 보완

## 2.5단계 — 하이브리드 생성

> T25는 T7의 목 텍스트 UI 골격이 아니라 T26의 실제 템플릿 경로 선행 조건이다. T7은 목 텍스트로 완료할 수 있고, T26 전에는 T25 작성·검수가 끝나야 한다 — PLAN.md 주차 매핑 참고.

- [x] **T25. 상황 카드 템플릿 288개 작성·전수 검수** — 의존: 코드 없음(SPEC 1·4장). 4관계×6상황×4말투×3톤 초안(`src/entities/message/situationTemplates.ts`)을 사용자가 반복 검토했다. 한국어 관계 맥락 평가자 2명(김도엽·진현지) 독립 검수 결과: hard fail 0/288, 톤 블라인드 정렬 96/96, 그대로 전송 가능 231/288(80.2%, 합격선 충족), 하위 관계 호환 288/288 — SPEC 4장 합격선 전부 통과(2026-07-21, 사용자 보고). 검수자 식별정보 외 원시 채점표는 T16과 동일 방침으로 저장소에 별도 보관하지 않는다
- [x] **T26. 결정적 템플릿 엔진·fallback** — 의존: T3, T8, T25. `template_fallback` route가 API 호출 없이 `scenarioId × situationId × speechStyleId`로 tone 3개를 즉시 반환하고 T34 guided AI 실패에서도 같은 카드를 안전하게 제공한다. 완료(2026-07-22: 24개 의미 프레임→12개 말투×톤 규칙→96세트·288문구 결정적 컴파일, T25 검수 원문 byte 동일성, approved manifest·SHA-256 checksum·provenance, Git 산출물 drift 검사, DB metadata-only 승인 경계, 생성 API 0회·guided timeout/429/500 동일 키 fallback·manual/취소 비fallback을 전체 365개 테스트로 검증)

## 3단계 — 실 연동 · 마감

- [x] **T17. 실행 환경·Vercel 세팅 + 목 1차 배포** — 의존: T14. Node 22.12.0 고정·로컬 전체 검증, Vercel Git 연동·Production Branch·비프로덕션 Preview 배포 확인. 공개 Production·Preview S0 실물 확인 완료(사용자 확인, 2026-07-21). `ci.yml`은 사용자 지시에 따라 로컬 전용으로 유지하고 공유 저장소에는 추적·업로드하지 않는다(`.gitignore` 원복). 절차와 근거는 docs/CICD.md·T17 하네스
- [x] **T18. 프록시 함수 `/api/generate` 기반** — 의존: T3. Vercel 표준 fetch 진입점과 provider/limiter/metrics 주입형 핸들러를 두고, AI 직접입력 요청 검증, 서비스 원문 비저장, 콘텐츠 없는 운영 메타데이터, 서버 deadline+`AbortController`, 출력 토큰 상한, 제한 재시도, 오류 매핑, 10회/60초 레이트리밋을 구현한다. `api/` 전용 TypeScript 설정과 fake provider 핸들러 테스트로 클라이언트 빌드 밖 서버 코드도 검증한다. 완료(2026-07-20: provider 비종속 서버 경계, 18초 취소, 출력 상한 1024, 재시도·공개 오류 정규화, 원문 없는 메타데이터 타입과 자동검증 통과). 실 provider client·키·프롬프트 structured output·Preview 왕복은 T20이 소유하며, 무참여자 벤치마크는 백엔드 기반 구현이 아니라 실 provider 품질·출시 판정의 gate로 유지한다
- [x] **T19. 프롬프트 구성** — 의존: T16, T18. 서버 전용 관계·목적·개인 말투·안전 규칙, 사용자/예시 XML 데이터 블록 격리, `output_config.format` JSON Schema, `end_turn`·공용 런타임 검증을 구현한다. 완료(2026-07-20: 제3자 검수 승인 시드 24개를 4관계×2세트×3톤 typed 카탈로그로 이관하고 `buildPromptWithReviewedExamples`로 관계별 자동 조립. 관련 5파일 38개·전체 24파일 225개 테스트, API 타입검사, lint, build 통과). 데이터 블록은 주입 완화책이며 실제 provider 연결·Preview 검증은 T20 범위다
- [x] **T20. 목→실 provider 전환** — 의존: T8, T17, T19. 서버 전용 provider client(Gemini `generateContent`)와 키 환경변수(`GEMINI_API_KEY`)를 프롬프트 structured output(`generationConfig.responseSchema`)에 연결하고 AI 경로를 HTTP `/api/generate`로 전환했다. Vercel Preview에서 실제 키로 정상 왕복을 사용자가 확인(2026-07-21). provider 전송 고지는 SPEC 2장에 반영, ZDR 등 확인 안 된 보존 조건은 주장하지 않음. 무참여자 벤치마크의 `Provisional Go`·출시 판정은 T21 이후 계속 별도로 다룬다
- [x] **T21. holdout 모델·품질 검수** — 의존: T20. 시드와 겹치지 않는 20개(시나리오당 5, groupwork·거절·500자 근접·상충 지시·공격/강요·사실 추가 위험 포함)를 `gemini-3.1-flash-lite`로 생성해 블라인드 채점했다. 한국어 맥락 평가자 2명(사용자 포함) 독립 채점 결과 톤 정렬 일치·전송 가능성 판정·환각 0건 모두 SPEC 5장 합격선을 통과(2026-07-21). 상세 근거: [T21 계획서·검증](../harness/tasks/T21-holdout-quality/plan.md)
- [ ] △ **T22. 후속 외부 가치 검증** (보류 — 2026-07-23 사용자 결정으로 대학생 5명 과업 미실행) — 의존: T21. COMPETITIVE_VALIDATION의 가상 과업·교차 배정·E2E 시간·입력·수정량·`authorship_fit_1_5`·블라인드 검수를 사용한다. 평소 ChatGPT/Gemini와 유효한 짝비교를 마친 대학생 5명을 확보하고, 실 AI는 답냥이 단독 과업으로 평가한다. 카드 3/4 이상과 실 AI 1개 무도움 완료 각각 4/5, 카드 원문·탭/provider·복합 관계 이해 각각 4/5와 최종 `Go` 근거를 남긴다. 현재 결과는 `Pending`이며 T23·T31 기술 완료의 의존성이 아니다. T22를 사용자 검증 완료·경쟁 우위 근거로 사용하지 않는다
- [x] **T23. 기술 배포 + 실기기 확인** — 의존: T17, T20, T21, T29, T32, T33, T34, T36. 동일 Production deployment SHA에서 공개 S0, 카드·guided/manual AI·fallback·결과 다듬기·복사, 클라이언트 비밀 비노출을 재검증했다. 전체 44파일 375테스트와 타입·템플릿·DB·lint·build gate, Production HTML·asset·guided/manual 실 API를 통과했고 사용자가 320×568·375×667·모바일 이메일·카카오톡 인앱 복사 네 수동 시나리오를 모두 확인했다(2026-07-23). 기기 버전·원시 캡처는 별도 수집하지 않았으며 T22는 `Pending`, 사용자 검증·경쟁 우위 주장은 금지한다
- [x] **T24. 흐름 계측 운영 검증** — 의존: T10, T17, T36. Production에서 `/api/interaction` same-origin 왕복(202) 확인, `waitUntil()` 실제 DB 반영과 route/scenario/eventName 집계 query를 `scripts/interaction-smoke.ts`로 검증했다. 원문·후보·수정문·IP·user/session/device ID가 schema에 없음을 재확인했다. 보존 기간은 자동 삭제 job이 없어 사실상 무기한임을 정직하게 기록했다(MVP 범위 밖 신규 기능은 추가하지 않음). 상세 근거: [T24 계획서·검증](../harness/tasks/T24-interaction-ops-verification/plan.md)
- [x] **T30. Neon PostgreSQL + Drizzle 데이터 계층** — 의존: T18. `prompt_versions`·`template_versions`·`generation_runs`·`evaluation_runs` schema와 migration·typed repository를 구현한다. 관계/모드/목적 ID, model·버전, status, latency, token, 집계 평가만 허용하고 받은 메시지·상황 설명·생성 문구·IP·영구 사용자 ID 필드는 금지한다. 프롬프트/템플릿 본문은 Git 정본으로 유지하고 DB에는 배포 version/checksum을 연결한다. 브라우저 직접 DB 연결 금지, 환경별 `DATABASE_URL`, 기록 실패가 생성 응답을 막지 않는 best-effort와 원문 비직렬화를 repository·handler 테스트로 검증한다. 완료(2026-07-20: 실제 Neon 개발 DB migration 최초·재실행, public 테이블 4개, 네 repository와 실제 generate handler background sink 기록·조회·자체 행 정리 smoke 통과). Vercel Preview `waitUntil()` 런타임 확인은 T31 통합 범위다
- [x] **T31. 기술 MVP 통합 DoD·최종 배포** — 의존: T23, T29, T30, T34. `beb6cda`의 Vercel Preview·Production에서 실제 UI→`/api/generate` 세 후보와 `waitUntil()` metadata write를 확인했다. 공개 bundle은 로컬 검증본과 바이트 단위로 같고 실제 API 경로·Gemini 안내를 포함하며 mock 안내·대표 mock 후보가 없다. 지정 자연어의 약속 연기·사과 반영, Production `generation_runs status=success`, 전체 테스트·타입·drift·lint·build·하네스 gate를 통과했다(2026-07-24). T35 retrieval은 운영 비활성이고 자율 agent loop·런타임 멀티에이전트는 없으며, T22 외부 가치 검증은 `Pending`으로 별도 유지한다
- [x] **T32. 개인 말투 프리셋** — 의존: T3, T8. `습니다체 / 요체 / 이다체 / 용용체`를 기존 toneLevel 세 후보와 별도 축으로 제공한다. 직접 설명은 명시 선택을 필수로 하고, 카드는 저장 선호가 없을 때 관계 안전 기본값으로 즉시 조회한다. 명시 선호의 30분 탭 보존·관계 이동 유지, 오염·구세션·전체 초기화, 정적 S3의 API 없는 네 말투 전환, AI S3 비노출, T26 승인 288문구 drift, 모바일·키보드·접근성을 검증했다. 완료(2026-07-22: 전체 43파일 367테스트와 타입검사·lint·build·drift 통과, 320×568·375×667·키보드 수동 확인은 사용자 완료 확인)
- [x] **T33. 교수·조교 이메일 형식** — 의존: T3, T5, T7~T10. 교수·조교 관계에만 `메신저 / 이메일` 연락 형식을 추가한다. 이메일은 습니다체 고정, 전용 6상황과 안내 입력을 거쳐 제목·본문이 분리된 정적 3후보(총 18후보)를 제공하고 제목·본문·전체 복사를 지원한다. 메신저 288문구와 AI 요청/응답·provider/DB는 변경하지 않는다. 세션 복원·초기화, 개인정보의 현재 탭 30분 한정, 콘텐츠 사람 검토, 320/375·키보드·접근성을 검증했다. 완료(2026-07-22: 관련 94개·전체 368개 테스트와 타입·템플릿·lint·build 게이트 통과, 사용자가 18후보 문구와 320×568·375×667·모바일 키보드·카카오톡 인앱 복사 폴백 확인 완료)
- [x] **T34. 카드별 guided context 생성 흐름** — 의존: T2, T3, T5, T7~T9, T12, T18, T19, T32 코드 기반. 4관계×6카드마다 질문 정확히 1개·option 3개의 stable ID 카탈로그를 두고 `template_fallback | guided_ai | manual_ai` discriminated union을 구현한다. 카드→질문 답변 탭 즉시 guided AI 세 톤, 질문 없이 바로 기본 초안, 직접 설명 병렬 경로를 제공한다. 서버는 ID를 정본 카탈로그로 해석하고 label·transcript·원문을 guided prompt에 넣지 않는다. guided 실패는 같은 카드 템플릿과 세부 답 미반영 안내로 fallback한다. 24조합 coverage·invalid ID·API 호출 수·session·이메일/직접 설명 회귀·320/375·키보드·live status·전체 품질 gate를 통과했다. 완료(2026-07-22: Production `guided_ai` HTTP 200·tone 1/2/3 반환, 전체 43파일 369테스트와 타입·템플릿·DB·lint·build 게이트 통과, 사용자가 24질문·72옵션 문구와 320×568·375×667·키보드·스크린리더 확인 완료)
- [ ] **T35. 검수 예시 retrieval offline 실험** — 의존: T16, T19, T30, T34 공유 계약. Git 예시에 stable ID/catalog version/mode를 추가하고 metadata-only `retrieval_examples` additive migration, Voyage document/query embedding adapter, 관계·목적·모드 hard filter+pgvector exact cosine top-2, checksum 복원, idempotent ingestion, static fallback, coverage activation guard와 합성 offline A/B evaluator를 구현한다. 사용자 원문·예시 본문·생성문구·query vector를 DB·로그·metric에 저장하지 않는다. 운영 `/api/generate`는 static selector를 유지하며 ANN·reranker·agent loop는 제외한다. 실제 Voyage·Neon guarded smoke와 coverage 충분 corpus 평가 전에는 완료·우위·운영 활성화를 주장하지 않는다
- [x] **T36. 결과 중심 초안 다듬기·비식별 흐름 계측** — 의존: T9, T10, T12, T18, T30, T34 공유 계약. S0~S2와 세 생성 route를 유지하고 S3에서 같은 카드 질문을 인라인으로 열어 기존 후보를 보며 AI로 전환한다. 성공 시에만 직전 1세트를 탭에서 비교·복원하고 후보 로컬 수정·원문 복원을 제공한다. stale 요청 취소, 반복 이동·접근성·카피를 바로잡고, `result_shown/refinement_opened/regeneration_requested/copy_succeeded/situation_change`만 원문·후보·IP·user/session ID 없이 best-effort API·DB에 기록한다. 4탭 결과 도달, 실패 시 후보 보존, 수정문 비전송, strict event/schema, 기존 흐름 회귀와 320/375를 검증한다

## PLAN.md 주차 매핑

| 주차 | 항목 |
|---|---|
| 1주차 (7/7~7/13) | T1~T8, T15, T27 |
| 2주차 (7/14~7/20) | T9~T14, T16, T25~T26, T28 |
| 3주차 (7/21~7/27) | T17~T24, T29~T36 |

병렬 힌트: T15~T16(시드)·T25(상황 카드 템플릿)는 코드와 독립 — 자투리 시간에 진행. T7은 T25 완료 전에도 목 텍스트로 착수 가능(T4 목 모듈과 같은 패턴). T26(라우터)은 T25 실제 콘텐츠가 있어야 목→실 전환이 의미 있다.
