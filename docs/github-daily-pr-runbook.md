# Modu Brain 2주 일별 실행·PR 런북 — 압축본

기준: 2026-07-13 KST · 다음 10개 평일(2026-07-14~07-27) · 시작점 "N031-2026-07-13-modu-brain-hardening" / "b3b7ac9b" / 조직 PR "#938". 실행할 때는 이 값을 믿지 말고 git status와 원격 PR을 먼저 재확인한다.

## 목표와 고정 경계

문제: 대학생 팀의 기록에는 결론만 남아 결정 이유·관점·미결 질문이 흩어지고, 같은 설명과 재작업이 반복된다.

- 1주 결과: 로컬 FE–BE–DB 인증 왕복, 10개 migration, RLS/IDOR, 보관·공유 계약을 실제 검증한다.
- 2주 결과: 결정·이유·정확한 근거·비교·지식맵·공유를 새로고침까지 잇고 release candidate를 고정한다.
- 60초 시연: 프로젝트 생성 → 기록 저장 → 로컬 분석 → 결정 이유 → 정확한 인용 → 새로고침 후 동일 결과.
- 기본 모드: 코드·테스트·문서·로컬 커밋과 GitHub 일일 PR까지 허용한다. Render/Sites 배포, 원격 Supabase 변경, 유료 OpenAI 호출은 금지한다.
- 제외: 팀 초대, 직접 OAuth, 결제, 실시간 협업, 작업 큐, 임의 두 실행 비교, 자동 외부 쓰기 Agent.

## 토큰 절약 규칙

1. 아래에서 **오늘 블록 하나만** 새 대화에 붙인다. 계획을 다시 설명시키지 않는다.
2. 명시된 파일과 git diff만 먼저 읽고 기존 endpoint/table/component를 재사용한다. 광범위한 웹 조사와 무관한 리팩터링은 하지 않는다.
3. 이미 구현됐으면 재작성하지 말고 계약 공백·회귀 테스트·사용자 실패 복구만 닫는다.
4. 평일에는 표적 테스트만, D05·D10에 전체 게이트를 실행한다. 같은 실패를 세 번 반복하지 않는다.
5. 서브에이전트는 최대 1명만 범위 반대 검토 또는 독립 검증에 쓰고 같은 저장소 탐색을 중복시키지 않는다.
6. 매일 검증 통과 변경만 1커밋으로 묶고, 이 문서의 실행 기록 한 줄을 갱신한다.
7. 최종 보고는 "결과 / 검증 / 커밋·PR / 남은 위험 / 다음 날" 5줄 이내로 한다.

## 일일 GitHub 안전 절차

- 당일 head 이름은 "N031-YYYY-MM-DD-modu-brain-주제"로 하고 **사용자 fork에만** push한다. PR은 "connect-AIAgentChallenge-26-1/hub:main"에 만든다.
- 새 PR이 OPEN이고 base·head·fork 소유자가 맞는지 확인한 뒤에만 직전 내 PR을 close한다. 생성·검증 실패 시 기존 PR을 유지한다.
- force push, 브랜치 삭제, 자동 병합, 배포, 원격 DB 변경은 하지 않는다. CI 승인 권한이 없으면 코드 실패와 구분해 기록한다.
- 검증 서브에이전트는 로컬 증거만 반환하고 GitHub write를 하지 않는다. PASS 뒤 루트 작업자만 push·PR·close를 수행한다.
- 작업 블록 끝에 사용자가 "LOCAL ONLY"를 붙이면 커밋까지만 하고 push·PR·close를 생략한다.

## D01 · 07-14 화 · P0 기준선과 CI 진실

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. 명시된 범위만 구현하고 표적 검증을 실행하라. git/PR #938/10개 migration 상태를 재확인하고 package.json, .github/workflows/modu-brain-quality.yml, docs/security-release-checklist.md만 우선 읽어라. lint·typecheck·migration drift에서 재현되는 실패만 고치고 외부 승인 대기는 코드 실패와 분리하라. AC: 작업트리 보존, 로컬 10개 ledger 일치, 정적 게이트 0 fail. 검증: npm run lint; npm run typecheck; npm run ops:migrations:check; git diff --check. 통과 시 1커밋과 오늘 조직 PR을 만든 뒤 새 PR 검증 후 #938을 close하라. 배포·원격 DB·유료 호출 금지. 실행 기록 D01 갱신, 최종 5줄.
~~~

## D02 · 07-15 수 · P0 로컬 Supabase 왕복

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. 기존 API/table을 유지하고 scripts/run-local-auth-e2e.ps1, supabase/migrations, rollback, tests/database, tests/e2e/authenticated-flow.spec.ts만 우선 보라. Docker가 가능하면 10개 migration 적용→rollback→재적용, pgTAP, 두 사용자 RLS/IDOR 404, 로그인→저장→분석→새로고침을 실제 실행하라. 불가하면 성공을 주장하지 말고 정확한 환경 blocker와 재현 명령을 남기며 코드로 닫을 수 있는 검증 공백만 수정하라. AC: DB 장애는 503이며 memory fallback 없음; 성공 시 auth E2E 1 passed/0 skipped. 검증: .\scripts\run-local-auth-e2e.ps1; npm run ops:migrations:check; git diff --check. local-only 검증 Agent의 PASS 뒤 루트가 1커밋·오늘 PR을 만들고, 새 PR 확인 후 전일 PR을 close하라. 배포·원격 DB 금지. D02 갱신, 최종 5줄.
~~~

## D03 · 07-16 목 · P0 Magic Link·최근 인증

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. server/apiV1.mjs, authSession.mjs, src/services/auth.ts, LoginPage.tsx, TurnstileWidget.tsx와 대응 테스트만 점검하라. 이미 있는 same-origin POST /api/v1/auth/magic-link 계약의 빈틈만 닫아 origin·본문·CAPTCHA·IP/이메일 HMAC 제한, 계정 열거 없는 202, 429 Retry-After, 503, 7일 cookie를 고정하라. evidence 공유·영구 삭제는 10분 최근 인증 없이는 거부되어야 한다. AC: token/JWT/email이 로그·오류에 없음, 우회 경로 없음. 검증: npx vitest run server/authSession.test.mjs server/apiV1.test.mjs src/services/auth.test.ts; npm run typecheck; git diff --check. local-only 검증 Agent의 PASS 뒤 루트가 1커밋·오늘 PR을 만들고, 확인 뒤 전일 PR을 close하라. 원격 Auth 설정·배포 금지. D03 갱신, 최종 5줄.
~~~

## D04 · 07-17 금 · P0 보관·안전 공유

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. 20260713093323 migration, server/moduBrainRepository.mjs, apiV1.mjs, src/utils/shareDisclosure.ts, SharePage.tsx와 테스트만 우선 보라. 30/90/null 보관, 만료 dry-run·batch drain·cascade, summary/evidence 공유, 만료·폐기·조회 제한의 공백을 닫아라. summary에는 이름·원문 제목·정확한 인용·이메일·provider가 없어야 하고 evidence는 최근 인증·민감정보 확인·최대 7일이 필수다. AC: 타 사용자 ID는 404, DB 실패는 503, 폐기 후 resolve 불가. 검증: npx vitest run server/moduBrainRepository.test.mjs server/apiV1.test.mjs src/utils/shareDisclosure.test.ts src/pages/SharePage.test.tsx; npm run ops:migrations:check; git diff --check. local-only 검증 Agent의 PASS 뒤 루트가 1커밋·오늘 PR을 만들고, 확인 뒤 전일 PR을 close하라. 원격 DB 금지. D04 갱신, 최종 5줄.
~~~

## D05 · 07-20 월 · P1 Agent 신뢰성 게이트

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. docs/agent-workflow-contract.md, server/contextAnalysisCore.mjs, analysisResultV2.mjs, providers/openaiContextAnalysis*, AgentExecutionRail, personalData와 eval만 보라. source_snapshot→provider_analysis→evidence_validation→result_persistence 계약, stable ID, 실제 부분 문자열 인용, 이유 부재 명시, prompt injection 무시, 도구 호출 0, PII 전송 미리보기·선택 마스킹을 회귀 고정하라. hidden reasoning은 요청·저장·표시하지 말고 실패 실행이 최근 성공을 덮지 않게 한다. AC: 한국어 fixture 구조·근거 100%, provider 실패·취소 terminal 일치. 검증: npm run test:eval; npx vitest run server/contextAnalysisCore.test.mjs server/analysisResultV2.test.mjs server/providers/openaiContextAnalysis.test.mjs; npm run check; git diff --check. 독립 local-only 검증 Agent 1명의 PASS 뒤 루트가 1커밋·오늘 PR을 만들고, 확인 뒤 전일 PR을 close하라. 유료 호출 금지. D05 갱신, 최종 5줄.
~~~

## D06 · 07-21 화 · P1 결과 우선 지식맵·접근성

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. ProjectPage, KnowledgeMap, EvidenceCoverageBadge, EvidenceDrawer, styles와 대응 테스트만 보라. 새 시각 언어를 만들지 말고 KoPub 돋움·warm paper·Apple식 절제를 유지하며 첫 화면에 분석 요약/결정/근거/변화를 둔다. 지식맵은 graph/list 동등 정보, 형태·아이콘·텍스트 구분, 방향키·Enter·Esc·focus 복귀, 근거 패널, 375px 상하 배치와 가로 스크롤 금지를 만족시켜라. 근거 지표는 validated/eligible, eligible=0은 "근거 미제공"이다. AC: 375/768/1024/1440 회귀, axe critical/serious 0. 검증: npx vitest run src/components/KnowledgeMap.test.tsx src/components/EvidenceDrawer.test.tsx src/components/EvidenceCoverageBadge.test.tsx src/pages/ProjectPage.test.tsx; npx playwright test tests/e2e/accessibility.spec.ts; npm run typecheck; git diff --check. local-only 검증 Agent의 PASS 뒤 루트가 1커밋·오늘 PR을 만들고, 확인 뒤 전일 PR을 close하라. 배포 금지. D06 갱신, 최종 5줄.
~~~

## D07 · 07-22 수 · P1 비교·새로고침 E2E

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. AnalysisHistory, DecisionList, ProjectPage, authenticated-flow.spec.ts와 서버 분석 실행 계약만 보라. 최근 성공과 직전 성공을 stable ID로 비교해 추가·변경·해결을 표시하고 실패/취소 실행은 비교 기준과 최근 성공을 바꾸지 않게 하라. 로그인→프로젝트→기록→분석→이유·정확한 인용→두 번째 분석→변화→공유→새로고침에서 DB 재조회 동일성을 고정하라. 임의 두 실행 비교는 만들지 않는다. AC: reload 전후 결정·이유·quote 동일, 실패 상태에서 복구 CTA. 검증: npx vitest run src/pages/ProjectPage.test.tsx server/apiV1.test.mjs; npx playwright test tests/e2e/authenticated-flow.spec.ts. 환경으로 skip되면 성공이라 하지 말고 D02 blocker와 연결하라. local-only 검증 Agent의 PASS 뒤 루트가 1커밋·오늘 PR을 만들고, 확인 뒤 전일 PR을 close하라. 배포 금지. D07 갱신, 최종 5줄.
~~~

## D08 · 07-23 목 · P2 보안·백업·복원

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. server/security.mjs, server/server.mjs, scripts/ops, encrypted-backup-runbook.md, security-release-checklist.md만 보라. HTML/JS/CSS/API 헤더, CSP unsafe-inline 제거 상태, ready migration drift 503, 비밀정보 scan, age 암호화·Credential Manager 키 분리·7일 순환·임시 DB 복원 계약을 검증하고 재현 가능한 결함만 고쳐라. 운영 DB reset/복원은 절대 하지 않는다. AC: 평문 backup 0, secret/JWT/원문 로그 0, 복원은 임시 DB에서만. 검증: npm run ops:validate; npm run ops:backup:test; npm audit --audit-level=high; npm run build; git diff --check. 실제 도구/키 부재는 환경 대기로 분리한다. local-only 검증 Agent의 PASS 뒤 루트가 1커밋·오늘 PR을 만들고, 확인 뒤 전일 PR을 close하라. 배포·원격 DB 금지. D08 갱신, 최종 5줄.
~~~

## D09 · 07-24 금 · P2 시연 고정·회귀 정리

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. docs/week-2-core-scenario.md, /demo, 공개·인증 Playwright와 design QA만 보라. 기능을 늘리지 말고 사전 기록 3건+기존 분석 1건에서 새 피드백→로컬 분석→이유·근거→변화→지식맵→summary 공유를 6~8분, 핵심 왕복을 60초로 고정하라. 로딩·빈 상태·DB/provider/네트워크 실패마다 정직한 복구 행동을 보이고 sample 성공으로 대체하지 않는다. AC: 375/768/1440 무가로스크롤, axe critical/serious 0, 콘솔 error 0. 검증: npm run test:e2e; npm run typecheck; git diff --check. 필요한 경우 최신 QA 캡처와 시연 체크리스트만 갱신하라. local-only 검증 Agent의 PASS 뒤 루트가 1커밋·오늘 PR을 만들고, 확인 뒤 전일 PR을 close하라. 배포 금지. D09 갱신, 최종 5줄.
~~~

## D10 · 07-27 월 · P2 Release candidate 감사

~~~text
cwd=C:\Users\thats\OneDrive\Desktop\codex project\hub-N031. 새 기능을 추가하지 말고 fresh local-only verification Agent 1명에게 저장소와 이 계획만으로 blocker/P1 반대 검토를 맡겨라. 로컬 10개 migration, API envelope, RLS/IDOR, Auth, 보관, 공유, Agent 근거, 접근성, 백업, 실패 복구를 증거로 재감사하고 구체적 결함만 수정하라. 검증: npm run check; npm run test:e2e; npm audit --audit-level=high; git diff --check; git status --short. AC: coverage S/L>=80, B/F>=75, secret 0, 미실행 환경 검증은 별도 표기, 배포 SHA·원격 ledger는 검증했다고 주장하지 않음. local-only 검증 Agent 결과와 60초 시연·남은 운영 prerequisite를 docs에 압축 기록하라. PASS 뒤 루트가 1커밋·오늘 조직 PR을 만든 뒤 OPEN/base/head/fork를 확인하고 전일 PR을 close하라. Render/Sites/Supabase/OpenAI 원격 작업 금지. D10 갱신, 최종 5줄.
~~~

## 실행 기록

각 셀은 "상태 · commit/PR · 핵심 검증 · blocker"만 한 줄로 유지한다.

| Day | 날짜 | 기록 |
| --- | --- | --- |
| D01 | 07-14 | 완료 · N031-2026-07-14-react-lesson · 정적 게이트 0 fail · 없음 |
| D02 | 07-15 | 완료 · N031-2026-07-15-react-components · 하위 컴포넌트 분리 및 퀴즈 흐름 추가, 데이터 모델 설계 · 없음 |
| D03 | 07-16 | 완료 · N031-2026-07-16-demo-task-review · 발표 데모 흐름 보강 및 주간 Task 보드 정리 · 없음 |
| D04 | 07-17 | 대기 |
| D05 | 07-20 | 완료 · N031-2026-07-20-modu-brain-ui-ux · 디자인 개선을 위한 커스텀 스킬 제작 및 디자이너 서브에이전트 정의 · 없음 |
| D06 | 07-21 | 완료 · N031-2026-07-21-modu-brain-deployment-prep · 배포 준비 과정 정리 및 Supabase 연동성 검사 · 없음 |
| D07 | 07-22 | 완료 · N031-2026-07-22-architecture-visualization · 시스템 데이터 흐름 및 아키텍처 시각화(Mermaid) · 없음 |
| D08 | 07-23 | 완료 · N031-2026-07-23-modu-brain-tdd · TDD (Red-Green-Refactor) 기반 원문 부분문자열 근거 검증기 모듈 구현 및 unit test 검증 · 없음 |
| D09 | 07-24 | 대기 |
| D10 | 07-27 | 대기 |

