# 작업분해 체크리스트 (Work Breakdown)

> 기획서 원문: [plan.md](./plan.md) · 화면 흐름/IA: [wireframe.md](./wireframe.md)

## 전제 조건

- **기능 범위**: `plan.md` 원안 기준 — 핵심 기능 2개(맞춤 공고 추천 / 자소서 초안 생성)만 다룬다.
- **데이터**: 신입 공채·인턴십·공모전·대외활동 4개 카테고리의 공고를 샘플/목업 데이터로 시작하며, `backend/data/postings.json` 파일로 관리한다(T3, 총 10건 — 채용 4 / 인턴십 2 / 공모전 2 / 대외활동 2). 실제 크롤링은 이번 범위 밖이며, 이후 과제로 분리한다. 2주차 미션의 화면→서버→DB 저장·조회 한 사이클(CRUD) 요구사항은 **사용자 입력(프로필)**을 Supabase `profiles` 테이블에 저장·조회하는 것으로 충족한다(T2-b, T6) — 공고 데이터는 Supabase로 옮기지 않는다.
- **기술스택**: 백엔드/AI 연동 스택 방향은 결정됨(`CLAUDE.md`의 "백엔드 방향" 참고). 실제 셋업은 1주차 T2 이후 진행.
- **진행**: 1인 개발, 4주 기준으로 분해한다.
- **우선순위**: `P0` 핵심(없으면 plan.md 6단계 시나리오가 성립하지 않음) · `P1` 있으면 좋음(완성도/안정성) · `P2` 여유 있으면(4주 내 필수 아님).
- **2주차 결과(완료)**: 목표였던 T7(추천 목록 화면)까지가 아니라 T8(공고 상세)까지 화~목요일 사흘 만에 전부 끝남. 화면 요청 → 서버 처리 → Supabase 저장(사용자 프로필) → 응답 → 화면 반영 한 사이클을 curl·브라우저·`verification-agent` 세 가지로 검증 완료, PR도 오픈함. 금요일은 공휴일이라 작업 없음.
- **3주차 목표(월요일 계획 수립 완료)**: T9(자소서 문항 분석) → T10(LLM 초안 생성 API) → T11(자소서 화면 실제 연동) → T12(수정/저장, 세션 로컬 한정). `DraftEditor.jsx`는 이미 mock 버전으로 있고, `postings.json`의 `essayQuestions`엔 `question`/`maxLength`만 있어 분석·초안 텍스트 생성(T9/T10)이 비어있는 상태 — 이 갭부터 채운다. 여기에 이번 주 공식 미션 요구사항(아키텍처 다이어그램, 테스트 인프라 도입+TDD, 테스트코드 생성 Skill)을 더해 GitHub 이슈 #9~#15로 등록, Project 보드 "3주차 - 자소서 초안 생성 슬라이스"에서 관리. planning-agent로 요일별 계획을 짜고 vitest 도입 방식/T10 profile 전달 방식/T12 저장 범위 3가지는 직접 결정함(각 이슈 본문 참고).

## 1주차 — 기반 구축

- [x] T1. `[P0]` 기술스택 선정 (백엔드 프레임워크, LLM API, 배포 방식) 및 결정 사항 문서화 — 결정 내용은 `CLAUDE.md`의 "백엔드 방향" 섹션 참고
- [x] T2-a. `[P0]` 백엔드 Express 스캐폴딩 + 프론트-백엔드 연동 구조 (T1 선행) — 화요일
- [x] T4. `[P0]` 정보 입력 화면 UI 구현 (대학교/학년/전공/복수전공/부전공/취득학점/평균평점/자격증/기타경험 폼) — 기존 `App.jsx`를 이 화면으로 교체 — 화요일 (공식 데일리 미션 "React로 핵심 화면 만들기" 순서 반영, mock 데이터 기준)
- [x] T3. `[P0]` 목업 공고 데이터셋 설계·작성 (채용/인턴십/공모전/대외활동 4개 카테고리, 총 10건: 채용 4·인턴십 2·공모전 2·대외활동 2, 자소서 문항 포함) — `backend/data/postings.json` 파일로 관리, Supabase와 무관 (선행 작업 없음) — 화요일 (예정보다 하루 앞당겨 완료)
- [x] T2-b. `[P0]` Supabase 프로젝트·`profiles` 테이블 설정 (사용자 입력 저장용, T1 선행) — 수요일 (스키마 설계 직후 바로 이어서 완료, 목요일 예정을 하루 앞당김)

## 2주차 — 공고 추천 기능

- [x] T5. `[P0]` 사용자 입력 → 공고 매칭/추천 로직 설계 (T3 선행) — 수요일 (T2-b에 이어 하루 앞당겨 완료). 키워드 비교 전 공백을 제거해 "창업 동아리" vs "창업동아리" 같은 띄어쓰기 차이는 해결함
- [x] T6. `[P0]` 추천 API 구현: 사용자 입력을 Supabase `profiles` 테이블에 저장, `postings.json` 조회 후 매칭 + Claude(`claude-haiku-4-5`)로 추천 이유 생성해 반환 (T2-a, T2-b, T5 선행) — 목요일. `POST /api/profiles` curl 검증 완료(201+recommendations 3건, 400 필수값 누락, API 키 없어도 폴백 정상)
- [x] T7. `[P0]` 추천 공고 목록 화면 UI (T4, T6 선행) — 목요일. `src/api.js` 추가, `App.jsx`가 실제 `POST /api/profiles` 호출하도록 연결, 로딩/에러 상태 추가, `src/mockData.js` 삭제. Playwright로 브라우저 E2E 검증 완료
- [x] T8. `[P0]` 공고 상세 화면 UI: 추천 이유/주요 조건 표시 (T7 선행) — 목요일. T6 응답에 `field`/`target`/`applyMethod`/`conditions`가 포함되어 T7과 함께 실제 데이터로 검증 완료

## 3주차 — 자소서 초안 생성

- [x] 아키텍처 시각화. `[P0]` `README.md`에 화면→Express 라우트→서비스 로직(matching.js/claude.js)→데이터(Supabase profiles/postings.json) 흐름을 mermaid flowchart+시퀀스 다이어그램으로 추가 (이슈 #9) — 월요일
- [x] 테스트 인프라 도입. `[P1]` 백엔드에 `vitest` devDependency 추가, `npm test` 스크립트 등록, smoke test로 동작 확인 후 삭제 (이슈 #10) — 월요일. 화요일 T9 TDD의 전제 조건
- [x] T9. `[P0]` 자소서 문항 분석 로직 (공고별 문항 파싱, T3 데이터 활용) — `postings.json`의 `essayQuestions`엔 현재 `question`/`maxLength`만 있음, 분석 텍스트(`analysis`)는 T9에서 생성 필요 (목요일 E2E 검증 중 발견: 실제 데이터로 자소서 화면 진입 시 분석/초안 텍스트가 비어있음 — 예상된 범위 밖 상태) (이슈 #11) — 화요일 예정이었으나 월요일에 당겨서 완료. TDD(RED→GREEN→REFACTOR)로 `backend/src/services/essayAnalysis.js`+`essayAnalysis.test.js` 작성, `npm test` 7개 케이스 통과. postings.json 실제 문항 12개 전수 분류 확인, oxlint 통과. 카테고리 정의는 matching.js와 합치지 않고 파일별로 유지하기로 결정(용도가 달라 억지로 공용화하면 더 복잡해짐)
- [x] T10. `[P0]` LLM 연동 자소서 초안 생성 API: 사용자 경험 + 문항 반영 프롬프트 설계 (T1, T9 선행) (이슈 #12) — 화요일 예정이었으나 월요일에 당겨서 완료. `backend/src/services/draftGeneration.js`(`generateDrafts`, claude.js와 동일한 try/catch+템플릿 폴백 패턴)+`backend/src/routes/drafts.js`(`POST /api/postings/:id/draft`) 작성, curl 3케이스(정상/profile 누락 400/존재하지 않는 posting 404) 검증 완료. 검증 중 템플릿 폴백 문구의 조사(을/를) 오류를 실제로 발견해 수정함. profile은 프론트 재전송 방식으로 결정(Supabase 재조회 대신 단순함 우선)
- [x] T11. `[P0]` 자기소개서 초안 화면 UI: 문항별 분석 결과, 생성 초안, 편집 영역 (T8, T10 선행) — mock 버전(`src/screens/DraftEditor.jsx`)은 지난주 수요일에 완성. 실제 T10 LLM 응답으로 교체만 남음 (이슈 #13) — 화요일 완료. `src/App.jsx`(profile state 보관, `handleGenerateDraft` 비동기화), `src/api.js`(`generateDraft`), `src/screens/JobDetail.jsx`(로딩 라벨+에러 표시) 수정. fetch는 어제 초안(DraftEditor에서 useEffect)이 아니라 App.jsx가 소유하고 성공해야 화면 전환하는 방식으로 다듬음(InfoInput 로딩 패턴과 일관). Playwright E2E로 상세→초안 생성→실제 분석/초안 텍스트 렌더까지 검증, 콘솔 에러 없음
- [x] T12. `[P1]` 초안 수정/저장 기능 — 저장 범위는 세션 내 로컬 확정 표시로 한정(Supabase 영속화는 스코프 밖, 4주차 이후로 미룸). 저장 버튼을 누르면 textarea가 잠기고(disabled), "수정" 버튼으로 잠금 해제하는 방식으로 결정 (이슈 #14) — 수요일 예정이었으나 화요일에 당겨서 완료. `DraftEditor.jsx`에 `isSaved` state 추가, 저장 시 화면에 머물며 잠금+"저장됨" 배지(기존 `.tag`/`.tag--primary` 재사용) 표시. `.field-textarea[disabled]` 스타일도 기존 토큰만 사용. Playwright로 저장 전/후/재수정 3단계 검증
- [x] T13. `[P0]` 화면 간 흐름/상태관리 정리 (입력 → 추천 → 상세 → 초안 전체 연결) — 원래 4주차 예정이었으나, planning-agent 검토 결과 T11/T12만 선행하면 되고 4주차의 미정 신규 기능과 무관한 순수 정리 작업이라 안전하다고 판단해 당겨옴. 범위는 현재 useState/props drilling 구조 안에서의 정리로 한정(Context/상태관리 라이브러리 도입 없음) (이슈 #16) — 수요일 예정이었으나 화요일에 당겨서 완료. 실제 버그 발견: `handleSelectJob`이 `draftError`를 초기화하지 않아 A 공고에서 초안 생성 실패 후 목록으로 돌아가 B 공고를 선택하면 A의 에러 문구가 B 화면에 그대로 남는 문제 → `setDraftError('')` 추가로 수정. Playwright로 plan.md 6단계 시나리오 전 조합(입력→목록→상세→에러→목록→다른상세→초안→목록→입력→재제출) 점검, 버그 재현 후 수정 확인, 콘솔 에러 없음
- [x] T14. `[P1]` 예외/로딩 처리 (추천 결과 없음, 생성 실패, 입력 오류 등) — 마찬가지로 4주차에서 당겨옴(T11만 선행하면 충족) (이슈 #17) — 수요일 예정이었으나 화요일에 당겨서 완료. 원 DoD 중 생성 실패/입력 오류는 이미 T4·T11에서 처리돼 있어 실제로는 `RecommendList` 빈 상태 UI만 남았었는데, 점검 중 2가지 더 발견해 같이 고침: (1) `api.js`의 네트워크 수준 실패(fetch 자체 실패/JSON 아닌 응답)가 브라우저 원본 영어 메시지로 노출되던 것을 `postJson` 공통 헬퍼로 리팩터링해 한국어 메시지로 통일 (2) **실제 경쟁 상태 버그**: `JobDetail`의 "목록으로 돌아가기"가 초안 생성 중에도 활성 상태라 생성 요청 도중 다른 공고로 이동해 재요청하면 먼저 보낸 요청이 늦게 도착해 현재 화면을 덮어쓸 수 있었음 → `isGeneratingDraft` 중 뒤로가기도 비활성화. Playwright로 3케이스(빈 목록/네트워크 에러 메시지/생성중 뒤로가기 비활성화) 검증
- [x] 테스트코드 생성 Skill. `[P1]` `.claude/skills/test-writer/SKILL.md` 신설, design-review와 동일 포맷, 월요일 T9 TDD에서 실제로 쓴 테스트를 예시로 인용 (이슈 #15) — 수요일 예정이었으나 화요일에 당겨서 완료. 범위를 backend vitest뿐 아니라 오늘 T11~T14 검증에 쓴 Playwright E2E 패턴(playwright-core+로컬 Chrome, 스크래치패드 임시 스크립트, page.route로 실패 케이스 재현)까지 포함하도록 넓힘 — 사용자와 상의해서 결정. 회귀 스모크는 오늘 T13/T14 검증 과정에서 이미 충분히 이뤄져서 별도로 필요 없음. 이슈 #9~#17 전부 닫힘
- [x] 자소서 초안 Supabase 영속 저장 (T12 확장). `[P1]` 수요일 "데이터 흐름과 아키텍처 시각화" 미션으로 README 다이어그램을 다시 그리다가, T12에서 세션 로컬로 좁혔던 저장 범위가 "알려진 제약"으로 남아있는 걸 다시 논의해서 실제로 고치기로 결정(이슈 #20). Supabase `drafts` 테이블 신설(`profile_id`+`posting_id`+`answers` jsonb, unique 제약으로 upsert), `backend/src/routes/drafts.js`의 생성 엔드포인트가 기존 저장 여부를 먼저 조회해 있으면 재생성 없이 반환하도록 변경, 저장 엔드포인트(`POST /:id/draft/save`) 신설. `App.jsx`가 그동안 버리던 `profileId`를 실제로 사용하게 됨. curl + Playwright로 저장→재방문 시 저장된 초안이 잠긴 채로 그대로 불러와지는 것까지 확인
- [x] 새로고침 시 sessionStorage로 상태 복원 (별도 확장, 이슈 #21). 나머지 "알려진 제약"(새로고침하면 profile/화면 위치가 전부 날아감)도 다시 논의함 — 처음엔 "라우팅까지 새로 설계해야 하는 큰 변경"이라 봤는데, 실제로는 라우터 없이 `sessionStorage`만으로 새로고침 복원은 풀린다는 걸 재확인. 라우터 도입(URL 딥링크, 뒤로가기 등)은 `CLAUDE.md`의 기존 결정("라우터 라이브러리는 쓰지 않는다")대로 범위 밖으로 남기고, `App.jsx`에 `step`/`profile`/`profileId`/`jobs`/`selectedJob`/`isDraftSaved`를 sessionStorage에 저장·복원하는 로직만 추가. Playwright로 목록/상세/초안 3개 화면 각각 새로고침 후 복원되는 것 확인, 콘솔 에러 없음

## 4주차 — 통합 및 마무리

- [x] T15. `[P0]` 전체 시나리오 End-to-End 점검 (plan.md 6단계 시나리오 기준) (이슈 #18) — 3주차 본작업(T9~T14)이 화요일 하루 만에 끝나서 코드가 안정된 김에 이번 주로 당김. Playwright 한 스크립트로 5케이스(입력 오류·정상 6단계 전체·추천 0건·네트워크 에러·stale-error/경쟁상태 회귀 확인) 검증, 콘솔 에러 없음. `npm test`+oxlint 최종 재확인. 처음엔 ANTHROPIC_API_KEY 없이 폴백 경로로 검증했고, 이후 실제 키/결제 준비 후 curl로 재확인 — 추천 이유·자소서 초안 모두 템플릿이 아닌 실제 Claude(`claude-haiku-4-5`) 생성 문장으로 정상 응답함 확인
- [ ] T16. `[P0]` 데모/발표 준비 (README 갱신, 실행 방법 정리) — 오늘은 T15까지만 하기로 함, T16은 이어서 나중에 진행
- 4주차 스코프 확장 논의는 수요일에 일부 실현됨(자소서 초안 Supabase 영속화, 위 참고). 남은 여유 시간에 실제 채용 공고 API 연동/배포 등을 더 넣을지는 계속 미정 — 3주차 마무리 시점에 다시 논의

---
작성일: 2026-07-10 · 수정일: 2026-07-22 — **화요일 하루 만에 T9~T15 완료, 수요일에 자소서 초안 Supabase 영속화까지 확장.** 2주차(화~목=T2-a~T8, 금요일 공휴일)는 GitHub 이슈 #1~#8 전부 닫힘. 3주차는 planning-agent로 요일별 계획을 세우고 이슈 #9~#15 등록(이후 4주차에서 당겨온 T13/T14로 #16, #17 추가), Project 보드 "3주차 - 자소서 초안 생성 슬라이스"(#2)에 연결. 월요일에 vitest 도입(#10)+README 아키텍처 다이어그램(#9)+T9(#11)+T10(#12), 화요일에 T11(#13)+T12(#14)+T13(#16)+T14(#17)+테스트코드 생성 Skill(#15)까지 끝나서 3주차 본작업이 마무리되고, 코드가 안정된 김에 원래 4주차 몫이던 T15(E2E, 이슈 #18)까지 화요일에 이어서 완료 — T13(stale draftError)·T14(경쟁 상태로 인한 화면 덮어쓰기)에서 각각 실제 버그를 발견해 수정. 수요일 "데이터 흐름과 아키텍처 시각화" 미션으로 README 다이어그램을 갱신하다가 발견한 "알려진 제약" 2가지를 다시 논의해서 둘 다 고침: 자소서 초안 저장을 Supabase `drafts` 테이블로 실제 영속화(이슈 #20), 새로고침 시 화면/데이터가 날아가던 문제는 라우터 없이 `sessionStorage`로 복원(이슈 #21). T16(데모 준비, 이슈 #19)은 계속 이어서 진행 예정.