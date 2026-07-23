# LOG

> 작업 세션 단위의 진행 기록. 각 docs 파일은 "현재 확정된 요점"만 담고, "언제 무엇을 왜 했는지"는 여기에 남긴다.
> 커밋된 작업은 git 타임스탬프 기준. 세션 중 미커밋 작업(대화로 진행된 문서 개정)은 대화 흐름 기준 추정 시각 — 분 단위 정확도를 보장하지 않는다.

## 2026-06-22 13:59
### 처리한 TODO
- 저장소 초기화
### 사용한 자료
- 프로젝트 템플릿
### 만든 결과물
- 초기 커밋(Initial commit)
### 검토 결과
- 없음
### 남은 작업
- 프로젝트 기본 설정(PR 템플릿, 워크플로)
### 다음 추천 작업
- PR 템플릿·자동 머지 워크플로 추가

## 2026-07-03 12:42 ~ 13:30
### 처리한 TODO
- PR 템플릿 작성·개정
- 자동 머지 워크플로 추가·삭제·재추가
### 사용한 자료
- GitHub Actions 문서
### 만든 결과물
- `.github/pull_request_template.md`
- 자동 머지 워크플로 파일
### 검토 결과
- 워크플로 파일을 추가했다가 삭제하는 시행착오 있었음(최종 상태만 유지)
### 남은 작업
- 실제 제품 개발 착수(React 환경 구성)
### 다음 추천 작업
- React + Vite + TypeScript 프로젝트 스캐폴딩

## 2026-07-06 19:18
### 처리한 TODO
- React 환경 구성
- 프로젝트 소개 컴포넌트(`ProjectIntro`) 개발
### 사용한 자료
- Vite + React + TypeScript 템플릿
### 만든 결과물
- `src/` 기본 구조, `ProjectIntro.tsx` 초안
### 검토 결과
- 서비스 소개용 정적 페이지 골격 확보
### 남은 작업
- 프로젝트 규칙 문서(CLAUDE.md), 디자인 토큰 문서 필요
### 다음 추천 작업
- CLAUDE.md·DESIGN.md 작성, PRD 다듬기

## 2026-07-06 19:45
### 처리한 TODO
- 프로젝트 규칙 문서(CLAUDE.md) 작성
- 디자인 토큰 문서(DESIGN.md) 작성
- PRD 초안 다듬기
### 사용한 자료
- 사용자 서비스 아이디어("답답" — 답장 도우미)
### 만든 결과물
- `CLAUDE.md`, `docs/DESIGN.md`, `docs/PRD.md`(초안)
### 검토 결과
- 절대 규칙(any 금지, MVP 범위 밖 금지, 구조 변경 승인 등) 확정
### 남은 작업
- MVP 범위, 화면 설계, 엣지케이스, 구현 스펙 등 세부 문서 필요
### 다음 추천 작업
- docs 폴더 전체 문서 체계 구축 (MVP/SCREENS/EDGE_CASES/SPEC/PLAN/CHECKLIST/UX)

## 2026-07-07 21:04
### 처리한 TODO
- MVP 범위 정의(MVP.md)
- 화면·상태 설계(SCREENS.md)
- 엣지케이스 대응(EDGE_CASES.md)
- 구현 스펙(SPEC.md)
- 3주 구현 계획(PLAN.md)
- 기능 개발 체크리스트(CHECKLIST.md)
- UX 조사(UX.md)
- PRD에 MVP 결정사항 반영
### 사용한 자료
- PRD 초안
- 사용자 위임 결정(톤 위치, 입력 구성, 재시도 동선 등)
### 만든 결과물
- `docs/MVP.md`, `docs/SCREENS.md`, `docs/EDGE_CASES.md`, `docs/SPEC.md`, `docs/PLAN.md`, `docs/CHECKLIST.md`, `docs/UX.md`
### 검토 결과
- MVP In/Out 범위 확정(피드백 루프·로그인·히스토리·시나리오 커스텀·결제 Out)
- 톤 사전 선택 UI 제거, 입력 2필드 구성, 재시도 1차=리롤 확정
- 엣지케이스 19개 중 MVP 코드 처리 11개 확정
- AI 연동 방식(목 우선→3주차 Vercel 프록시), 배포 환경(Vercel), AI 모델(`claude-opus-4-8`) 확정
### 남은 작업
- CLAUDE.md에 커밋 규칙·참고 문서 연결
- CI/CD 파이프라인, 작업 절차 스킬 구축
- 시드 예시 작성, 테스트 환경 도입
### 다음 추천 작업
- CLAUDE.md 커밋 규칙 섹션 추가

## 2026-07-07 21:06 ~ 21:07
### 처리한 TODO
- CLAUDE.md에 커밋 규칙 섹션 추가
- CLAUDE.md 참고 문서 목록 최신화
- Claude Code 설정(훅/스킬) 추가
### 사용한 자료
- 위 문서 체계 구축 결과
### 만든 결과물
- `CLAUDE.md`(커밋 규칙), `.claude/` 설정
### 검토 결과
- 최소 단위 커밋 원칙, 일괄 스테이징 금지 등 커밋 규칙 확정
### 남은 작업
- 서비스 정의 확장 개정 반영
### 다음 추천 작업
- 서비스 정의를 "답장 도우미"에서 "메시지 작성 도우미"로 확장

## 2026-07-08 11:42
### 처리한 TODO
- 서비스 정의 확장 개정: "답장 도우미" → "상황과 관계에 맞는 메시지 작성 도우미"
- 시나리오 4개를 관계형(팀플·조모임/교수님·조교님/선배·동기/친구·연인)으로 재구성
- 사용자 노출 문구 "답장" → "보낼 말"로 통일
### 사용한 자료
- 사용자 확정 결정
### 만든 결과물
- PRD.md, MVP.md, SCREENS.md, SPEC.md 등 개정
### 검토 결과
- 받은 메시지 있으면 답장, 없으면 먼저 보내는 메시지로 생성한다는 서비스 정의 확립
### 남은 작업
- CI/CD 파이프라인, 작업 절차 스킬, 테스트 환경 필요
### 다음 추천 작업
- CI/CD 파이프라인 구축

## 2026-07-08 11:56
### 처리한 TODO
- CI 워크플로 추가 및 CI/CD 파이프라인 문서화(CICD.md)
- 작업 절차 스킬 3종 추가(`/task-start`, `/seed`, `/pr`)
- CLAUDE.md에 작업 스킬·CI/CD 참조 연결
### 사용한 자료
- GitHub Actions
### 만든 결과물
- `docs/CICD.md`, `.claude/skills/` 3종
### 검토 결과
- 개발 프로세스(착수 전 계획, 시드 검수, PR 생성)가 스킬로 표준화됨
### 남은 작업
- 테스트 환경 도입(Vitest), 시드 예시 작성
### 다음 추천 작업
- Vitest + React Testing Library 도입, 시드 예시 1차 작성

## 2026-07-08 16:43
### 처리한 TODO
- Vitest + React Testing Library 도입
- 시드 예시 24개 초안 작성, 블라인드 검수지 작성
- T1·T15 완료 체크, 시드 참조 연결
- SPEC에 few-shot 주입부 분리 지침 추가
### 사용한 자료
- SPEC.md 4장 시드 스키마·작성 기준
### 만든 결과물
- `src/App.test.tsx`(스모크 테스트), `docs/SEEDS.md`, `docs/SEEDS_REVIEW.md`
### 검토 결과
- 시드 24개 자체 스크리닝 통과, 블라인드 정렬은 제3자 수행 대기
- 프롬프트 조립 함수가 예시 배열을 파라미터로 받도록 하는 선행 지침 확정(이후 단계 대비)
### 남은 작업
- 목적 선택 등 2차 개정 사항 반영
### 다음 추천 작업
- MVP 2차 개정 문서 반영

## 2026-07-08 17:42
### 처리한 TODO
- MVP 2차 개정: 목적 선택 추가(6종, 필수), 텍스트 2필드 중 1개 이상 필수, 톤 공통 라벨(기본/더 부드럽게/더 분명하게), 환각 금지+자리 표시자 허용, 핵심 과업=복사+최소 계측
### 사용한 자료
- 1차 결정("빈 입력 허용", 플레이스홀더 금지)에 대한 재검토
### 만든 결과물
- MVP.md, SPEC.md, SCREENS.md, EDGE_CASES.md, PRD.md 2차 개정 반영
### 검토 결과
- "빈 입력 허용" 원칙을 "텍스트 하한으로 품질 확보"로 뒤집음
- "플레이스홀더 금지"를 "환각 금지 + 자리 표시자 허용"으로 교체(환각이 빈칸보다 위험하다는 판단)
### 남은 작업
- 시드 2차 작성, 화면 구현(T6~T14)
### 다음 추천 작업
- 시드 2차 12개 작성, S1~S3 화면 구현 착수

## 2026-07-09 09:14
### 처리한 TODO
- PR에서 workflow 파일 제외
### 사용한 자료
- CI 설정 점검
### 만든 결과물
- `.gitignore` 또는 워크플로 설정 조정
### 검토 결과
- PR에 워크플로 변경이 섞이지 않도록 정리
### 남은 작업
- 서비스 개편(답냥이) 논의
### 다음 추천 작업
- 서비스 개편안 검토

## 2026-07-09 (저녁, 시각 추정)
### 처리한 TODO
- 사용자 제안 "답냥이 서비스 개편안" 검토 — 서비스명 개편(답답→답냥이) + 관계별 냥이 조력자 컨셉 + 하이브리드 생성(템플릿/AI) 도입
- 캐릭터 범위(네이밍·카피까지 MVP, 일러스트 Out), 라우팅 기준(관계 축→입력 축) 두 가지 결정 지점 정리 후 사용자 승인 확보
- 3차 개정 문서 반영
### 사용한 자료
- 사용자가 작성한 개편 제안서(서비스 컨셉·생성 방식·유지 범위·기대 효과)
### 만든 결과물
- PRD.md, MVP.md, SPEC.md, SCREENS.md, CHECKLIST.md, EDGE_CASES.md, PLAN.md 3차 개정
- CLAUDE.md, AGENTS.md, UX.md, index.html, `src/App.test.tsx`, `src/ProjectIntro.tsx`, `public/todo-preview.html` 서비스명 변경(답답→답냥이)
- 메모리 갱신(`dapdap-userflow-decisions.md`)
### 검토 결과
- 하이브리드 라우팅 규칙 확정: 받은 메시지 있음→AI / 기타 목적·80자 초과 상황→AI / 그 외 템플릿 존재 시 템플릿 → 폴백 AI
- 템플릿 결과 리롤은 AI 강제, 응답 `source` 필드는 사용자 비노출
- 신규 체크리스트 항목 T25(템플릿 데이터)·T26(라우터) 추가
### 남은 작업
- 답장/먼저 연락 입력 UI를 토글로 할지 화면 분리로 할지 결정 필요
### 다음 추천 작업
- 토글 vs 화면 분리 데모 비교

## 2026-07-09 (밤, 시각 추정)
### 처리한 TODO
- 답장/먼저 연락 입력 UI 데모 3종 순차 제작·비교: 토글(한 화면 내 필드 전환) → 화면 분리(스텝 위저드) → 좌우 비교(두 플로우 동시 표시)
### 사용한 자료
- 사용자가 제시한 참고 UI 스크린샷(3패널 레이아웃)
### 만든 결과물
- `src/ProjectIntro.tsx`, `src/App.css`, `src/App.test.tsx` 반복 수정(문서 반영 없이 코드 데모만)
### 검토 결과
- 사용자가 화면 분리 방식을 최종 선호로 확정("토글말고 화면 분리로 진행해주세요")
### 남은 작업
- 화면 분리 결정을 문서(SCREENS.md 등)에 정식 반영
### 다음 추천 작업
- S0 화면 신설 문서화 + 코드 정식 반영

## 2026-07-10 00:05 (추정)
### 처리한 TODO
- 4차 개정: 답장/먼저 연락 여부를 S0 화면으로 분리(자동 판별 폐기)
- S2 필드 구성을 모드별로 분기(답장: 받은 메시지 필수 / 먼저 연락: 상황 설명 필수)
### 사용한 자료
- 전날 밤 데모 비교 결과
### 만든 결과물
- SCREENS.md(S0 신설, 핵심 결정 4), MVP.md·PRD.md·SPEC.md·CHECKLIST.md·PLAN.md·EDGE_CASES.md 4차 개정
- `src/ProjectIntro.tsx` 위저드 흐름(S0→S1→S2→S3) 정식 구현
### 검토 결과
- CHECKLIST에 신규 T27(S0 화면) 추가, step 상태에 `mode` 축 추가
### 남은 작업
- 사용자가 제안한 "기본 상황 6종 카드 + 다른 상황이냥?" 아이디어 검토
### 다음 추천 작업
- 상황 카드 도입 여부·설계 검토

## 2026-07-10 00:55 (추정)
### 처리한 TODO
- 5차 개정: S2 기본 화면을 상황 카드 선택(공통 5 + 관계별 특화 1)으로 개편
- 목적 선택을 "다른 상황이냥?" 이탈 경로 전용으로 축소
- 라우팅 규칙 단순화(카드=템플릿 / 이탈=AI, 기존 80자·purpose=other 휴리스틱 폐기)
- 출처 비노출 원칙을 "결과 화면 재노출 안 함"으로 완화
- 콘텐츠 규모 24개→72개로 확대(시드와 독립 작성)
### 사용한 자료
- 사용자 제안("일정 조율/감사·확인/부탁/사과/거절/결석·과제 문의" 등 기본 상황 6종)
- 채택 전 제시한 검토 의견(출처 노출 충돌, 목적 선택과의 중복, 콘텐츠량 문제)에 대한 사용자 결정("공통 5개 + 관계별 특화 1개로 먼저 진행")
### 만든 결과물
- SPEC.md(1·2·4장 대폭 개정), SCREENS.md(S2→S2-a/S2-b 분리), MVP.md·PRD.md·CHECKLIST.md·PLAN.md·EDGE_CASES.md·CLAUDE.md·AGENTS.md 5차 개정
- `src/ProjectIntro.tsx` 상황 카드 그리드 + "다른 상황이냥?" 이탈 경로 구현(72개 중 24개 실 문구, 나머지는 데모용)
- `src/App.test.tsx` 4개 테스트로 갱신
- 메모리 갱신(`dapdap-userflow-decisions.md`)
### 검토 결과
- 테스트 4/4 통과, 린트 클린, 빌드 성공
- 신규 엣지케이스 2-6(답장 모드 카드가 받은 메시지 무시) 추가, 기존 2-5 대응 방식 갱신
- PLAN.md 리스크 섹션에 콘텐츠량 3배 증가(24→72개)를 2주차 최대 리스크로 명시, 축소 우선순위(공통 5카드 우선) 기록
### 남은 작업
- 상황 카드 템플릿 72개 실제 작성·검수(T25)
- 시드 2차 12개 작성 + 블라인드 검수(T16)

## 2026-07-10 15:xx
### 처리한 TODO
- MVP 구현·문서 정합성 및 핵심 사용자 흐름 점검
- 복사 실패 시 텍스트 선택 폴백 추가
- 현재 탭의 입력·결과 `sessionStorage` 복원 추가
- 직접 입력 목적 선택 검증, 글자 수, 비활성 안내 추가
- 관계 변경 시 직접 작성한 입력 유지
### 사용한 자료
- docs/PRD.md, docs/MVP.md, docs/SCREENS.md, docs/SPEC.md, docs/CHECKLIST.md
### 만든 결과물
- `src/ProjectIntro.tsx` 핵심 과업 복사 폴백·세션 복원·입력 검증 보완
- `src/App.css` 보조 안내 스타일
- `src/App.test.tsx` 복사 폴백·세션 복원·입력 유지 테스트 추가
### 검토 결과
- `npm test`(7건), `npm run lint`, `npm run build` 통과
- 실제 AI 생성 API, 로딩·오류 상태, 72개 템플릿의 블라인드 검수는 아직 미구현/미완료
### 남은 작업
- T2~T14의 미완료 항목을 의존성 순서대로 구현
- T16 시드 전수 검수, T25 템플릿 콘텐츠 검수
- T18~T20 AI 프록시·생성 파이프라인 구현 전 별도 구조 작업 제안
- S0~S3 실 구현(T5~T14, T27)
- 이번 세션의 문서·코드 변경 커밋
### 다음 추천 작업
- 지금까지의 변경사항을 논리 단위로 커밋(`/commit`)

## 2026-07-10 15:xx (AI 설계·기반 구현)
### 처리한 TODO
- AI 사용 경계, 구조화 응답, 실패·비용·개인정보·평가 관점으로 프로젝트 재감사
- T2 도메인 카탈로그·타입 분리
- T3 공용 생성 계약과 런타임 응답 검증 구현
- T4 개발용 목 생성기(normal/delay/error500/error429) 구현
- 탭 임시 보관 30분 만료·즉시 삭제 동선 보완
- 관계별 AI 평가 케이스·포트폴리오 문서 작성
### 사용한 자료
- docs/SPEC.md, docs/MVP.md, docs/SCREENS.md, docs/EDGE_CASES.md, docs/CHECKLIST.md
### 만든 결과물
- `src/domain/message.ts` 및 카탈로그 테스트
- `src/services/generation/contracts.ts`, `mockGenerator.ts` 및 계약·목 테스트
- `src/evaluation/generationCases.ts` 및 평가 자산 테스트
- `docs/AI_DESIGN.md`, README AI 설계 설명
### 검토 결과
- T2, T3, T4 체크리스트 완료 처리
- 실제 AI API·Vercel 함수·프롬프트 코드(T18~T20)는 의존성 및 서버 구조 작업이 남아 있어 미착수
- 세션 원문 임시 보관은 카톡 전환 복원과 개인정보 최소화의 절충이며, 영구 히스토리는 도입하지 않음
### 남은 작업
- T5~T14, T25~T26의 UI·템플릿·라우터 구현을 의존성 순서대로 완성
- T16 시드 블라인드 검수와 T25 템플릿 전수 검수
- T17 승인/배포 준비 뒤 T18~T20 프록시·프롬프트·실 API 연결

## 2026-07-10 17:xx (S1 고양이 조력자 UI)
### 처리한 TODO
- S1 관계 카드의 고양이 조력자 에셋 도입 준비 및 UI/UX 개선
### 사용한 자료
- `skills/dabnyangi-ui/SKILL.md`, `docs/DESIGN.md`, `docs/SCREENS.md`
### 만든 결과물
- 관계별 고양이 미디어 슬롯(팀플냥·교수냥·선배냥·연인냥)과 에셋 경로 설정 지점
- 에셋 파일 규격·경로 안내(`public/cats/README.md`)
- S1 카드의 스캔성·키보드 포커스·모바일 크기 보완
### 검토 결과
- 실제 에셋 없이도 브랜드 배지로 자연스럽게 보이며, 에셋 투입 후 카드 레이아웃이 변하지 않음
- `npm test`(34건), `npm run lint`, `npm run build` 통과
### 남은 작업
- 관계별 고양이 PNG/WebP 에셋을 준비한 뒤 `src/domain/message.ts`의 `assetPath` 연결

## 2026-07-11 (하네스 기본 골격)
### 처리한 TODO
- 하네스 엔지니어링을 위한 비코드 작업 골격 추가
### 사용한 자료
- `AGENTS.md`, `docs/CHECKLIST.md`, `docs/LOG.md` 및 기존 작업 절차 스킬
### 만든 결과물
- `harness/README.md` 작업 하네스 진입점
- 작업 계획·검증 보고서 템플릿 2종
### 검토 결과
- 기존 PRD·SPEC·CHECKLIST·LOG를 정본으로 유지하고, 별도 요구사항·상태·누적 로그를 만들지 않음
- 제품 코드, 테스트, CI·배포 설정은 변경하지 않음
- `npm test` 34건, `npm run lint`, `npm run build`, `git diff --check` 통과
### 남은 작업
- 다음 기능 작업부터 해당 템플릿을 필요에 따라 복사해 계획과 검증 근거를 남김
### 다음 추천 작업
- 의존성이 충족된 CHECKLIST 항목을 선택해 `/task-start` 절차로 착수

## 2026-07-11 (하네스 전반 검토·피드백 반영)
### 처리한 TODO
- 초기 하네스의 저장 위치·상태 전이·승인·완료 판정·인계 규칙 검토
- 계획 완료조건과 검증 증거의 추적성 보완
- 하네스가 참조하는 기존 문서의 정합성 점검
### 사용한 자료
- `AGENTS.md`, `.claude/skills/task-start/SKILL.md`, `docs/CHECKLIST.md`, `docs/CICD.md`, `docs/UX.md`
- 현재 `.github/workflows/` 상태와 CI 파일 Git 이력
### 만든 결과물
- 작업별 기록 규칙과 첫 비-T 검토 기록(`harness/tasks/2026-07-11-harness-review/`)
- AC 기반 계획·검증 템플릿과 작업 유형별 검증 게이트
- T10 UX 참조, T25 선행관계, CI 설치 상태 문서 정정
### 검토 결과
- [계획서](../harness/tasks/2026-07-11-harness-review/plan.md) AC 6개 전부 충족
- [검증 보고서](../harness/tasks/2026-07-11-harness-review/verification.md) 통과
- 테스트 파일 6개·테스트 34개, 린트, 빌드, diff·링크·경로 검증 통과
- 제품 코드·테스트 코드·CI 실행 설정은 변경하지 않음
### 남은 작업
- 원격 CI는 현재 미설치이며, 실제 추가는 별도 구조 변경 제안·승인 필요
### 다음 추천 작업
- 다음 T항목 착수 시 `harness/tasks/T<번호>-<이름>/`에 계획·검증 기록을 생성해 새 절차 적용

## 2026-07-11 (제품 6축 감사·피드백 반영)
### 처리한 TODO
- 서비스 가치, 지속 사용 가능성, AI 활용, UX, 기술 완성도, 포트폴리오 가치의 현재 근거와 출시 차단 항목 감사
- 검수·실 AI·효과·재방문을 완료처럼 보이게 하던 표현과 잘못된 계측·모델 선택 가정 정정
- 콘텐츠, 모바일·접근성, API·CI, 개인정보, 외부 파일럿의 검증 기준을 MVP 범위 안에서 보강
### 사용한 자료
- `README.md`, PRD/MVP/SPEC/AI_DESIGN/SCREENS/UX/DESIGN/CHECKLIST/PLAN/CICD 및 현재 소스·테스트
- Anthropic 모델·Structured Outputs·API 보존 공식 문서, Vercel Custom Events 공식 문서, WCAG 2.2
### 만든 결과물
- [제품 6축 점검표](PRODUCT_REVIEW.md)
- [작업 계획](../harness/tasks/2026-07-11-product-audit/plan.md)과 [검증 보고서](../harness/tasks/2026-07-11-product-audit/verification.md)
- 구현/설계/검증 대기 분리, 사건 발생형 재사용 가설, holdout 모델 선택, 조건부 계측, 모바일·접근성·provider 고지 기준
### 검토 결과
- 내부 점수: 서비스 가치 4.0, 지속 사용 2.0, AI 3.5, UX 3.0, 기술 3.0, 포트폴리오 3.5/5
- 시드 표본에서 G-B 내용 변경, P-A 행동 단정, F-A 입력 없는 약속을 발견해 기존 자체 검수 통과를 철회하고 T15·T16을 다시 열었음
- 테스트 파일 6개·테스트 34개, 린트, 빌드, diff·Markdown 로컬 링크, AGENTS/CLAUDE 동기화 검증 통과
- 제품 코드·테스트 코드·패키지·실제 AI·CI·배포 설정은 변경하지 않음
- 연결 가능한 브라우저가 없어 실제 모바일 클릭 검증은 보완 필요이며, 계획을 종료하지 않음
### 남은 작업
- T14·T23에서 375×667·320×568, 키보드·초점·스크린리더·카톡 인앱 복사 실증
- T15→T16 시드 재작성·블라인드 검수와 T25 카드 72문구 전수 검수
- T17~T21에서 Node·CI·API 타입검사·서버 취소·provider 고지·holdout 모델 비교를 순서대로 수행
### 다음 추천 작업
- 코드보다 먼저 `/seed`로 T15 문제 시드를 수정·재검수하고, 독립 가능한 T25 카드 콘텐츠 감사를 병행

## 2026-07-12 (범용 AI 대비 경쟁가치 검증 준비)
### 처리한 TODO
- ChatGPT·Gemini 대신 답냥이를 선택할 이유를 백엔드 투자 전에 검증하는 탐색 파일럿 설계
- 최근 실제 행동 인터뷰, 카드 A/B 과업, 실 AI 후속 과업, 공정한 교차 배정·중단·개인정보 규칙 정의
- 앱 내부 복사가 아니라 도구 실행부터 복사 후 수정·최종 전송 가능 문구 확정까지의 E2E 측정과 블라인드 품질 판정 정의
### 사용한 자료
- `docs/PRD.md`, `docs/MVP.md`, `docs/PRODUCT_REVIEW.md`, `docs/SPEC.md`, `docs/CHECKLIST.md`
- 현재 `src/ProjectIntro.tsx` 카드 초안, `docs/SEEDS.md`, `src/evaluation/generationCases.ts`
- ChatGPT 개인화·Projects·GPTs, Gemini Gems 공식 문서
### 만든 결과물
- [범용 AI 대비 경쟁가치 검증 절차](COMPETITIVE_VALIDATION.md)
- [작업 계획](../harness/tasks/2026-07-12-competitive-value-validation/plan.md)과 [검증 보고서](../harness/tasks/2026-07-12-competitive-value-validation/verification.md)
- PRD/MVP/CHECKLIST/PLAN/CICD/PRODUCT_REVIEW의 대표 12문구 gate, T18 Go 전 보류, T22 교차 비교 연결
### 검토 결과
- 인터뷰 11문항, 카드 C1~C4 A/B 8개 변형, 실 AI A1~A4, P01~P05 교차 배정, 원시 필드·5항목 블라인드 루브릭·Go/Iterate/No-go 준비 완료
- 현재 C2는 조교 과업에 교수님 호칭을 고정하고, C3 tone3은 명령형, C4 tone3은 입력 없는 다음 약속을 추가하므로 참여자 모집을 보류
- 실제 인터뷰·비교·시장 우월성 결과는 생성하거나 주장하지 않음
- 테스트 파일 6개·테스트 34개, 린트, 빌드, diff·Markdown 37개 로컬 링크, AGENTS/CLAUDE 동기화 검증 통과
- 제품 코드·테스트 코드·패키지·백엔드·실 AI·CI·배포 설정은 변경하지 않음
### 남은 작업
- `/task-start T25`로 대표 C1~C4 12문구를 수정하고 관계·톤·사실 hard gate 재검수
- T10~T14와 T17 프리뷰 준비 후 대학생 5명 카드 교차 비교 수행
- Go일 때만 T18~T21 최소 백엔드·실 AI 단계로 진행
### 다음 추천 작업
- T25 계획에서 C1~C4 대표 12문구를 첫 검증 단위로 삼고, 하나라도 hard fail이면 사용자 비교를 열지 않음

## 2026-07-12 (인터뷰 선행조건을 문헌 우선 검증으로 전환)
### 처리한 TODO
- 인터뷰가 어려운 현재 조건을 반영해 T18 전 경쟁가치 검증을 `집중 문헌 검토 → T25 대표 12문구 → 무참여자 모델 벤치마크`로 재설계
- AI 글쓰기 효과, AI 매개 관계 커뮤니케이션, 어려운 대화, 구조화 추천 UI, 한국어 공손성의 5개 연구 축 검토
- 문헌의 직접 근거, 답냥이에 대한 제품 추론, 실제 사용자만 답할 수 있는 미검증 가설 분리
### 사용한 자료
- Science·QJE·Science Advances의 AI 글쓰기·현장 생산성·동질화 연구
- Scientific Reports·TOCHI·JSPR·JCMC의 AI 매개 관계·진정성·ownership 연구
- CHI의 메시지 단위 추천·후보 수·프롬프트 사용성 연구와 어려운 대화·peer support 실험
- KCI의 한국 대학생 교수 이메일·모바일 메신저·사과화행·ChatGPT 공손성 연구
- ChatGPT 개인화·Projects·GPTs와 Gemini Gems 공식 기능 문서(효과 근거가 아닌 경쟁 기능 기준선)
### 만든 결과물
- [문헌 기반 제품·검수 근거](RESEARCH_REVIEW.md): 연구 유형·표본·맥락·결과·한계·제품 적용·과해석 금지 매트릭스
- [경쟁가치 검증 절차](COMPETITIVE_VALIDATION.md): 무참여자 C1~C4 반복 모델 벤치마크와 `Pending | Provisional Go | Iterate | No-go`
- [작업 계획](../harness/tasks/2026-07-12-research-first-validation/plan.md)과 [검증 보고서](../harness/tasks/2026-07-12-research-first-validation/verification.md)
- PRD/MVP/PRODUCT_REVIEW/CHECKLIST/PLAN/CICD의 T18 선행조건과 T21·T22 평가 기준 동기화
### 검토 결과
- 문헌은 제한된 글쓰기의 시간·평균 품질 이득과 추천 UI의 입력 절감을 지지하지만, 표현 유도·동질화·agency·진정성 위험도 함께 보고함
- 현재 `교수님·조교님`, `선배·동기`, `친구·연인` 묶음은 문헌에서 직접 도출된 taxonomy가 아니라 MVP 제품 가설임
- 긴 인터뷰를 T18 선행조건에서 제거하고, 실제 속도·선택·“내 말 같다”는 T22의 짧은 사람 대상 과업에 유지
- T25는 2인 독립·제3자 판정, hard fail 0, 톤 24/24, 그대로 전송 58/72, 자리 표시자만 채워 72/72로 고정하고 미정 `mode` 예외를 제거
- R2 분모는 답냥이 12고유/24판단, ChatGPT·Gemini 각 72판단으로 고정하고 format fail·refusal·technical Pending 처리 규칙을 추가
- T22는 카드만 각 참여자의 평소 범용 AI와 비교하고 실 AI는 답냥이 단독 사용성으로 분리. 유효 짝비교 5명 미만이면 `Pending`
- 대기 UX 효과 과장과 구조화 출력/스트리밍 충돌 표현을 바로잡고, Android 중복 toast 대신 버튼 상태 전환+T23 플랫폼 확인으로 수정
- 문헌 검토만으로 범용 AI 우월성·관계 개선·지속 사용을 주장하지 않음
- 독립 문헌·한국어·제품가치 재감사, 테스트 파일 6개·테스트 34개, 린트, 빌드, diff·Markdown 32개 파일/로컬 링크 49개, AGENTS/CLAUDE 동기화 검증 통과
- 제품 코드·테스트 코드·패키지·백엔드·실 AI·CI·배포 설정은 변경하지 않음
### 남은 작업
- `/task-start T25`로 C1~C4 대표 12문구 source preflight와 hard fail 수정
- 대표 문구 통과 뒤 고정 프롬프트로 ChatGPT·Gemini 무참여자 모델 벤치마크 실행
### 다음 추천 작업
- 제품 코드를 늘리기 전에 T25 대표 12문구의 잘못된 호칭·강압 표현·입력 없는 약속부터 수정하고 같은 콘텐츠 버전으로 무참여자 벤치마크를 수행

## 2026-07-12 (T25 대표 12문구 내부 source preflight)
### 처리한 TODO
- `/task-start T25` 절차로 전체 72개 중 경쟁 검증용 C1~C4 대표 12개만 선행 작업
- 팀플 반말 고정, 교수 호칭 단정, 편한 말 강요, 입력 없는 다음 약속과 부자연스러운 공통 표현 수정
- 네 상황의 세 문구를 답장·먼저 보내기 양쪽에서 고정하는 UI 회귀 테스트 추가
### 만든 결과물
- [대표 12개 작업 계획](../harness/tasks/T25-situation-card-templates/plan.md)과 [검증 기록](../harness/tasks/T25-situation-card-templates/verification.md)
- [블라인드 사람 검수지](../harness/tasks/T25-situation-card-templates/representative-review.md)와 [집계 키](../harness/tasks/T25-situation-card-templates/representative-review-key.md)
- `src/ProjectIntro.tsx`의 대표 네 세트와 `src/App.test.tsx`의 금지 표현·두 모드 회귀 테스트
### 피드백 반영
- 독립적인 AI 보조 감사 2건이 공통 지적한 C1 반말 고정, C3 tone 3 정렬 위험, C4 `같이하기`의 부자연스러움을 수정
- 반영 뒤 두 재감사는 명백한 사실·관계·강압 hard fail 0건, 네 세트 톤 식별 가능, 사람 검수 전 필수 수정 없음으로 일치
- AI 감사는 사람 평가로 세지 않으며 공식 T25 합격 분자·분모에도 포함하지 않음
### 검토 결과
- 기준선 테스트 6개 파일·34개 통과, 반영 뒤 6개 파일·35개 통과
- 린트와 프로덕션 빌드 통과
- 다른 60개 템플릿, 데이터·화면 구조, 백엔드·AI 경로는 변경하지 않음
- 대표 12개 내부 source preflight만 통과했으며 T25 체크리스트는 완료 처리하지 않음
### 남은 작업
- 작성자가 아닌 한국어 관계 맥락 평가자 2인의 독립 블라인드 검수와 불일치 시 제3자 판정
- 검수 통과 뒤 같은 콘텐츠 버전을 동결해 C1~C4 ChatGPT·Gemini 무참여자 모델 벤치마크 수행
### 다음 추천 작업
- 두 평가자에게 `representative-review.md`만 전달하고, 제출 전에는 정답 키와 서로의 평가를 공개하지 않음

## 2026-07-12 (T25 전체 72문구 채팅 말투 개편)
### 처리한 TODO
- 실제 대학생 카카오톡보다 지나치게 정중하고 완결돼 AI가 쓴 것처럼 보인다는 피드백 반영
- 팀플·교수/조교·선배/동기·친구/연인 24세트·72문구를 같은 데이터 구조 안에서 전면 수정
- 부탁 카드 12개만 `[부탁할 내용]`을 두고 나머지 60개는 자리 표시자 없이 작성
### 주요 변경
- 비공식 관계 54개에서 마침표를 제거하고 1~2호흡 구어체로 축약
- 교수·조교는 짧은 인사와 용건을 유지하되 메일·공문체 표현과 특정 직함 단정을 제거
- `오늘`, `이번 주`, `다음에`, 바쁨·사정·재발 약속처럼 카드에 없는 사실 제거
- `ㅎㅎ`는 마음 표현 후보 1개에만, `!`는 감사·인사 등 8개에만 사용하고 `용·ㅠ`는 넣지 않음
### 만든 결과물
- [전체 72개 블라인드 검수지](../harness/tasks/T25-situation-card-templates/full-review.md)와 [정답 키](../harness/tasks/T25-situation-card-templates/full-review-key.md)
- 전체 72개 기준으로 갱신한 [작업 계획](../harness/tasks/T25-situation-card-templates/plan.md)과 [검증 기록](../harness/tasks/T25-situation-card-templates/verification.md)
- 24개 카드 전수 노출·중복·마침표·공문체·호칭·새 사실·자리 표시자 회귀 테스트
### 검토 결과
- 소스 72개와 전수 검수지 누락 0, 비공식 관계 마침표 0, `[부탁할 내용]` 12개, 최대 45자
- 이전 대표 12개 AI 보조 감사는 개편 전 버전이므로 새 문구 합격 근거에서 제외
- 일반 사과 문구의 조건형 표현이 실제 채팅에서 회피적으로 느껴지는지는 사람 검수 필요
- 데이터 구조·화면·라우팅·백엔드·AI 경로는 변경하지 않음
### 남은 작업
- 한국어 관계 맥락 평가자 2인의 독립 블라인드 전수 검수와 이견 시 제3자 판정
- hard fail 0, 톤 24/24, 즉시 전송 58/72 이상, 조건부 전송 72/72를 실제 평가 결과로 확인
### 다음 추천 작업
- 평가자에게 `full-review.md`만 각각 전달하고 정답 키·서로의 평가·앱 코드는 제출 전 공개하지 않음

## 2026-07-12 (T25 B/S/C 정합성·구체 사과 재작성)
### 승인된 결정
- 72개 구조와 `apologize` ID는 유지
- 추상적인 `사과` 카드 라벨을 `답장이 늦었을 때 사과`로 구체화
- 선배·동기는 현재 `senior` 키 안에서 공용 해요체 사용
- 음슴체·용용체·다나까체 선택 기능은 이번 구현에서 제외하고 AI 이탈 경로의 후속 검증으로 기록
### 처리한 TODO
- 72개 전부를 B=균형, S=쿠션 1개, C=핵심 우선·간결 기준으로 재작성
- 교수·조교의 가벼운 해요체와 친밀 표지 제거, 팀플·선배는 해요체, 친구·연인은 반말로 정리
- 사과 12개 모두 카드가 제공하는 답장 지연 행동을 명시하고 이유·재발 약속은 추가하지 않음
- 대표 12개와 전체 72개 블라인드 검수지를 새 버전으로 동기화
### 자동 검증
- 24개 세트 S 쿠션 정확히 1개, C 길이 ≤ S 길이, 전체 72개 고유
- 교수·조교 18개 합니다체/`-까요?`, 금지 친밀체 0건
- 비공식 관계 54개 마침표 0건, 사과 12개 `답|답장` 포함, 부탁 자리 표시자 12개
- `ㅎㅎ`는 친구·연인 마음 표현 S 1개만 사용하고 `용·ㅠ·!`는 사용하지 않음
### 남은 작업
- 사람 평가자 2인의 사실·의도 동일성, 관계·모드 적합성, 소리 내어 읽기, 톤 정렬 전수 검수
- 이견 항목 제3자 판정 후에만 T25 완료와 후속 모델 벤치마크 여부 결정

## 2026-07-12 (T25 1차 검수 반영 — 16문구 수정·검수지 동기화)
### 처리한 TODO
- 1차 검수(수정 후 재검수, hard fail 0, 자연 1점 약 27개)의 우선 수정 4범주를 16개 문구에 반영
- 조건부 사과 4건(`기다리게 했다면/기다렸으면`) → 무조건 사과(`기다리게 해서/해드려`)로 교체
- 교수·조교 거절 세트 3건 연화(`어려울 것 같습니다/어렵겠습니다`), `문의드립니다`·`혹시` 이중 완곡 제거
- 완곡 표현 3건 분산(`시간 되실 때`·`바쁘지 않으시면`·`편하신 시간에 맞추겠습니다`), 감사 세트 2개 톤 차이 강화(C1 포함)
- 자연스러움 점수는 합격 판정이 아닌 재작성 우선순위 참고로 명시(검수지 판정 규칙 추가)
### 사용한 자료
- 1차 블라인드 검수 결과 요약, `harness/tasks/T25-situation-card-templates/full-review.md`·키, SPEC 4장 T25 기준
### 만든 결과물
- `src/ProjectIntro.tsx` 16문구 수정, `src/App.test.tsx` 조건부 사과 금지 배열·완화 표현 목록·대표 세트(C1·C2) 동기화
- `full-review.md`·`representative-review.md` 새 문구 반영, `verification.md`에 수정 기록 추가
### 검토 결과
- 테스트 35개 통과(S 완화 1개 규칙·C 간결성·고유성 72·금지 표현), 조건부 사과·`혹시` 잔존 0건
- 말투 프리셋(체 선택)은 MVP Out 유지 — T22 수정 이유 코드(`awkward`·`tone`) 확인 후 재검토로 MVP.md 갱신
- '답장/먼저 보내기 모두 통과' 기준 수정은 SPEC 계약 변경이라 미반영 — 사례 확보 후 별도 제안
### 남은 작업
- 평가자 2인의 `full-review.md` 독립 재검수(전송 D 58/72·톤 24/24 게이트)와 불일치 시 제3자 판정
- C1·C2 대표 세트 변경분 포함 R1 사람 검수 통과 후 콘텐츠 버전 동결·R2 벤치마크
### 다음 추천 작업
- 평가자 2인 섭외를 즉시 시작하고, 재검수는 갱신된 검수지 버전으로만 수행

## 2026-07-12 (T10 복사 기능 완료 + UI 반응형 개선)
### 처리한 TODO
- UI 답답함 개선: PC(761px+)에서 마법사 폭 430→720px·방식/관계 카드 2열·결과 카드 여백 확대, 모바일 히어로 축소로 375×667 첫 화면에 S0 선택 2개 노출
- T10 복사 기능: 성공 시 버튼 "복사됨 ✓" 1.5초 전환 후 원복(타이머·언마운트 정리), sr-only `role="status"` 접근 피드백, 자리 표시자 카드 복사 시 "빈칸을 채워 보내주세요" 지속 안내, 새 후보 도착 시 안내 초기화
### 만든 결과물
- `src/App.css` 데스크톱 미디어 블록·모바일 히어로 보정·`.sr-only`, `src/ProjectIntro.tsx` 복사 상태 2분리(플래시/안내)·타이머, `src/App.test.tsx` 복사 테스트 3개 추가
### 검토 결과
- 테스트 38개(6파일) 통과, 린트·빌드·`git diff --check` 통과
- Playwright 실브라우저(모바일 뷰포트)에서 실제 클립보드 기록·플래시 전환·1.5초 원복·안내 지속 확인, S0~S3 모바일/PC 스크린샷 확인
- 토스트는 UX.md 4장대로 구현하지 않음(T23 실기기 확인 뒤 결정). CHECKLIST T10 체크
### 남은 작업
- T12(재시도 동선 — source별 라벨 분리·상황 수정 동선·리롤 실패 시 후보 유지 테스트), T13(이동 규칙), T14(모바일·접근성 마감)

## 2026-07-12 (T12 재시도 동선 완료)
### 처리한 TODO
- 템플릿 결과 버튼을 "내 상황에 더 맞추기"로 분리(같은 라벨에 다른 동작 숨기지 않기 — SCREENS S3 재시도 1차)
- "상황 수정"을 source별 분기: 템플릿=S2-a 상황 카드, AI=목적·입력 보존 S2-b (재시도 2차)
- 템플릿 카드 재선택 시 복사 안내 상태 초기화 누락 보완
### 만든 결과물
- `src/ProjectIntro.tsx` 라벨·동선 분기, `src/App.test.tsx` 재시도 테스트 4개 추가·1개 갱신 (rerender로 목 케이스 전환해 성공→리롤 실패·리롤 중 상태 재현)
### 검토 결과
- 테스트 42개(6파일)·린트·빌드·`git diff --check` 통과
- Playwright 실브라우저: 템플릿 라벨·S2-a 복귀·AI 라벨·입력 보존 4항목 확인. CHECKLIST T12 체크
### 남은 작업
- T13(이동 규칙), T14(모바일·접근성 마감 — aria-pressed·legend·aria-busy 등), T15~T16 시드, T25 사람 재검수

## 2026-07-12 (T13 이동 규칙 완료)
### 처리한 TODO
- SCREENS 81행 기준으로 모드 변경 동작 교정: S0 복귀만으로 입력을 지우지 않고 **모드를 실제로 바꿀 때만** 받은 메시지·상황·목적·결과를 초기화, 고른 관계는 유지
- 시나리오 변경 시 결과 폐기 추가(입력은 유지) — 이전 관계의 결과가 상태·세션스토리지에 잔존하던 간극 해소
- S2-a↔S2-b 이동·"처음으로" 전체 초기화는 기존 구현 확인
### 만든 결과물
- `src/ProjectIntro.tsx` `chooseMode`/`selectScenario` 조건부 초기화·`discardResult` 분리·`backToMode` 단순화, `src/App.test.tsx` 이동 규칙 테스트 3개
### 검토 결과
- 테스트 45개(6파일)·린트·빌드·`git diff --check` 통과
- Playwright 실브라우저: 같은 모드 재선택 입력 유지, 모드 변경 시 초기화+관계 유지(data-selected), 처음으로 후 S0·스토리지 제거 확인. CHECKLIST T13 체크
### 남은 작업
- T14(모바일·접근성 마감)가 1단계의 마지막 항목 — T6~T13·T27 의존 전부 충족되어 착수 가능

## 2026-07-12 (서비스 컴포넌트 개명: ProjectIntro → MessageFlow)
### 처리한 TODO
- 데모 시절 이름이 남아 있던 `src/ProjectIntro.tsx`를 SCREENS 컴포넌트 후보 트리의 정식 이름 `src/MessageFlow.tsx`로 개명 — 이 파일이 곧 실제 서비스 화면(S0~S3 전체)임을 코드 구조로 명시
- 컴포넌트·Props 타입·App/테스트 import 동기화. 동작 변화 없음. 하위 컴포넌트 분리는 T14에서 필요한 만큼만 진행
### 검토 결과
- 테스트 45개·린트·빌드 통과, `src/` 내 ProjectIntro 참조 0건. 과거 작업 기록 문서의 옛 파일명 언급은 이력이므로 유지

## 2026-07-12 (T14 모바일·접근성 마감 완료 + FSD 구조 개편)
### 처리한 TODO
- T14 간극 15개 수정: 내부 S0~S3 라벨 비노출(단계 번호로 교체), 목적 칩 `aria-pressed`+보이는 legend(fieldset), 생성 영역 `aria-busy`, 단계 전환 시 제목 초점+상단 스크롤, S2-a 답장 모드 "카드는 원문을 읽지 않아요" 안내, 진행 가장 대기 문구('거의 다 됐어요') 제거
- DESIGN.md AA 토큰 코드 반영(primary #357b9e·hover·pressed·muted #5f6e77·danger #9b453f), 전역 `:focus-visible`, `prefers-reduced-motion`, 44px 터치 타깃 4곳, 결과 카드 3장 동일 표면(SCREENS 126), 상황 카드 375 2열 유지(420 이하 1열 강제 제거), `overflow-wrap:anywhere`, 생성 CTA sticky+safe-area
- 사용자 요청으로 컴포넌트 분리 + FSD-lite 계층 구조 적용: `app / pages/message-flow / features(mode-select·scenario-select·situation-select·manual-input·copy-result) / entities/message / shared/generation`, 슬라이스별 index.ts 공개 API. 상황 카드 템플릿 72문구는 `entities/message/situationTemplates.ts`로 분리(T26 라우터·엔진의 선행 정리)
### 검토 결과
- 테스트 50개(신규 5: 단계 비노출·초점 이동·aria-pressed/legend·aria-busy/대기 문구·답장 안내)·린트·빌드·`git diff --check` 통과
- Playwright 실측: 320 scrollWidth 320(무넘침)·2열, 375 S0 두 선택 노출·2열, 대비 CTA 4.69:1·muted 5.27:1·톤 배지 6.25:1(DESIGN 목표치 일치), 결과 카드 단일 표면, 뒤로 버튼 44px, Tab 순회·Enter 진행·초점 이동 확인
- 구조 개편 후 이동 규칙·복사 실브라우저 스모크 재통과(동작 변화 0). CHECKLIST T14 체크
- 입력 삭제 동선은 S2-b(작성 내용 지우기)·S3(처음으로) 기존 노출 확인. sticky CTA로 S2-b에서 스크롤에 묻히지 않음
### 남은 작업
- 1단계 코드 전부 완료. 남은 항목: T15~T16(시드), T25(평가자 2인 재검수 — 외부 블로커), T26(T25 의존), T17~(3단계)

## 2026-07-12 (T15 시드 재검수 완료 + T16 검수지 준비)
### 처리한 TODO
- 감사 발견 3건 수정: G-B tone3(목요일 확정→목·금 선택 요청 복원), P-A 전 톤(첨부 행동 단정→"바로 보내드릴 수 있는데"로 의사 표현화), F-A tone3(입력 없는 "밥 살게" 약속 제거)
- 24개 전수 자체 스크리닝 재수행: 금지 항목 0건·사실 근거·세트 내용 동일성·톤 정합 통과. P-B tone3의 보충 문장 생략은 간결성(태도)으로 판정하고 블라인드 정렬에서 재확인하도록 기록
- `docs/SEEDS_REVIEW.md` 재생성(수정 문구 반영, 셔플·정답표 유지) — 사용 가능 상태로 전환
### 검토 결과
- CHECKLIST T15 체크. T16은 제3자 블라인드 정렬·전송 가능성 판정이 남아 **외부 검수자 확보 전까지 블로커**
### 남은 작업
- 남은 미완료 항목은 전부 외부 의존: T16(제3자 1인), T25(한국어 평가자 2인), T26(T25 통과), T17(Vercel 계정·사용자 승인), T18(R2 벤치마크 Provisional Go)

## 2026-07-12 (T17 비배포 준비 + R2 실행 킷)
### 처리한 TODO
- T17 실행 체크리스트 1번 완료: Node 버전 고정(`package.json` engines `^20.19.0 || >=22.12.0` + `.nvmrc` 22.12.0), `npm ci` 클린 설치 후 테스트 50·린트·빌드 전체 재현 확인
- CI 워크플로(`ci.yml`) 초안 작성 — CICD.md 규칙(워크플로 추가는 별도 제안·승인 후 수행)에 따라 저장소에 넣지 않고 승인 대기
- R2 무참여자 벤치마크 실행 킷 작성(`harness/tasks/2026-07-12-competitive-value-validation/r2-execution-kit.md`): 실행 전 조건, 답냥이 고정 12문구, C1~C4 A/B 복붙용 완성 프롬프트 8개, run 기록표 골격 — R1 통과 즉시 준비 지연 없이 실행 가능
### 남은 작업 (외부 의존)
- CI 설치 승인, Vercel 계정 연결(T17 2~7번), T16 제3자 1인, T25/R1 평가자 2인

## 2026-07-12 (CI 설치 승인·활성화 확인)
### 처리한 TODO
- 사용자 승인 후 `.github/workflows/ci.yml` 설치(push/PR 트리거, concurrency 취소, `.nvmrc` 기반 Node, `npm ci → lint → build → test`)
- 쌓인 변경을 6개 논리 단위로 분리 커밋(T14 / FSD 분리 / 시드 / Node·CI / R2 킷 / LOG) 후 푸시 — 각 커밋 시점 테스트·빌드 독립 통과
- CI 첫 실행 성공 확인(run 29193570731, verify 37s) — CICD.md 상태 갱신
### 남은 작업
- T17 잔여: required status check 지정·auto-merge 상호작용 확인(GitHub 설정), Vercel 계정 연결·프리뷰 배포
- 외부: T16 제3자 1인, T25/R1 평가자 2인 (R2 킷 준비 완료)

## 2026-07-12 (T17 원격 규칙 + 하네스 점검·개선)
### 처리한 TODO
- T17 단계 ①②⑤: origin main에 required status check `verify` 지정·재조회 확인(private 무료 저장소에서 403 없이 성공), auto-merge 상호작용 근거 기록(main 타겟 스킵 규칙과 비교차), Vercel custom events Hobby 미지원(Pro 전용) 확인 — T24는 "미지원 → 제약 기록 + T22 파일럿 대체" 경로. [계획서](../harness/tasks/T17-vercel-mock-deploy/plan.md)·[검증 보고서](../harness/tasks/T17-vercel-mock-deploy/verification.md)
- 하네스 점검: 정본 참조 경로 20개 전부 유효, 미치환 템플릿 항목 0건, AGENTS.md=CLAUDE.md 동기화, LOG 링크 규칙 준수 확인
- 하네스 개선 4건: ① T17 폴더에 검증 보고서 골격 생성(폴더 규칙 충족) ② T25 계획·검증 문서에 표준 상태 헤더 추가(상태 스캔 일관성 — 기존 본문 유지) ③ tasks/README 이름 규칙 표기 보정(`T` 접두사 대문자 예외) + 외부 평가자 응답 사본(`-R<번호>.md`) 저장 규칙 추가 ④ product-audit의 낡은 재개 조건 갱신(T14 실브라우저 증거로 AC-4 재검증 가능)
### 남은 작업
- T17 ③④: 사용자 Vercel 대시보드 연동 → 프로덕션·프리뷰 검증 → CICD/CHECKLIST/LOG 갱신
- product-audit AC-4를 T14 증거로 대조 재검증(별도 소작업)

## 2026-07-13 (UI 색 강화·폰트 정합·스플래시)
### 처리한 TODO
- 사용자 "전반적으로 색이 너무 연함" 지적으로 UI/UX 점검: 파스텔 5색 명도 90%+로 위계 소실 확인 + 점검 중 결함 발견 — 진행 표시 대기 단계 1.88:1(AA 실패), 포커스 링 알파 0.24, DESIGN.md 폰트 규칙 위반(Gowun Dodum 합성 굵기 650/750 전면 사용)
- DESIGN.md·SCREENS.md 정본 먼저 갱신 후 반영: primary #2e7397(CTA 5.23:1)·파스텔 5색·배경·테두리·칩 한 단계 진하게, text-muted #54636c(전 배경 4.9:1+), focus-ring 알파 0.45, 히어로 오버레이 완화, 본문 폰트 Noto Sans KR 400~700 복귀(합성 굵기 0건)
- 스플래시 신설(SP — 사용자 제안): 세션당 1회, 1.5초 후 페이드아웃, 탭·키 스킵, reduced-motion 무페이드, aria-hidden 장식 레이어. 테스트 6개 추가
- 검증: 대비 실측 16/16 PASS, 테스트 56/56(기존 회귀 0), 린트·빌드·diff 통과 — [계획서](../harness/tasks/2026-07-12-ui-color-splash/plan.md)·[검증 보고서](../harness/tasks/2026-07-12-ui-color-splash/verification.md)
### 남은 작업
- 사용자 실물 색감·스플래시 확인 → 검증 `통과` 처리 (색 강도는 취향 판단 포함)
- T17 ③④: Vercel 대시보드 연동(사용자) 대기 — 연동되면 새 색상이 프리뷰로 바로 확인 가능

## 2026-07-15 (T28 가이드형 챗 UI 구현·자동 검증)
### 처리한 TODO
- 사용자 승인에 따라 자유 대화형 챗봇이 아니라 기존 S0~S3·템플릿/AI 라우팅을 보존하는 가이드형 대화 UI로 제품·화면 계약을 변경하고 AGENTS.md=CLAUDE.md 미러 및 PRD/MVP/SCREENS/DESIGN/UX/SPEC/PLAN/CHECKLIST를 동기화
- 데스크톱 브랜드 패널+대화 패널, 모바일 단일 대화 흐름, 냥이 헤더, 관계별 색·이름 전환, 발자국형 4단계 진행, 이전 선택 사용자 말풍선, 냥이 질문, 빠른 답변, 결과 3개 말 꾸러미 구현
- 선택 턴은 기존 로컬 상태 전이만 사용하고 S2-b 전에는 빈 입력창을 노출하지 않음. 전체 transcript 전송·히스토리 저장·새 UI 라이브러리는 추가하지 않음
- 가이드 대화 전용 테스트 3개 추가(빠른 답변 시작, 선택 말풍선·관계별 냥이 전환, 결과 말 꾸러미·진행 완료) 및 기존 문구 기반 테스트 갱신
### 검토 결과
- 테스트 59개(7파일), lint, TypeScript+Vite build, `git diff --check`, AGENTS.md=CLAUDE.md, `src`의 `any` 0건 통과
- 현재 세션에 연결 가능한 인앱 브라우저가 없어 Browser 스킬의 우회 금지 지침에 따라 별도 자동화 브라우저를 사용하지 않음
### 남은 작업
- 320×568 무가로넘침·상황 2열, 375×667 첫 화면의 헤더·질문·첫 선택지, 키보드 순회·실제 초점·reduced-motion을 실브라우저로 확인한 뒤 CHECKLIST T28 체크
- T28 실물 확인 뒤 승인된 백엔드·DB 구성은 기존 의존성 게이트에 맞춰 별도 T항목으로 착수

## 2026-07-15 (MVP 확장 승인 — Three.js 캐릭터·백엔드 DB·단일 AI 워크플로)
### 결정 배경
- 사용자가 답냥이의 차별점을 귀엽고 친근한 고양이 캐릭터로 확정하고, 제공 이미지의 Three.js 표현과 백엔드·DB 구성을 MVP에 포함하도록 승인
- 교수님 등 관계·상황·목적을 사용자가 이미 선택하는 과업에서 RAG·자율 agent loop·런타임 멀티에이전트보다 1회 structured output 생성+결정적 검증이 적합하다는 경계를 확인
### 문서 반영
- MVP In에 Three.js/R3F 단일 Canvas 2.5D 냥이(T29), Vercel `/api/generate`, Neon PostgreSQL+Drizzle 원문 없는 운영 데이터(T30), 단일 AI 생성 워크플로를 추가하고 완전한 3D·RAG·런타임 멀티에이전트를 Out으로 명시
- SPEC/AI_DESIGN에 `prompt_versions`·`template_versions`·`generation_runs`·`evaluation_runs` 허용 데이터와 원문·생성 문구·IP·영구 사용자 ID 금지, 단일 호출→구조 검증→제한 재시도 계약을 추가
- PRD/README/PLAN/CHECKLIST/DESIGN/SCREENS/EDGE_CASES를 동기화하고 T29·T30·확장 MVP 통합 DoD T31을 신규 등록
### 구현 상태와 선행조건
- 이번 변경은 승인된 구조를 정본에 반영한 문서 작업이며 Three.js·DB·실 AI 코드는 아직 구현하지 않음
- T29는 사용자 캐릭터 에셋과 T28 실브라우저 확인, T30은 T17·T18을 선행조건으로 유지. 최종 통합 완료는 T31에서 전체 테스트·migration·모바일 폴백·원문 비저장을 함께 검증

## 2026-07-15 (`$build-cat-stage` 저장소 스킬 생성 + T29 에셋 확인)
### 처리한 TODO
- Codex 공식 저장소 스킬 위치 `.agents/skills/build-cat-stage`에 답냥이 전용 Three.js/R3F 절차를 생성하고 `.claude/skills/build-cat-stage` 호환 심볼릭 링크 추가
- 스킬 범위를 에셋 검사 → T28 의존 확인 → 브랜드 패널 단일 Canvas → `idle | selected | generating | result` → WebGL/reduced-motion 정적 폴백 → 모바일·접근성·번들 검증으로 제한. 범용 3D·완전한 리깅은 포함하지 않음
- 사용자 제공 `public/cats/dabnyangi-main.png` 확인: 1254×1254 RGBA, 투명 배경, 전신 실루엣. 단일 합성 이미지이므로 T29 모션은 호흡·부유·기울기 중심으로 제한
### 검토 결과
- `skill-creator`의 `quick_validate.py` 통과(`Skill is valid!`). 검증기 의존 PyYAML은 저장소가 아닌 `/private/tmp/build-cat-stage-validator`에만 설치
- AGENTS.md·CLAUDE.md 작업 절차에 `$build-cat-stage` 라우팅을 동기화
### 남은 작업
- T29 의존 T28의 실브라우저 확인을 위해 로컬 Vite 서버를 준비했으나 Browser runtime이 `No browser is available` 반환. Browser 스킬 지침에 따라 별도 Playwright로 우회하지 않고 T29 구현 착수 보류

## 2026-07-15 (T29 코드 우선 착수 승인)
### 승인 내용
- Browser runtime의 `No browser is available`가 재현된 상태에서 사용자가 T28 실브라우저 검증을 T31로 미루고 T29 코드·자동검증을 먼저 진행하도록 명시 승인
- T28 구현·59개 자동검증은 유지하고, T28·T29 완료 체크는 320×568·375×667·키보드·reduced-motion 통합 실브라우저 증거 전까지 보류
### 구현 경계
- `public/cats/dabnyangi-main.png` 단일 합성 에셋을 브랜드 패널의 Canvas 1개에서 사용. 분리 레이어가 없으므로 상태별 호흡·부유·기울기만 적용
- 루트의 `cat-thinking-chroma.png`·`cat-thinking-transparent.png`는 사용자 원본으로 보존하고 T29에서 이동·수정하지 않음

## 2026-07-15 (T29 Three.js/R3F 냥이 코드·자동검증 완료)
### 구현
- React 19 호환 `@react-three/fiber` 9.6.1 + `three` 0.185.1 및 TypeScript 타입 추가. `CatStage`는 정적 PNG를 먼저 렌더하고 WebGL·모션 허용 환경에서만 `CatCanvas`를 lazy import
- 기존 `/demo-hero.png`를 브랜드 패널의 `public/cats/dabnyangi-main.png` 단일 Canvas로 교체. 브랜드 제목·설명·특징은 DOM에 유지하고 Canvas 전체를 장식으로 격리
- `idle | selected | generating | result` 상태를 기존 S0~S3·생성 상태에 연결하고 단일 합성 이미지에 맞춰 부유·호흡·얕은 Y축·Z축 기울기와 바닥 그림자만 적용
- WebGL 미지원, `prefers-reduced-motion`, Canvas 렌더 오류에서는 같은 PNG 정적 이미지로 폴백. 관계 카드는 Canvas를 만들지 않음
### 자동 검증
- CatStage 단위 테스트 6개: WebGL 미지원 정적 폴백, WebGL Canvas 1개, reduced-motion·2코어 이하 저사양 정적 모드, 에셋 실패 냥 배지, 렌더 오류 복귀. App 통합 테스트에 idle/selected/generating/result 연결 추가
- 메인 JS는 기존 220.92kB/69.23kB gzip에서 224.27kB/70.63kB gzip으로 +3.35kB/+1.40kB. Three.js/R3F는 별도 lazy chunk 882.64kB/234.53kB gzip으로 분리
- 전체 66개 테스트·lint·TypeScript/Vite build·diff 검사 통과. lazy chunk가 500kB minified 경고를 내지만 초기 main chunk와 분리되어 있고 런타임 총량은 T31 실기기에서 재확인
### 남은 작업
- Browser runtime 미제공으로 시각·실기기 증거 없음. T28·T29 체크는 유지하고 T31에서 320×568·375×667, 키보드, Canvas 비차단, reduced-motion 정적 렌더, 상태 모션을 통합 검증

## 2026-07-15 (T25 대표 문구·말투 안내 재수정)
### 조사·결정
- 대표 12문구 run1과 수정안을 재검토했다. run1은 정족수·문항 오독·톤 중복 선택 문제로 무효 상태를 유지하며 합격 근거로 사용하지 않음
- 국립국어원 상대 높임법 분류와 한국어 공손성·모바일 메신저 연구를 대조한 결과, `습니다체 / 이다체 / 다나까체`는 서로 독립된 공통 선택 축이 아니고 공손성은 종결어미만으로 결정되지 않는다고 판단
- 새 말투 필드나 사전 선택 단계를 추가하지 않고 S3 제목을 `어떤 말투로 보낼까냥?`으로 바꿔 기존 `기본 / 더 부드럽게 / 더 분명하게` 결과 선택을 명확히 함
### 문구 수정
- 교수·조교 면담 세트 세 후보 모두 `여쭤볼 내용`을 밝혀 목적을 보강하고, 입력에 없는 행동 약속 대신 `편하실 때`로 선택권을 남김
- 선배·동기 편한 말투 세트는 양 평가자가 공통으로 판단한 직접성 순서로 재배치하고, 기본은 반말·존댓말 선택권, 부드러운 안은 `혹시 편하시면`, 분명한 안은 짧은 허용 표현으로 재작성
- 대표 검수지·키, 전수 검수지, T25 계획·검증 기록, R2 실행 킷, SPEC·SCREENS·회귀 테스트를 동기화. 전수 검수지의 기존 FR-THX-B 불일치(`챙겨줘서`→정본 `알려줘서`)도 함께 수정해 72/72 일치를 확인
### 검증·남은 게이트
- 전체 8개 파일 66개 테스트, lint, TypeScript/Vite build, `git diff --check` 통과
- T25는 완료 처리하지 않음. 수정된 폼에서 작성자가 아닌 외부 평가자 2인의 독립 재검수와 불일치 시 제3자 판정이 남아 있음

## 2026-07-15 (T25 대표 12문구 1차 블라인드 설문 집계 — R1 판정 보류)
### 처리한 TODO
- 대표 12문구 평가 설문(Google Forms) 응답 2건(7/13 외부 E1, 7/15 작성자 본인 E2)을 검수지 최종 집계 항목대로 스크립트 집계
- 결과 기록을 `harness/tasks/T25-situation-card-templates/representative-review-run1.md`, 폼 문항·문구 수정안을 같은 폴더 `representative-review-revision.md`로 작성
### 검토 결과
- 1차 회차 **무효 — R1 통과 근거로 사용하지 않음**. 사유 3건: ① E2가 작성자 본인이라 "작성자 아닌 평가자 2인" 정족수 미충족 ② E1이 사실 추가 문항 24칸 전부 "예"로 답했으나 문구에 해당 사실이 없고 전송 가능 12/12와 모순 — 문항 방향 오독 정황 ③ 톤 정렬 문항이 중복 선택을 허용해 4세트 무효
- 유효 신호: C3 톤 순서는 두 평가자가 독립적으로 같은 방향으로 불일치(C3-A를 가장 직접적으로 판단) — toneLevel 재배치 제안. C2-B 면담 목적 부재(E1), 말투 어색함(E2 자연스러움 0점 3건)은 재검수에서 확정
- 원자료 CSV는 평가자 실명이 있어 Git에 커밋하지 않고 로컬 보관, 문서에는 익명 코드(E1·E2)만 기록
### 남은 작업
- 수정안 승인 → C3 toneLevel 재배치(·선택 시 C2-B 보강)를 `situationTemplates.ts`·검수지에 반영하고 preflight 재실행 → 폼 수정(연습·선별 문항, 그리드 제한) → 외부 평가자 2인 재실행 → 불일치 시 제3자 판정

## 2026-07-15 (T29 관계별·생성 상태 냥이 에셋 연결)
### 구현
- 사용자 추가 이미지 8종을 시각·파일 검사해 모두 1254×1254 RGBA 투명 PNG임을 확인했다. 루트의 투명/크로마 원본은 이동·수정하지 않고 런타임용 사본만 `public/cats`에 배치
- 관계 카드와 선택 후 대화 헤더에는 팀플냥·교수냥·선배냥·연인냥 정적 아바타를 연결했다. 별도 아바타가 없는 선배냥만 같은 전신 에셋을 CSS로 얼굴 중심 크롭하고, 관계 카드에는 Canvas를 추가하지 않음
- 브랜드 패널의 단일 `CatStage`는 관계 선택 전 대표 답냥이, 선택 뒤 해당 관계 전신, AI 생성 중 생각하는 답냥이로 에셋을 교체한다. 동적 교체 뒤에도 WebGL 준비 전 정적 이미지, reduced-motion·저사양·이미지/Canvas 오류 시 정적 이미지 또는 `냥` 배지를 유지
### 자동 검증·성능 기록
- 관련 3파일 43개 및 전체 8파일 68개 테스트, lint, TypeScript/Vite build, `git diff --check`, `src` 명시적 `any` 0건, AGENTS.md=CLAUDE.md 통과. 런타임 PNG 9개 모두 1254×1254 RGBA 확인
- main 224.83kB/70.79kB gzip, 지연 CatCanvas 882.64kB/234.53kB gzip. `public/cats`는 약 6.7MiB이고 S1 정적 아바타 4종은 약 2.8MiB여서 실제 초기 로드·캐시 체감은 T31 모바일 성능 검증에 포함
- 상세 기록: [계획서](../harness/tasks/T29-cat-stage/plan.md)·[검증 보고서](../harness/tasks/T29-cat-stage/verification.md)
### 남은 작업
- Browser runtime 미제공으로 320×568·375×667의 얼굴 크롭·배치·가로 넘침, WebGL 단일 Canvas 비차단, reduced-motion·상태 모션을 실물로 확인하지 못했다. T29 체크는 유지하고 T31 통합 실브라우저/실기기 검증 뒤 완료 판정

## 2026-07-15 (답냥이 개발 AI 오케스트레이션 스킬)
### 설계·구현
- 사용자가 승인한 PM·제품 디자이너·프론트엔드·백엔드/AI 구성을 제품 런타임이 아닌 저장소 개발 절차로 구현. PM을 단일 통합자로 두고, 의존성·공유 계약·파일 소유권을 고정한 뒤 필요한 전문 역할만 활성화하도록 제한
- `.agents/skills/orchestrate-dabnyangi-task`에 역할 선택·dispatch·충돌 처리·표준 인계·교차 검토 절차와 역할 계약 참조를 추가하고 `.claude/skills` 호환 링크 및 AGENTS.md=CLAUDE.md 라우팅을 동기화
- `docs/AI_DESIGN.md`에 개발 멀티에이전트가 `/api/generate`의 단일 structured output·결정적 검증 계약을 바꾸지 않는다는 경계를 명시. 앱 코드·제품 의존성·CHECKLIST 완료 상태는 변경하지 않음
### 전방 테스트·검증
- 읽기 전용 3건 통과: UX 문구는 PM+디자이너만, migration은 PM+백엔드/AI만 선택했고, 교수님 직접입력 수직 작업은 선행 게이트 미완료를 확인해 구현 역할을 활성화하지 않은 뒤 향후 소유 경계를 제시
- `skill-creator` validator `Skill is valid!`, AGENTS.md=CLAUDE.md, 심볼릭 링크, 미치환 토큰 0건, `git diff --check` 통과. 앱 코드·의존성 미변경이라 test/lint/build는 해당 없음
- 상세 기록: [계획서](../harness/tasks/2026-07-15-ai-orchestration/plan.md)·[검증 보고서](../harness/tasks/2026-07-15-ai-orchestration/verification.md)·[전방 테스트](../harness/tasks/2026-07-15-ai-orchestration/forward-test.md)
### 후속
- 다음 적합한 실제 교차 영역 작업에서 `$orchestrate-dabnyangi-task`를 적용하고, 병렬 처리 시간·재작업·파일 충돌·토큰 비용을 측정해 역할 활성화 기준을 보정

## 2026-07-15 (T28 실브라우저 검증 재시도 — Browser backend 없음)
### 실행
- “다음 작업” 규칙에 따라 의존성이 충족된 최선행 미완료 T28의 모바일·키보드·reduced-motion 실브라우저 검증을 재개하고 [계획서](../harness/tasks/T28-guided-chat-ui/plan.md)·[검증 보고서](../harness/tasks/T28-guided-chat-ui/verification.md) 작성
- Vite 로컬 앱은 `127.0.0.1:5173`에서 정상 기동. Browser 공식 runtime으로 해당 URL 선택을 시도했으나 `No browser is available` 반환
- troubleshooting 절차에 따라 기존 runtime을 유지하고 browser 목록을 한 번 조회했으나 `[]` 반환. 표시된 플러그인 버전의 진단 문서 경로가 오래되어 실제 설치 버전 문서를 확인한 뒤 같은 공식 절차를 수행
### 판정·후속
- 별도 Playwright·다른 자동화로 우회하지 않고 보류. 앱 코드와 CHECKLIST는 변경하지 않았으며 T28·T29 체크는 계속 미완료
- 인앱 Browser 또는 Chrome backend가 제공되는 세션에서 375×667·320×568, 키보드·초점·reduced-motion 검증부터 재개. 사용자가 원하면 그 전에는 독립적으로 착수 가능한 T16 또는 T25 외부 재검수를 진행

## 2026-07-15 (T28 사용자 수동 검증 확인·완료)
### 완료 근거
- 사용자가 외부 환경에서 T28 검증 완료를 명시 확인. 375×667 첫 화면, 320×568 무가로넘침·상황 2열, 화자 구분, 키보드·단계 초점, reduced-motion의 수동 AC를 통과한 것으로 기록
- 현재 작업트리에서 전체 8파일 69개 테스트, lint, TypeScript/Vite build, `git diff --check` 재통과. main 225.12kB/70.87kB gzip, 지연 CatCanvas 882.64kB/234.53kB gzip의 기존 경고는 T31 성능 게이트로 유지
- [T28 계획서](../harness/tasks/T28-guided-chat-ui/plan.md)·[검증 보고서](../harness/tasks/T28-guided-chat-ui/verification.md)를 종료하고 CHECKLIST T28 완료 처리
### 한계·인계
- 사용자가 직접 확인한 원시 스크린샷·좌표·초점 로그는 하네스에 저장되지 않았음을 명시. 별도 증거 제출이 필요한 평가에서는 다시 캡처해야 함
- T29는 코드·자동검증과 T28 완료에도 불구하고 자체 계획대로 T31 통합 실브라우저 검증 전까지 미완료 유지

## 2026-07-15 (다음 작업 의존성 감사 — T17 Vercel 연동 대기)
### 판정
- T28 완료 뒤 미완료 항목을 재대조했다. T29는 T31 통합 검증 보류, T25는 수정된 외부 평가자 2인 응답 대기, T26은 T25 의존, T18 이후는 T17·T25/R2 등 선행 게이트 미충족
- 다음 선행 작업은 T17 Vercel Git 연동이지만 현재 저장소에 `vercel` CLI와 `.vercel/project.json`이 없고 배포 URL도 없어 사용자 계정의 GitHub Import가 필요
### 재개 조건
- Vercel에서 `Catsmanager/hub` Import → Vite 자동 감지 → Production Branch `N166_진현지` 지정 → 최초 배포 URL 제공. 이후 [T17 계획](../harness/tasks/T17-vercel-mock-deploy/plan.md)·[검증 보고서](../harness/tasks/T17-vercel-mock-deploy/verification.md)의 AC-5~8 재개

## 2026-07-15 (T17 Vercel 최초 배포 감사 — 설정 보완 필요)
### 확인 결과
- 사용자 제공 URL의 GitHub deployment는 Vercel bot이 `Production` 환경에 성공 상태로 생성. GitHub–Vercel 연결 자체는 확인
- 실제 deployment SHA는 기본 브랜치 `main`의 `a44ede9`(2026-07-03 PR 템플릿 변경)이며 목표 `N166_진현지` 원격 `f585627`, 로컬 HEAD `fd20b15`와 불일치. 로컬 브랜치는 원격보다 5커밋 앞이고 현재 대규모 미커밋 작업도 배포에 포함되지 않음
- 공개 HEAD 요청은 HTTP 302로 `vercel.com/sso-api`에 이동해 답냥이 S0 렌더를 확인할 수 없음. 자동 Browser backend도 미제공
### 보완·재개
- Vercel Settings → Environments → Production → Branch Tracking을 `N166_진현지`로 변경하고 Production Deployment Protection을 공개 검증 가능한 상태로 조정한 뒤 재배포 필요
- 최신 작업트리 배포에는 커밋·푸시가 필요하지만 AGENTS 규칙상 사용자 요청 전에는 수행하지 않음. 새 Production URL 수신 후 S0 접근, 별도 비프로덕션 브랜치 push 후 preview URL을 검증해야 T17 완료 가능

## 2026-07-15 (제품 6축 감사 AC-4 재검증·종료)
### 재검증 근거
- 2026-07-11 감사에서 Browser backend 부재로 남았던 모바일 AC-4를 T14 완료 기록과 대조했다. T14의 320px 무가로넘침·상황 2열, 375px S0 선택 노출, 44px, 대비 실측, Tab·Enter·단계 초점 이동, 이동·복사 스모크가 감사 요구를 충족함을 확인
- `docs/PRODUCT_REVIEW.md`의 낡은 "브라우저 검증 미수행" 문구를 T14 완료 사실로 바로잡고, 이후 도입된 가이드형 UI·Three.js의 실물 검증은 T28·T29·T31의 별도 게이트로 분리
### 판정
- [제품 감사 계획](../harness/tasks/2026-07-11-product-audit/plan.md)을 종료하고 [검증 보고서](../harness/tasks/2026-07-11-product-audit/verification.md)를 `통과` 처리. 비-T 문서 감사이므로 CHECKLIST 완료 상태와 앱 코드는 변경하지 않음
- 디자이너 읽기 전용 교차 검토도 같은 판정. 근거는 T10~T14 누적 브라우저 기록이며 단일 E2E 캡처가 아니다. 실제 모바일 가상 키보드·카카오톡 인앱 복사는 T23, Three.js 실기기 검증은 T29·T31에 유지

## 2026-07-15 (T29 런타임 냥이 WebP 최적화)
### 구현·성능
- 설문·배포 외에 즉시 가능한 작업으로 T29의 기록된 이미지 전송량 위험을 우선 처리. 1254×1254 PNG 원본은 수정·삭제하지 않고 카드·헤더용 384px, 스테이지용 1024px 투명 WebP 10개를 quality 92·alpha quality 100으로 생성
- 대표 답냥이는 1024px 53,662-byte 파일을 헤더·스테이지가 공유. 선배냥은 새로 확인한 `senior-cat-avatar-transparent.png` 전용 얼굴·상반신 원본으로 384px 아바타를 다시 만들고 1024px 전신 스테이지와 분리해 임시 CSS 크롭 플래그 제거. 런타임 경로의 PNG 참조는 0건
- 런타임 고유 에셋 총량은 PNG 7,042,525 bytes에서 WebP 512,178 bytes로 92.7% 감소. PNG 원본은 보존되어 배포 파일에는 남지만 페이지 런타임 경로에서 요청하지 않음
### 품질·검증
- 디자이너 읽기 전용 검토로 실제 34~56px 아바타·최대 약 500px/DPR 1.5 스테이지 대비 384/1024 해상도 여유, 선·눈·작은 소품·투명 가장자리·선배냥 크롭 기준 확인
- 흰색·짙은 배경 전수 및 개별 파스텔 합성에서 실루엣·소품·halo 이상 없음. 원본 리사이즈 대비 알파 평균 차이 0.000, 가시 채널 평균 차이 0.278~0.463. 다중 파스텔 시트는 검사 도구의 알파 미리보기 오류가 있어 개별 RGB 합성과 원시 픽셀로 교차 확인
- 관련 3파일 44개·전체 8파일 69개 테스트, lint, TypeScript/Vite build, `git diff --check` 통과. 최종 선배냥 전용 아바타 반영 뒤 main 225.36kB/70.92kB gzip, 지연 CatCanvas 882.64kB/234.53kB gzip의 기존 경고 유지
### 당시 남은 게이트
- 이 시점에는 T29 완료 체크를 보류했다. 이후 사용자 직접 검증 결과는 바로 다음 기록에 남기며, T31에서는 지연 청크 체감을 포함해 통합 회귀검증한다

## 2026-07-15 (T29 사용자 직접 실브라우저 검증 완료)
### 완료 근거
- 사용자가 외부 환경에서 T29 검증 완료를 명시 확인. 320×568·375×667의 관계 아바타/텍스트 배치, 단일 WebGL Canvas의 관계 전신→생각냥 전환과 DOM 조작 비차단, reduced-motion 정적 폴백을 통과한 것으로 기록
- 앞서 통과한 전체 69개 테스트·lint·build·diff, WebP 규격·알파·용량 검증과 결합해 T29 계획·검증 보고서를 종료하고 CHECKLIST를 완료 처리
### 증거 한계·후속
- 사용자 직접 검증의 원시 스크린샷·좌표·콘솔·성능 로그는 하네스에 저장되지 않았다. 외부 제출용 증거가 필요하면 T31 최종 통합 검증에서 다시 캡처하며 Three.js 지연 청크 체감도 회귀 확인한다

## 2026-07-15 (T18 코드 우선 백엔드 기반 구현)
### 승인·의존성 예외
- 사용자가 백엔드 구조 수립과 작업 시작을 명시 승인했다. T17, T25 대표 source preflight, COMPETITIVE_VALIDATION R2 `Provisional Go`가 남아 있으므로 실 provider·키·배포 없이 로컬 provider 비종속 서버 기반만 먼저 구현하고 T18 완료 체크는 보류
- `$orchestrate-dabnyangi-task`로 PM이 계약·정본·통합을, 백엔드/AI가 `api/**` 구현을, 프론트엔드가 기존 생성 계약 읽기 전용 검토를 담당. 디자이너는 서버 작업이라 비활성
### 구조·구현
- 공식 Vercel Node Function의 fetch Web Standard 형식으로 `api/generate.ts`를 추가하고, 함수로 변환되지 않는 밑줄 경로 `api/_lib/generation`에 dependency-injected handler, provider 실패 계약, 10회/60초 인메모리 limiter, 원문 없는 metrics sink와 테스트를 분리. `/api` 루트의 일반 파일은 실제 진입점 하나만 유지
- 직접입력 AI 요청만 POST JSON으로 수락하고 카드 요청은 400. 공용 validator로 정상 후보를 `source: ai` 3개로 정규화하며 공개 오류는 400 `invalid_request`, 429 `rate_limited`, 500 `generation_failed`만 반환
- provider 경계에 18초 `AbortController` deadline과 출력 상한 1024를 전달. transient 5xx·잘못된 구조만 전체 deadline 안에서 최대 1회 재시도하고 provider 4xx·429·유해 출력은 재시도하지 않음
- 운영 메트릭 타입은 route/scenario/purpose/status/attempt/latency만 허용하며 받은 메시지·상황 설명·생성 문구·IP/client key를 포함하지 않는다. 현재 production sink는 no-op이고 provider도 명시적 unconfigured라 프론트는 계속 목을 사용
- `tsconfig.api.json`과 `npm run typecheck:api`를 추가해 프론트 빌드 밖 서버 코드를 별도 검사. 프론트 계약 검토 결과 현재 UI 변경은 불필요하고 T20에서 HTTP `GenerationResult` 어댑터만 추가하면 됨
### 검증·남은 게이트
- API 3파일 19개·전체 11파일 88개 테스트, API 타입검사, lint, build, `git diff --check`, `api` 명시적 `any`·운영 `console` 0건, RAG·런타임 멀티에이전트 의존성 0건 통과. 기존 jsdom `scrollTo`, `/paw.png`, lazy CatCanvas 500kB 경고는 비차단
- limiter는 서버리스 인스턴스별 best-effort이고 client key는 60초 window용 인스턴스 메모리에만 일시 존재한다. Vercel Fluid Compute/함수 max duration이 18초보다 긴지는 T17에서 확인한다. 18초·1024는 T20 실측 전 잠정값
- 실제 provider adapter·키는 T17·T25 대표 preflight·R2 `Provisional Go` 뒤 연결해 T18을 닫고, T19에서 프롬프트·structured output·`stop_reason`, T20에서 프론트 HTTP 어댑터를 진행
- 상세 기록: [T18 계획서](../harness/tasks/T18-api-generate/plan.md)·[검증 보고서](../harness/tasks/T18-api-generate/verification.md)

## 2026-07-15 (가이드형 대화 UI 사용자 화자 카피 정리)
### 판단·구현
- 사용자가 카드 화면을 뒤로 이동한다고 느끼는 문제를 해결하기 위해 자유 대화형 챗봇으로 전환하지 않고 기존 S0~S3·템플릿/AI 라우팅을 유지
- 상황 예외 선택을 사용자 화자의 `직접 설명할게요` 라벨로 바꾸고, 복귀 동선은 `자주 쓰는 상황에서 고르기`·`관계 바꾸기`로 사용자 목적을 표시
- 결과의 서로 다른 복귀 동작을 공통 `상황 수정`에 숨기지 않고 템플릿은 `상황 다시 고르기`, AI는 `입력 내용 수정하기`로 구분. 입력 보존·결과 폐기 동작은 변경하지 않음
### 정본·검증
- AGENTS.md=CLAUDE.md, PRD·SCREENS·SPEC·MVP·CHECKLIST 등 현재 제품 문서의 사용자 라벨과 직접 설명 경로명을 동기화. 과거 이력인 LOG의 기존 기록은 재작성하지 않음
- 관련 App 흐름 테스트 33개 및 전체 11파일 88개 테스트, lint, TypeScript/Vite build, `git diff --check`, `any` 미사용, AGENTS.md=CLAUDE.md 통과. 기존 Three.js 지연 청크 크기 경고와 `/paw.png` 런타임 해결 안내는 이번 카피 변경과 무관하게 유지

## 2026-07-15 (T19 코드 우선 프롬프트 골격 구현)
### 승인·의존성 예외
- CHECKLIST의 T16 체크와 달리 `docs/SEEDS.md`에는 제3자 블라인드 정렬·전송 가능성 검수가 대기로 남고, T18도 실 provider·키가 없는 미완료 상태임을 확인
- 사용자에게 불일치를 알린 뒤 실제 24개 시드 이관·provider/키/DB/프론트 연결을 제외한 서버 전용 T19 골격만 먼저 구현하도록 명시 승인받음. T19 완료 체크는 보류
### 구조·구현
- `api/_lib/prompt/`의 정본 구조대로 system 역할·사실/안전 원칙, 4개 관계 규칙, 6개 목적 규칙, `GeneratedReply` JSON Schema, 예시 주입 검증, 최종 조립을 6개 모듈로 분리
- few-shot은 운영 상수로 만들지 않고 동일 관계의 정확히 2세트를 파라미터로 받는다. 각 세트의 상황·받은 메시지 길이와 후보 3개·toneLevel 1/2/3·비어 있지 않음·중복·유해 표현을 공용 validator로 재검사
- 예시와 현재 입력을 별도 XML 데이터 블록으로 구성하고 `& < > " '`를 이스케이프한다. 시스템 지시에 데이터 내부 역할·형식 변경 지시 무시, 예시 사실 전이 금지, 입력 밖 이름·날짜·수치·사유·약속 금지와 자리 표시자 정책을 명시
- 현재 공식 `output_config.format` JSON Schema를 provider 비종속 요청 조각으로 제공하고 `stop_reason === "end_turn"`인 JSON만 공용 `GeneratedReply` validator로 재검증. 절단·거절·도구 호출·잘못된 JSON·톤 중복·명백한 협박 결과는 거절
### 검증·남은 게이트
- 운영 시드와 겹치지 않는 합성 fixture만 사용한 관련 4파일 24개·전체 15파일 113개 테스트, API 타입검사, lint, TypeScript/Vite build, tracked/untracked diff, 명시적 `any`·console·클라이언트 참조·검수 전 시드/provider 연결 금지 검색 통과
- 첫 전체 빌드에서 기존 T29 에셋 존재 테스트의 `node:fs`·`node:path` 타입 참조 누락을 발견했다. 앱 전역 타입 설정을 넓히지 않고 해당 테스트 파일에만 Node 타입 참조를 추가한 뒤 빌드 통과. 제품 런타임 동작 변화 없음
- XML·structured output은 주입 완화책이지 완전한 보안 경계가 아니다. 실제 검수 완료 시드 이관, provider adapter 연결, 상충 지시 holdout·실 응답 평가는 T16·T18 이후 남아 있음
- 상세 기록: [T19 계획서](../harness/tasks/T19-prompt/plan.md)·[검증 보고서](../harness/tasks/T19-prompt/verification.md)

## 2026-07-16 (T32 개인 말투 프리셋 코드·자동 검증 완료)
### 승인·구현
- 사용자 검수에서 의미는 정확해도 평소 말투와 달라 재수정이 필요하다는 피드백을 반영하고, 사용자 선택을 `습니다체 / 요체 / 이다체 / 용용체`로 확정했다. 첫 적용 범위는 `직접 설명할게요` AI 경로이며 카드 72문구의 T25 자연스러움 보완과 분리했다.
- `습니다체·요체`는 모든 관계, `이다체·용용체`는 친구·연인만 허용한다. S2-b 목적 아래 필수 native radio로 라벨·예시를 표시하고, 선택은 기존 30분 sessionStorage에 복원하되 오염값·관계 위반·전체 초기화에서 안전하게 지운다.
- 공용 `GenerationRequest`의 AI 경로에 `speechStyleId`를 필수화하고 카드 요청에는 금지했다. 서버 handler가 누락·관계 위반을 400으로 거절하며, mock은 관계×말투별 기존 세 톤을, prompt는 `<speech_style_id>`와 결정적 말끝·few-shot보다 현재 선택 우선 규칙을 사용한다.
- S3 질문은 개인 말끝과 세 톤 축을 구분하도록 `어느 톤으로 보낼까냥?`으로 바꾸고 AI 결과 설명에서 선택한 말투를 확인한다. 응답 schema·운영 메트릭·provider/DB·영구 프로필은 변경하지 않았다.
### 역할·검증
- `$orchestrate-dabnyangi-task`로 PM이 공유 계약·정본·통합을 맡고, 프론트엔드와 백엔드/AI를 파일 소유권별 병렬 구현한 뒤 디자이너가 실제 UI diff를 읽기 전용 교차 검토했다. 교차 검토에서 mock의 관계별 후보 회귀를 발견해 관계×말투 구조로 보완했다.
- 전체 15파일 130개 테스트, API 타입검사, lint, TypeScript/Vite build, `git diff --check`, AGENTS.md=CLAUDE.md, 변경 코드 명시적 `any` 0건 통과. 기존 jsdom `scrollTo` 로그와 지연 CatCanvas 500kB 경고만 유지했다.
- 평가자 정보가 있을 수 있는 미추적 T25 설문 CSV는 읽기 전용으로 보존하고 변경·추적하지 않았다. 커밋·푸시는 수행하지 않았다.
### 남은 게이트
- Browser runtime 선택이 `No browser is available`, 목록이 `[]`를 반환해 320×568·375×667 무가로넘침과 실제 Tab·방향키 라디오 선택은 확인하지 못했다. CSS 한 열·44px와 RTL·디자이너 소스 검토는 통과했지만 필수 수동 증거 전까지 T32 CHECKLIST 완료 체크는 보류한다.
- 실 provider의 네 말투 준수 품질과 output validator의 의미적 판별은 T20~T21에서 검증한다. 상세 기록: [T32 계획서](../harness/tasks/T32-speech-style-presets/plan.md)·[검증 보고서](../harness/tasks/T32-speech-style-presets/verification.md)

## 2026-07-16 (T32 카드 포함 네 말투 확장 구현)
### 승인·범위
- 사용자는 사람 검토가 계속 필요하더라도 구현을 늦추지 않고 전체 초안을 먼저 만든 뒤 반복 수정하도록 승인했다. 이에 앞선 AI 전용·관계 제한 기록은 1차 이력으로 보존하고, 최종 구현 범위를 카드와 `직접 설명할게요` 양쪽·네 관계·네 말투로 확대했다.
- 카드 조회 키를 `scenarioId × situationId × speechStyleId`로 확장하고 B/S/C 전달 강도는 별도 축으로 유지했다. 영구 프로필·자유 말투 입력·provider/DB·운영 메트릭 구조는 추가하지 않았다.
### 구현·검토 자료
- S2-a 카드 위에 네이티브 라디오 말투 선택을 두고, 미선택 시 카드만 비활성화하며 `직접 설명할게요` 진입은 유지했다. S2-a와 S2-b는 기존 30분 세션의 단일 `speechStyleId`를 공유하고 관계 변경 시 유지·전체 재시작 시 초기화한다.
- 4관계×6상황×4말투×3톤 = 288개 정적 초안을 작성하고 96행 검토표 `harness/tasks/T25-situation-card-templates/speech-style-review-draft.md`와 동기화했다. 288문구는 검수 완료가 아니며 T25 완료 체크도 보류했다.
- 공용 카드·AI 계약, 관계별 mock, 서버 prompt 규칙을 네 관계×네 말투에 맞췄다. 관계 존칭·안전 규칙은 개인 말끝보다 우선하며, 유효한 카드 요청은 서버 AI 경로로 보내지 않는다.
### 역할 교차 검토·자동 검증
- `$orchestrate-dabnyangi-task`로 PM이 공유 계약·정본·통합, 디자이너가 288문구·검토표, 프론트엔드가 S2-a/S2-b 흐름, 백엔드/AI가 mock·prompt·handler를 소유했다. 디자이너 최종 읽기 전용 검토에서 필수 UI 수정은 없었고, 서비스 명칭과 달랐던 테스트 제목 데이터 1건만 `친구·연인`으로 맞췄다.
- 콘텐츠 전용 9개 불변조건이 96세트·288문구·전체 고유성·조회 누락 0건, 자리 표시자·사과 수, 입력 없는 사실·약속과 조건부 사과 금지, 말투 최소 표지, C≤S를 확인했다. App 44개, 콘텐츠 관련 14개, 전체 16파일 164개 테스트와 API 타입검사, lint, build, `git diff --check`, AGENTS.md=CLAUDE.md, 변경 코드 명시적 `any` 0건을 통과했다.
- 기존 jsdom `scrollTo` 로그와 지연 CatCanvas 500kB 경고는 유지됐다. 평가자 정보가 있을 수 있는 미추적 T25 CSV는 읽거나 변경·추적하지 않았고 커밋·푸시도 수행하지 않았다.
### 남은 게이트
- 교수·조교와 선배·동기의 이다체·용용체, 친구·연인의 습니다체를 우선 사람 검토한다. 자동 말끝 표지는 관계 자연스러움·실제 전송 가능성의 합격 근거가 아니다.
- Browser backend가 없어 320×568·375×667에서 네 옵션 높이·스크롤 부담·줄바꿈과 실제 Tab·방향키 조작은 확인하지 못했다. 구현은 인계 가능하지만 이 증거와 T25 사람 검토 전까지 T32·T25 CHECKLIST 완료 체크는 유지 보류한다.

## 2026-07-16 (냥이 정적 이미지 경로 복구)
### 원인·복구
- 화면의 `/cats/*.webp`·`/paw.png`·`/favicon.svg`가 모두 깨진 상태에서 런타임 정적 루트인 `public` 디렉터리가 없고 같은 파일이 `node_modules/public`에 남아 있음을 확인
- 사용자 제공 PNG 원본을 수정하지 않고 `public` 위치를 복구. 런타임 WebP 10개와 발자국·파비콘 파일 형식을 확인하고, 코드가 참조하는 냥이 WebP가 실제 `public` 경로에 존재하는지 검사하는 회귀 테스트를 추가
### 검증·한계
- Vite 생산 빌드의 `dist` 안에 WebP 10개·`paw.png`·`favicon.svg` 전부가 포함되고 `public` 원본과 각각 SHA-256이 일치함을 확인
- 전체 17파일 195개 테스트, lint, TypeScript/Vite build, API 타입 검사, `git diff --check` 통과. 기존 jsdom `scrollTo` 로그와 지연 CatCanvas 500kB 경고만 유지
- Browser runtime 선택은 `No browser is available`, 목록은 `[]`를 반환해 실브라우저 화면 증거는 추가하지 못했다. 대신 에셋 형식·파일 존재·빌드 복사·해시 일치와 자동 회귀로 복구를 검증

## 2026-07-16 (T17 Vercel Production Branch 보정 확인)
### 재개 결과
- CHECKLIST의 의존 충족 최선행 미완료 항목으로 T17을 재개. GitHub Deployments API에서 Vercel의 최신 Production deployment `5454481013`이 원격 `N166_진현지` HEAD `e5d52ef`를 배포했고 상태가 `success`임을 확인
- `main` 보호 규칙의 required check `verify`(GitHub Actions app_id 15368)도 유지. 기존 Production Branch 불일치 차단은 해소된 것으로 판정
### 남은 차단
- Production deployment의 고유 URL을 실제 요청했으나 Vercel 로그인 페이지로 리디렉션된 후 HTTP 200 HTML이 반환됐고 답냥이·S0 문구는 없었다. 해당 고유 URL은 Standard Protection 대상으로 후속 Production Domain 교차 확인을 수행
- GitHub deployments에 Production 2건만 있고 Preview는 없어 AC-6도 대기. 공개 Production Domain S0를 사용자가 확인하고 비프로덕션 브랜치 push를 요청하면 Preview URL 검증·T17 종료를 재개
### Production Domain 교차 확인
- Vercel 공식 문서에서 Standard Protection은 생성된 deployment URL을 보호하지만 최신 Production Domain은 공개함을 확인. 프로젝트 Production Domain 후보 `https://dabnyang.vercel.app/`은 HTTP 200, 한국어 HTML, `답냥이 — 대학생 메시지 작성 도우미` title을 반환했다. Deployment Protection 변경은 불필요하며 앞선 고유 URL 로그인은 정상 보호 동작으로 재판정
- Browser runtime이 없어 JavaScript 후 S0 실물은 사용자 확인 대기. Preview 0건은 그대로이며 비프로덕션 브랜치 push는 커밋·푸시 명시 요청 후 수행

## 2026-07-16 (T33 교수·조교 이메일 형식 구현·자동 검증 완료)
### 승인·범위
- 사용자는 교수·조교에게는 메신저보다 격식을 갖춘 이메일이 필요한 경우가 많다는 피드백과 함께 구현을 승인했다. 교수·조교 관계에서만 `메신저 / 이메일` 연락 형식을 고르고, 다른 관계는 기존 메신저 흐름을 유지하도록 범위를 고정했다.
- 이메일은 개인 말투를 적용하지 않고 습니다체로 고정하며 `면담 요청 / 수업·과제 질문 / 결석 문의 / 기한 조정 요청 / 추천·자문 요청 / 감사·후속 연락` 여섯 상황만 제공한다. 이메일 자유 설명 AI, 실제 발송·주소록·첨부, provider/DB 변경은 제외했다.
### 구현·개인정보 경계
- 받는 분 성함+호칭·학과·학번·이름·용건을 안내 입력으로 받고 면담 요청에만 가능 시간대를 필수, 대면/온라인 방식을 선택으로 받는다. 받은 사실만 로컬 정적 템플릿에 치환해 `정석 / 더 정중하게 / 더 간결하게`의 제목+본문 18후보를 만든다.
- 이메일 정보와 연락 형식은 기존 현재 탭 30분 sessionStorage에만 보존하고 서버·AI·운영 로그로 보내지 않는다. 복원 시 저장 후보를 신뢰하지 않고 현재 입력과 템플릿으로 재생성하며, 모드 변경·처음으로에서 개인정보를 초기화한다.
- 결과에서 제목·본문·전체 메일을 따로 복사한다. Clipboard API를 쓸 수 없으면 실제 원문을 펼쳐 선택할 수 있고, 완전 실패도 상태 메시지로 안내한다.
### 역할 교차 검토·자동 검증
- `$orchestrate-dabnyangi-task`로 PM이 공유 계약·정본·통합, 디자이너가 18후보·검토표와 최종 UX 교차 검토, 프론트엔드가 연락 형식·이메일 상황/입력/결과·세션·복사 UI를 담당했다. 서버 계약 변경이 없어 백엔드/AI 역할은 비활성으로 유지했다.
- 교차 검토에서 교수·조교를 구분하지 못한 고정 `교수님` 호칭, 완성 제목의 대괄호 자리 표시자 오탐, 숨겨져 길게 누를 수 없던 전체메일 복사 폴백을 발견했다. 사용자 입력 호칭을 그대로 사용하고, 제목 형식을 바꾸고, 선택 가능한 전체 원문을 펼치는 방식으로 모두 수정했다. 최종 디자이너 검토에서 남은 필수 수정은 없었다.
- App 62개와 이메일·공유 도메인 17개를 포함한 전체 17파일 195개 테스트, API 타입검사, lint, TypeScript/Vite build, `git diff --check`, AGENTS.md=CLAUDE.md, `api src` 명시적 `any` 0건을 통과했다. 기존 jsdom `scrollTo` 로그와 지연 CatCanvas 500kB 경고만 유지됐다.
### 남은 게이트·인계
- Browser runtime이 `No browser is available`을 반환해 320×568·375×667, 모바일 키보드, 카카오톡 인앱 복사 폴백은 실검증하지 못했다. 한 열 레이아웃·44px 조작부·줄바꿈·safe-area 방어와 RTL은 통과했지만 실제 시각 검증 완료로 표현하지 않는다.
- 18후보는 자동 불변조건을 통과한 초안일 뿐 자연스러움 합격이 아니다. [T33 검토표](../harness/tasks/T33-professor-email-format/email-template-review-draft.md)에서 사용자 반복 검토 후 수정하고 실브라우저 증거까지 확보하기 전에는 CHECKLIST T33을 미완료로 유지한다.
- 평가자 정보가 있을 수 있는 미추적 T25 설문 CSV와 별도 CatStage 변경은 읽거나 수정·추적하지 않았고, 커밋·푸시도 수행하지 않았다.

## 2026-07-20 (T30 Neon·Drizzle 데이터 계층 코드 우선 구현)
### 방향·의존성 예외
- 사용자가 사용자 리뷰·UI 확장보다 백엔드·DB·서버 기술 발전에 집중하고, 로그인 없이 원문 없는 운영 메타데이터만 저장하는 방향으로 계속 착수를 요청했다.
- T30의 정규 의존 T17·T18은 Preview·실 provider gate가 남아 미완료다. 실제 DB 연결·완료 체크를 제외하고 schema·migration·repository·비저장/장애 테스트 AC-1~7만 먼저 구현하는 코드 우선 예외를 기록했다.
### 데이터 계층·서버 수명주기
- 공식 서버리스 통합 경로에 맞춰 Drizzle ORM/Kit v1 RC, Neon HTTP driver, Vercel Functions를 도입했다. `prompt_versions`·`template_versions`·`generation_runs`·`evaluation_runs` 네 테이블과 최초 migration을 생성했다.
- UUID PK, 버전 unique·단일 active partial unique, prompt/template FK, 실행·평가 조회 index, checksum·검수 상태·음수 수치·route/version 경계 check를 DB 제약으로 고정했다. 자유 JSON과 사용자/세션 테이블은 두지 않았다.
- 네 typed repository는 명시적 allowlist mapper를 사용한다. 받은 메시지·상황·생성 후보·IP/client key·사용자/세션 ID·메시지 hash는 schema와 row에 없고, 프롬프트/템플릿 본문은 계속 Git 정본으로 유지한다.
- `/api/generate`는 서버의 `DATABASE_URL`이 있을 때만 Neon repository를 만들고 누락·초기화 실패에서는 no-op으로 강등한다. DB write는 Vercel `waitUntil()` background task에 등록하며 동기 예외·비동기 reject·scheduler 실패가 생성 응답을 바꾸지 않도록 격리했다.
- Drizzle CLI는 Git에서 제외되는 `.env.local`만 읽고, `.env*` 비밀 파일 ignore와 값 없는 `.env.example`을 추가했다. 브라우저 `src`에는 DB driver·연결 문자열 import가 없다.
### 검증·남은 게이트
- DB·smoke guard 관련 6파일 19개, handler/entry 포함 관련 8파일 42개, 전체 23파일 215개 테스트와 API 타입검사, lint, Vite build, `drizzle-kit check`, diff·명시적 `any`·금지 필드·클라이언트 DB import 검색을 통과했다. 기존 jsdom `scrollTo` 로그와 lazy CatCanvas 500kB 경고만 유지됐다.
- 실제 Neon 개발/Preview `DATABASE_URL`, 로컬 PostgreSQL·Docker가 없어 migration 적용과 네 repository 기록 왕복 AC-8은 실행하지 못했다. T30 CHECKLIST는 미완료로 유지한다.
- 실제 provider가 아직 model·prompt version·token 사용량을 반환하지 않아 해당 nullable 실행 열은 T18~T20 통합 전까지 비어 있다. 상세 근거: [T30 계획서](../harness/tasks/T30-neon-drizzle-data-layer/plan.md)·[검증 보고서](../harness/tasks/T30-neon-drizzle-data-layer/verification.md).
### 실제 Neon 개발 DB 검증 재개
- 이후 `.env.local`에 비공개 `DATABASE_URL`이 준비된 것을 값 출력 없이 확인하고, Neon 개발 DB에 최초 migration을 적용했다. 같은 migration 재실행도 정상 종료해 Drizzle journal 기반 재현성을 확인했다.
- `scripts/db-smoke.ts`는 production 환경을 거부하고 명시적 `DB_SMOKE_CONFIRM=t30-development-write`가 있어야만 실행된다. public base table이 정확히 네 개인지 확인한 뒤 각 repository로 prompt/template version, generation/evaluation run 임시 row를 기록·조회한다. 이어 실제 generate handler의 성공 응답이 background sink를 거쳐 `generation_runs`에 기록되는지 확인하고 FK 역순으로 자신이 만든 행을 모두 삭제한다.
- 실제 smoke가 `handler and four repositories wrote, read, and cleaned metadata rows`로 통과했다. 연결 문자열·사용자 원문·생성 문구는 출력하거나 저장소에 기록하지 않았다.
- AC-1~8 자체는 통과했지만 T17·T18 선행 항목과 Vercel Preview background write 검증이 남아 CHECKLIST T30 완료 체크와 하네스 종료는 보류한다.

## 2026-07-20 (백엔드 구현 gate 분리 및 T18·T30 완료)
### 승인·책임 분리
- 사용자가 구조 변경을 “승인”했다. 제품·출시 품질 gate와 provider 비종속 백엔드 구현 gate를 분리하고, 사용자 흐름·로그인·원문 저장은 바꾸지 않았다.
- T18은 T3에 의존하는 provider 비종속 `/api/generate` 기반으로 종료했다. 표준 fetch 진입점, 주입형 handler/provider/limiter/metrics 경계, 요청 검증, 18초 취소, 출력 상한, 제한 재시도, 오류 정규화, 10회/60초 제한, 원문 없는 메타데이터를 완료 근거로 삼았다.
- 실제 provider client·키·프롬프트 structured output·클라이언트 HTTP 전환·Vercel Preview 왕복은 T20으로 이관했다. 현재 진입점은 계속 unconfigured provider로 명시적 500을 반환하므로 실제 AI 운영 완료를 주장하지 않는다.
- T30 의존은 완료된 T18 기반으로 한정했다. schema·migration·typed repository·best-effort background sink와 실제 Neon 개발 DB migration 최초/재실행, public 테이블 4개, 네 repository 및 generate handler 임시 row 기록·조회·정리를 근거로 종료했다.
- Vercel Preview의 환경별 `DATABASE_URL`과 실제 `waitUntil()` background write는 T31 통합 게이트로 이관했다. T17·T19·T20·T21·T22·T23·T31과 T25 콘텐츠/경쟁가치 검증은 계속 미완료다.
### 재검증·인계
- T18 관련 3파일 24개와 전체 23파일 215개 테스트, API 타입검사, lint, Vite build, `drizzle-kit check`를 재통과했다. 기존 jsdom `scrollTo` 로그와 lazy CatCanvas 500kB 경고만 유지됐다.
- 무참여자 `Provisional Go`는 T20 실 provider 품질·출시 진행 gate로 유지했다. T18·T30 완료를 사용자 효과나 범용 AI 대비 우월성 증거로 사용하지 않는다.
- 커밋·푸시·Preview 배포는 수행하지 않았다.

## 2026-07-20 (남은 Task 재개 감사 — T17·T19 외부 조건 확인)
### T17 재확인
- CHECKLIST의 가장 앞선 미완료 T17을 먼저 재개했다. Browser runtime 선택은 다시 `No browser is available`, 사용 가능 목록은 `[]`를 반환해 공개 Production Domain의 JavaScript 후 S0 화면 증거를 추가하지 못했다.
- Preview는 비프로덕션 브랜치 commit·push가 있어야 생성된다. 사용자의 “남은 Task 진행”은 작업 진행 요청이지만 AGENTS.md의 명시적 커밋·푸시 요청은 아니므로 원격 변경을 수행하지 않았다.
### T19 의존성 정정
- T19 정본을 감사한 결과 CHECKLIST의 T16만 완료로 표시됐고, `docs/SEEDS.md`에는 제3자 블라인드 정렬과 24개 전송 가능성 판정이 모두 대기였다. 완료 근거가 없어 T16을 다시 열고 T19 운영 시드 이관을 중단했다.
- 승인된 책임 분리에 맞춰 T19 AC-8을 “검수된 24개 시드의 관계별 2세트 서버 카탈로그 이관”으로 한정했다. 실제 provider·키·Preview 왕복은 T20에 유지해 T19↔T20 순환 의존을 제거했다.
- 앱·서버 런타임 코드는 변경하지 않았다. T19 프롬프트 4파일 28개 테스트, API 타입검사, `git diff --check`를 재통과했다. 다음 재개 조건은 T17 commit·push 명시 요청과 T16 제3자 검수 근거다.

## 2026-07-20 (T16 승인 반영·T19 프롬프트 구성 완료)
### 검수 근거·구현
- 사용자가 “3자 검수 완료 승인”을 명시해 T16의 제3자 블라인드 정렬 8/8·전송 가능성 24/24 통과로 기록했다. 검수자 식별정보와 원시 응답지는 저장소에 보관하지 않는다.
- `api/_lib/prompt/seedExamples.ts`에 검수 시드 24개를 4관계×2세트×3톤 typed 카탈로그로 이관했다. 각 관계는 답장·먼저 보내기 세트를 하나씩 가지며 `requirePromptExamplePair`가 관계·길이·후보 3개·톤 1/2/3·중복·안전 계약을 모듈 로드 시 검증한다.
- `buildPromptWithReviewedExamples`가 요청의 `scenarioId`로 검수 예시 두 세트를 선택해 기존 XML 데이터 블록·관계/목적/개인 말투 규칙·JSON Schema와 조립한다. 시드의 `source`나 UI transcript는 provider 입력에 포함하지 않는다.
### 검증·경계
- 첫 테스트에서 존재하지 않는 `scenarioIds` export 참조를 발견했고, 명시적 `ScenarioId` 튜플로 교체해 `any` 없이 수정했다.
- 프롬프트 관련 5파일 38개, 전체 24파일 225개 테스트, API 타입검사, lint, Vite build, Drizzle migration check, diff·명시적 `any`·클라이언트 prompt import 검사를 통과했다. 기존 jsdom `scrollTo` 로그와 lazy CatCanvas 500kB 경고만 유지됐다.
- T19 AC-1~9를 통과해 CHECKLIST를 완료 처리했다. 실 provider·키·Preview 왕복, provider 보존 고지는 T20에 남아 있으며 시드 검수를 실제 생성 효과 근거로 표현하지 않는다.

## 2026-07-20 (T19 커밋·T17 Preview 배포 생성)
### 커밋·push
- 사용자 “커밋푸시 승인”에 따라 T16·T19 변경만 명시적으로 스테이징하고 `5a2f408 feat: 검수 시드 프롬프트 카탈로그 추가` 커밋을 생성했다. 사용자 소유 `.agents/skills/continue-dabnyangi-task/`, T25 설문 CSV, `tmp/`는 포함하지 않았다.
- `N166_진현지`는 Vercel Production Branch이므로 해당 원격을 갱신하지 않고, commit `5a2f408`을 비프로덕션 `t17-preview-t19` 브랜치로 push했다.
### 배포·잔여 검증
- GitHub deployment `5516452997`이 environment=`Preview`, SHA=`5a2f408`, status=`success`와 고유 URL을 반환했다. 공개 HTTP 요청은 Vercel Standard Protection 로그인으로 이동했다.
- Browser runtime은 계속 `[]`라 Preview와 공개 Production Domain의 JavaScript 후 S0 화면을 직접 확인하지 못했다. T17은 Preview 생성 성공만 반영하고 완료 체크하지 않았다.
- repository Actions는 enabled지만 SHA `5a2f408`의 CI workflow run은 생성되지 않았다. 기존 성공 run과 main required `verify` 근거는 유지하되 현재 SHA의 원격 CI 통과로 표현하지 않는다.

## 2026-07-20 (CI 누락 원인 확인·전수 UI 테스트 안정화)
### 원격 CI 감사
- Preview push 이벤트와 Vercel 성공 check는 생성됐지만 GitHub Actions run이 없는 원인을 추적했다. `0bb4e6e`에서 `.github/workflows/ci.yml`이 추적 제거되고 `.github/workflows/`가 ignore되어 현재 Preview·기본 브랜치 커밋 트리에는 `auto-merge.yml`만 존재한다.
- GitHub API의 workflow `active` 표시는 과거 실행 이력이며 현재 push CI 설치 근거가 아니다. CICD.md의 “모든 push” 설명과 저장소가 불일치하므로 CI 재추적·API 타입검사 단계 추가·문서 보정안을 제안했고, 원격 자동화를 바꾸는 구조 변경 승인 전에는 적용하지 않았다.
### 테스트 안정화
- 승인 뒤 실행할 CI 명령을 로컬에서 재검증하는 과정에서 전체 225개 중 전수 상황 카드 UI 테스트 1건이 기능 assertion이 아니라 기본 5초 제한으로 두 번 실패했다. 단독 실행은 통과해 24회 앱 재마운트가 전체 병렬 스위트에서 병목임을 확인했다.
- 관계별로 앱을 한 번만 렌더하고 `상황 다시 고르기` 동선으로 여섯 카드를 순회하도록 바꿨다. 24개 카드·72개 요체 후보·세 후보 고유성·자리 표시자 12개·사과 사실 검증은 그대로 유지하면서 렌더 횟수를 24회에서 4회로 줄였다.
- 대상 테스트는 1.74초, 전체 24파일 225개는 18.68초에 통과했다. 기존 jsdom `scrollTo` 로그는 유지됐고 테스트 timeout 상향이나 assertion 삭제는 하지 않았다.
- 테스트 안정화 commit `86d5b9f`을 비프로덕션 `t17-preview-t19`에 push했다. Vercel deployment `5516596997`은 Preview/success였고 같은 SHA의 Actions run은 0건으로 CI 부재가 다시 확인됐다.

## 2026-07-20 (T34 구조화 카드 맥락·결과 후속 AI 구현)
### 승인·제품 흐름
- 사용자는 템플릿이 문구 모음처럼 보이는 문제를 줄이면서 빠른 선택 흐름을 유지하도록, 카드를 상황 구조화의 시작점으로 바꾸고 카드별 질문 한 개 뒤 AI 세 후보를 만드는 방향을 승인했다. 자유 대화형 챗봇·자율 agent loop·사용자 원문 저장은 추가하지 않았다.
- 4관계×6카드에 질문 정확히 1개와 option 3개, 총 질문 24개·option 72개의 stable ID 카탈로그를 만들었다. option으로 표현하지 못하는 사정은 기존 `내 상황을 직접 설명하기`로 보낸다.
- 질문 답변 탭은 `guided_ai`, 질문 없이 보는 준비된 초안은 API를 호출하지 않는 `template_fallback`, 직접 설명은 `manual_ai`로 분리했다. 카드 선택 당시 말투와 관계별 기본값을 유지하고 결과 후보는 세 toneLevel을 계속 사용한다.
### 기본 초안 불만족·실패 후속 동선
- 사용자가 질문 없이 본 기본 초안이 마음에 들지 않을 때 `이 상황으로 AI가 다시 써주기`로 같은 카드의 질문에 이어가도록 추가했다. 관계·카드·말투를 다시 고르지 않는다.
- guided AI 실패로 기본 초안이 표시된 경우에는 `같은 선택으로 AI 다시 만들기`가 기존 question/option ID를 유지해 즉시 재시도한다. 재시도 중에는 현재 fallback 후보를 보존하고 복사·중복 실행을 막으며 live 상태를 알린다.
- 두 경우 모두 더 구체적인 사실이 필요하면 `내 상황을 직접 설명하기`를 유지한다. 결과 요약은 AI나 fallback이 의미를 모두 반영했다고 과장하지 않고 `선택한 내용`으로 표시한다.
### 서버 신뢰·비저장 경계
- 공용 요청을 `template_fallback | guided_ai | manual_ai` discriminated union으로 바꾸고 route별 필수·금지 필드와 unknown key를 검사한다. API는 `template_fallback`을 받지 않고 guided stable ID를 서버 정본 카탈로그로 해석해 목적·사실을 prompt에 구성한다.
- 클라이언트 label·대화 transcript·임의 fact를 신뢰하지 않는다. 받은 메시지·상황 원문·생성문구·UI transcript·영구 사용자 ID는 새 DB schema나 metric에 추가하지 않고 route·mode·situation·catalog version 같은 allowlist metadata만 사용한다.
- provider timeout·실패에서는 같은 카드의 결정적 기본 초안을 반환한다. 현재 운영 provider는 아직 연결되지 않았으므로 guided 결과 품질이나 실제 서비스 작동 완료로 표현하지 않는다.
### 자동 검증·남은 gate
- 전체 35파일 289개 테스트, API 타입검사, lint, Vite build, Drizzle migration check를 통과했다. 기존 jsdom `Window.scrollTo not implemented` 로그와 lazy CatCanvas 500kB 초과 경고만 비차단으로 유지됐다.
- 실 provider 한국어 품질·실패 왕복은 T20~T21, 320×568·375×667 실제 화면과 키보드·스크린리더는 T31에서 검증한다. 이 증거가 없어 CHECKLIST T34는 미완료로 유지한다.

## 2026-07-20 (T35 검수 예시 retrieval 비운영 기반 구현)
### 기술 범위·운영 차단
- 검수 예시를 단순 고정 두 세트보다 맥락에 가깝게 고르는 RAG 가능성을 평가하되, 최신 기술 사용 자체를 성과로 주장하지 않도록 offline 실험으로 한정했다. 운영 `/api/generate`와 prompt builder는 계속 static selector를 사용한다.
- Git 예시에 stable ID·catalog version·mode·checksum을 부여하고 Neon에는 1024차원 document vector와 provenance metadata만 저장하는 `retrieval_examples` additive migration을 추가했다. 예시 본문·사용자 원문·생성문구·query vector는 DB·로그·metric에 저장하지 않는다.
- Voyage document/query adapter, 관계·목적·모드 hard filter 후 pgvector exact cosine top-2, checksum 기반 idempotent ingestion, 모든 실패에서 static fallback, 48 cell×2 activation guard와 합성 ranking evaluator를 구현했다. ANN·reranker·LangChain/LlamaIndex·자율 retrieval loop는 추가하지 않았다.
### 검증·한계
- 합성 evaluator에서 static/retrieval Recall@2는 모두 10000 basis points, MRR은 static 5000·retrieval 10000이었으나 계산 검증용 고정 fixture일 뿐 실제 생성 품질 근거가 아니다. generation quality는 `null`, activation-ready coverage는 0/48, `productionEligible=false`다.
- 실제 Voyage key 호출, 개발 DB migration·ingestion·exact query smoke, coverage가 충분한 corpus와 동일 holdout 생성 A/B를 실행하지 않았다. 따라서 RAG 운영·품질 우위·비용 우위를 주장하지 않고 CHECKLIST T35를 미완료로 유지한다.
- 통합 전체 35파일 289개 테스트, API 타입검사, lint, Vite build, Drizzle migration check와 `npm run retrieval:eval`을 통과했다. 커밋·푸시는 수행하지 않았다.

## 2026-07-20 (T36 결과 중심 다듬기·비식별 흐름 계측 완료)
### 경쟁 흐름 조사·승인 범위
- Apple Writing Tools의 Original/Undo/Revert, Outlook Copilot의 Keep/Discard/Regenerate, Grammarly의 Accept/Dismiss/Undo, Wordtune의 복수 rewrite처럼 결과를 잃지 않고 같은 문맥에서 수정하는 공식 흐름을 비교했다. 기능 존재를 답냥이 효과 근거로 표현하지 않고, S0~S2의 일반 4탭 도달은 유지한 채 결과 이후 반복만 줄이는 구조를 사용자에게 제안해 승인받았다.
- template 결과는 S3 안에서 같은 카드 질문을 열고, guided 결과는 같은 선택 재생성과 답 변경을 구분한다. manual 결과는 입력 수정과 상황 카드 복귀를 각각 1탭으로 제공한다. 자유 follow-up chat, 새 `더 짧게` AI intent, 계정·영구 history, screenshot/OCR, 자동 전송은 추가하지 않았다.
### 결과 상태·접근성
- 후보 교체는 성공 응답에서만 실행하고 직전 한 세트만 현재 탭 메모리에 보관한다. 현재/이전 보기와 복원 swap, 후보별 600자 로컬 수정·원문 복원, 실제 textarea 선택 fallback을 구현했다. 수정문은 생성 요청·event·DB에 전송하지 않는다.
- manual 입력·목적·말투 변경이 진행 중 request ID를 무효화해 오래된 응답이 최신 입력 화면을 덮지 않도록 했다. S2 빠른/직접 설명 경로, 카드·선택 요약과 교수 답장/먼저 연락 문구를 정본에 맞췄다.
- 디자이너 1차 검수에서 관계별 재생성 CTA 대비 3.79~3.96:1과 생성 성공 초점 유실을 발견했다. 텍스트 대비를 8.61~9.82:1로 올리고, 완료 live 안내·결과 제목 초점·패널 닫기 trigger 복귀·현재/이전 후보 region 초점·직접 수정 textarea 초점을 추가해 재검수 승인을 받았다.
### 비식별 event API·DB
- 공용 strict 계약은 `result_shown/refinement_opened/regeneration_requested/copy_succeeded/situation_change`만 허용한다. 공통 route·mode·scenario, 카드 경로의 situation, 복사의 tone만 받으며 unknown key와 원문·후보·수정문·식별자 형태 필드를 거절한다.
- `POST /api/interaction`은 JSON/계약 오류 400, 인스턴스별 임시 rate limit 429, 정상 event는 DB·scheduler 실패에도 202를 반환한다. `waitUntil()` best-effort sink와 7열 `interaction_events` additive migration을 추가하고 route↔situation, scenario↔situation, copy↔tone, email↔professor를 DB CHECK로 이중 고정했다. IP는 임시 limiter key에만 쓰고 sink·DB에 전달하지 않는다.
- 식별자가 없으므로 이 event는 route/scenario 단위 중복 가능 집계이며 개인별 funnel·재방문율·실제 전송·만족·효과를 뜻하지 않는다. 실제 Preview write·보존 기간·집계 query는 T24 운영 검증으로 남겼다.
### 검증·잔여 gate
- App RTL 77/77, backend/DB 집중 7파일 36개, 전체 40파일 330개 테스트와 API 타입검사, lint, production build, Drizzle check, retrieval eval, diff, AGENTS/CLAUDE 동기화, production TypeScript `any` 0건을 통과했다. 기존 jsdom `scrollTo` 로그와 lazy CatCanvas 500kB 경고만 비차단으로 유지됐다.
- headless Chrome으로 실제 S0→S3를 클릭해 375×667·320×568에서 document/viewport width 일치와 가로 overflow 0을 확인했다. 생성 성공 뒤 결과 H2 초점·live 완료 문구·이전 초안 생성, 현재/이전 전환·복원 뒤 해당 후보 region 초점, 320px 직접 수정 textarea 초점·132px 높이·54px 복사 버튼을 확인했다. 실제 VoiceOver/NVDA, 모바일 가상 키보드, 카카오톡 인앱 복사 폴백은 수동 호환성 gate로 남긴다.
- T36은 구현·로컬 검증 완료로 CHECKLIST에 반영했다. 실제 Neon migration/write, 커밋·push는 수행하지 않았고 `.github` 경로와 사용자 소유 미추적 파일은 건드리지 않았다. 상세 근거: [T36 계획서](../harness/tasks/T36-result-refinement-flow/plan.md)·[검증 보고서](../harness/tasks/T36-result-refinement-flow/verification.md).

## 2026-07-21 (T17 완료 확인, T20 목→실 provider 전환 착수 — Gemini로 provider 결정)
### T17
- 사용자가 CI 재설치(`79a9478`) 반영과 공개 Production·Preview S0 실물 확인을 완료로 확인해 CHECKLIST를 체크했다.
### provider 결정과 SPEC 계약 변경
- 사용자가 실 provider로 Anthropic 대신 Google Gemini API 사용을 확정했다. 코드 전에 SPEC 2장 provider 처리 고지(확인 안 된 보존정책 링크 제거)와 6장 모델·가격표(Anthropic → `gemini-2.5-flash-lite`/`gemini-3.1-flash-lite`/`gemini-3.5-flash`, 2026-07-21 공개 단가 기준)를 Gemini로 갱신했다. 3장 서술의 `stop_reason`/`output_config.format`도 실제 연결 대상에 맞춰 `finishReason`/`generationConfig.responseSchema`로 정정했다.
- Gemini `responseSchema`의 정확한 키워드 지원 범위는 확인하지 못했으나, provider 응답과 무관하게 `src/shared/generation/contracts.ts`의 런타임 `parseGeneratedReply`가 후보 개수·톤레벨·길이를 이미 전량 재검증하므로 T3/T19 산출물(`outputSchema.ts`)은 수정하지 않았다.
### 구현
- `api/_lib/generation/geminiProvider.ts`를 새로 만들어 `generateContent` REST 호출(`x-goog-api-key`, `generationConfig.responseMimeType/responseSchema`)과 실패 매핑(429→rate_limited, 5xx→transient, 그 외 4xx→client_error, fetch/abort 실패→transient)을 구현했다. Gemini `finishReason: STOP`을 기존 `parseCompletedStructuredOutput`이 기대하는 `end_turn` 문자열로 변환해 T19 산출물을 그대로 재사용한다. `createEnvironmentGenerationProvider`는 `GEMINI_API_KEY` 미설정 시 기존 `createUnconfiguredGenerationProvider`로 우아하게 폴백한다(Voyage provider와 동일 패턴).
- `api/generate.ts`가 `createUnconfiguredGenerationProvider()` 대신 이 팩토리를 쓰도록 배선을 교체했다. `.env.example`에 `GEMINI_API_KEY`/`GEMINI_MODEL` 항목을 추가했다.
### 검증·잔여 gate
- 신규 geminiProvider 단위 테스트 12개(fake fetch로 정상 STOP·MAX_TOKENS/SAFETY/RECITATION·429/503/400·abort·빈 응답·미설정 케이스, API 키가 에러 메시지에 노출되지 않음을 확인) 포함 전체 342개 테스트, `typecheck:api`, lint, production build, `git diff --check` 통과.
- 실제 `GEMINI_API_KEY`로 하는 호출은 자동 테스트에서 수행하지 않았다(과금 방지, fake fetch만 사용). 사용자가 Vercel에 키를 등록하고 Preview에서 실제 정상 왕복을 확인했다. 등록 과정에서 키 원문이 대화창에 두 차례 노출돼 즉시 폐기·재발급을 안내했고, 재발급된 키로 재확인해 CHECKLIST T20을 완료로 반영했다(2026-07-21). 429·refusal(SAFETY/RECITATION)·토큰 절단(MAX_TOKENS)·서버 취소의 실동작 확인은 자동 테스트(fake fetch)로만 커버됐고 Preview 실물 확인은 남아 있다.

## 2026-07-21 (T21 holdout 20개 실 Gemini 호출·사람 채점 완료)
### holdout 케이스 확장
- `src/evaluation/generationCases.ts`의 기존 4개(groupwork 누락·일부 시드 중복)를 SPEC 5장 요구대로 20개(시나리오당 대표 4 + 500자 근접 1)로 확장했다. `riskCategories` 메타데이터로 거절·500자 근접·상충 지시·강압 요청·사실 추가 위험을 태깅하고, 시드 24개와 situation·receivedMessage 문구가 겹치지 않음을 테스트로 고정했다.
### 실 API 연결 중 발견한 결함 2건과 수정
- `gemini-2.5-flash-lite`가 T20 문서화 당시 가정과 달리 이 계정(신규 사용자)에는 404로 제공되지 않음을 실 호출로 확인했다. 실제 `ListModels` 결과와 교차 확인해 `gemini-3.1-flash-lite`로 기본 모델을 교체하고 SPEC 6장·MVP.md·AI_DESIGN.md·`.env.example`·`geminiProvider.ts` 전부를 갱신했다.
- structured output 스키마 호환성도 실제로는 T20에서 예상한 것과 다른 지점에서 깨졌다: Gemini `responseSchema`는 `additionalProperties`를 아예 거부하고 `enum`은 문자열만 허용한다(우리 `toneLevel` enum은 정수 `[1,2,3]`). fake fetch 단위 테스트는 스키마 형태를 검사하지 않아 이 결함을 잡지 못했다 — 실 호출 400 응답으로 처음 발견했다. `geminiProvider.ts`에 `toGeminiSchema` 정규화(재귀적으로 `additionalProperties` 제거, 비문자열 `enum` 제거)를 추가해 해결했다. 최종 검증은 여전히 `src/shared/generation/contracts.ts`의 런타임 `parseGeneratedReply`가 provider와 무관하게 수행한다.
### 산출물
- `scripts/holdout-eval.ts`로 20/20 정상 응답을 수신하고, 톤 라벨을 가리고 순서를 섞은 블라인드 채점 패킷(`harness/tasks/T21-holdout-quality/blind-packet.md`)과 정답 매핑(`answer-key.json`)을 산출했다.
### 검증·잔여 gate
- geminiProvider 스키마 정규화 회귀 테스트 1건 추가, 전체 42파일 349개 테스트·`typecheck:api`·lint·build·`git diff --check` 통과.
- 한국어 맥락 평가자 2명(사용자 포함)이 블라인드 패킷을 독립 채점했다. 톤 정렬 일치·전송 가능성 판정·환각 0건 세 지표 모두 SPEC 5장 합격선을 통과해 CHECKLIST T21을 완료로 반영했다. 개별 세트·후보 단위 원시 채점표는 시드 T16과 동일한 방침으로 저장소에 보관하지 않는다. 상세 근거: [T21 계획서](../harness/tasks/T21-holdout-quality/plan.md)·[검증 보고서](../harness/tasks/T21-holdout-quality/verification.md).

## 2026-07-21 (T36 후속 — 템플릿 빈칸 즉시 수정)
- 사용자 피드백에 따라 결과 묶음 안내를 “필요하면 고쳐서 바로 복사해요”로 바꾸고, `[부탁할 내용]`·`OO` 같은 자리 표시자가 있는 후보는 기존 강조와 안내 배지를 유지하면서 편집 행동명을 `직접 수정`에서 `빈칸 채우기`로 구체화했다. 빈칸이 없는 후보는 기존 `직접 수정`을 유지한다.
- `빈칸 채우기`를 누르면 로컬 textarea에 초점을 두고 첫 자리 표시자 전체를 자동 선택해 바로 실제 내용으로 대체할 수 있게 했다. 수정문 복사·원문 복원·서버/계측 비전송 경계는 그대로 유지했다.
- `docs/EDGE_CASES.md`의 오래된 “편집 기능은 MVP 밖” 표현을 현재 T36 계약에 맞게 정정하고 `docs/SCREENS.md`에 행동명·자동 선택 규칙을 명시했다.
- 관련 2파일 82개·전체 41파일 344개 테스트, lint, production build, `git diff --check`가 통과했다. 인앱 브라우저는 세션에 사용 가능한 브라우저가 없어 실제 화면 검증을 실행하지 못했으며 기존 T22·T23 수동 gate로 남겼다.

## 2026-07-21 (T36 후속 — guided 재생성 행동 명확화)
- `같은 선택으로 다른 표현 만들기`가 추가 입력을 요구하는지 불분명하다는 사용자 피드백을 반영했다. 버튼 앞에서 “현재 답 유지·추가 입력 없음·새 초안 3개 즉시 생성”을 설명하고, 행동명을 `이 선택으로 새 초안 3개 만들기`로 바꿨다.
- 생성 중에는 `새 초안 3개 만들고 있어요…`로 즉시 피드백하고, 성공 뒤에는 화면상 status로 새 초안 준비 완료와 수정·복사·이전 초안 비교를 안내한다. 기존 후보 보존·성공 시에만 교체·직전 한 세트 복원 동작은 바꾸지 않았다.
- App RTL 78개·전체 41파일 349개 테스트, lint, production build, `git diff --check`가 통과했다. 인앱 브라우저 실화면 검증은 세션 제약으로 기존 T22·T23 수동 gate에 남겼다.

## 2026-07-21 (Production 배포 크래시 수정 — ESM 상대 경로 확장자 누락)
### 발견
- 사용자가 재배포 요청 후 Production `/api/generate`·`/api/interaction`이 500 `FUNCTION_INVOCATION_FAILED`로 크래시함을 보고했다. Vercel 함수 로그에서 `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/api/_lib/db/generationMetricsSink' imported from /var/task/api/generate.js`를 확인했다.
- 원인: Vercel의 Node.js 런타임이 `api/**/*.ts`를 파일 단위로 트랜스파일해 네이티브 Node ESM 로더로 실행하는데, 이 로더는 상대 경로 import에 확장자를 요구한다(Node16/NodeNext 규칙). 저장소의 `tsconfig.api.json`은 `moduleResolution: "bundler"`라 확장자 없는 import를 로컬 typecheck에서는 허용해 이 결함이 지금까지 감지되지 않았다. T20~T21 작업과는 무관한, 그 이전부터 있던 배포 결함이다.
### 수정
- `tsc -p`를 `module/moduleResolution: nodenext`로 반복 실행해 `TS2834/2835`(확장자 누락) 진단을 자동 수집하고, 파일별 상대 import에 `.js`(디렉터리 import는 `/index.js`)를 붙이는 codemod를 1회성으로 작성·실행했다. `api/**`와 `api/generate.ts`·`api/interaction.ts`에서 실제로 도달하는 `src/**` 전체(및 완전성을 위해 나머지 `src/shared`·`templateCompiler` 소수 파일)에 적용했다. Vite가 사용하는 프론트 전용 파일은 원래도 확장자 없는 상대 import가 정상 동작하지만, `.js` 확장자를 붙여도 Vite에서 문제없이 해석되므로 동일하게 통일했다.
- `tsconfig.api.json`을 `moduleResolution: "bundler"`→`"nodenext"`로 바꿔(`allowImportingTsExtensions` 제거) 앞으로 `npm run typecheck:api`가 이 결함 종류를 실제로 잡아내도록 했다.
### 검증
- 실제 Vercel 런타임과 동일하게 `tsc`로 `.js`를 emit한 뒤 Node 네이티브 ESM 로더로 `api/generate.js`·`api/interaction.js`를 직접 import·fetch 호출해 정상 로드(모듈 해석 성공)와 정상 오류 처리(환경변수 없을 때 `generate`는 깨끗한 JSON 500 `generation_failed`, `interaction`은 202)를 확인했다 — 이전에는 이 지점에서 `ERR_MODULE_NOT_FOUND`로 크래시했다.
- 전체 41파일 349개 테스트, `typecheck:api`(nodenext로 강화), lint, production build, `git diff --check` 통과.

## 2026-07-21 (T24 흐름 계측 운영 검증 완료)
### 배경
- ESM 확장자 크래시 수정·재배포 과정에서 이미 same-origin 왕복(`/api/interaction` 202)은 확인했다. 남은 부분(waitUntil 실반영·집계 query·보존 기간)을 마저 검증했다.
### 발견·조치
- 개발 DB(`.env.local`의 `DATABASE_URL`)에 `interaction_events`·`retrieval_examples` 테이블이 없었다 — 이전 세션에서 이 두 additive migration이 현재 dev DB에는 적용되지 않은 상태였다. `npm run db:migrate`로 재적용해 6개 테이블 전부(`evaluation_runs`, `generation_runs`, `interaction_events`, `prompt_versions`, `retrieval_examples`, `template_versions`)를 확보했다.
- 신규 `scripts/interaction-smoke.ts`(`npm run db:smoke:interaction`)로 합성 event 4건을 실 repository로 삽입 → route/scenario/eventName 집계 query로 재확인 → 정확히 그 4건만 삭제하는 왕복을 2회 연속 실행해 재현 가능함을 확인했다.
- 저장소 전체에서 `interaction_events` 삭제·TTL·cron 코드를 찾지 못했다 — **현재 보존 기간은 사실상 무기한**이다. SPEC 7장은 저장 필드 제한만 요구하고 삭제 job을 요구하지 않으므로 신규 구현 없이 현재 상태를 그대로 기록했다.
### 검증
- 전체 41파일 349개 테스트(일시적 flake 1건은 재실행으로 비재현 확인), lint, `typecheck:api`, production build, `git diff --check` 통과.
- T24는 검증 완료로 CHECKLIST에 반영했다. 상세 근거: [T24 계획서](../harness/tasks/T24-interaction-ops-verification/plan.md)·[검증 보고서](../harness/tasks/T24-interaction-ops-verification/verification.md).

## 2026-07-21 (T25 상황 카드 템플릿 288개 전수 검수 완료)
- 한국어 관계 맥락 평가자 2명(김도엽·진현지)이 독립 수행한 288개 전수 검수 결과를 사용자가 보고했다: hard fail 0/288, 톤 블라인드 정렬 96/96, 그대로 전송 가능 231/288(80.2%, SPEC 4장 합격선 충족), 하위 관계 호환(교수님·조교님/선배·동기/친구·연인) 288/288. SPEC 4장 T25 합격선 네 항목 모두 통과했다.
- 검수 과정에서 수집된 채점표 원본(평가자 식별정보 포함)은 T16과 동일한 방침으로 저장소에 별도 보관하지 않는다. 저장소에 남아 있던 대표 12문구(4장×3톤) preflight CSV는 이 전수 검수 이전 단계의 사전 검토 자료다.
- `src/entities/message/situationTemplates.ts`의 정적 288개 문구가 검수 대상 원본이며, 코드 변경은 없다. CHECKLIST T25를 완료로 반영하고 MVP.md·AI_DESIGN.md·PRD.md의 "초안"·"검수 전" 표현을 검수 통과로 갱신했다.
- CHECKLIST T26(결정적 템플릿 엔진·fallback, 의존 T3·T8·T25)이 이제 착수 가능 상태다.

## 2026-07-22 (`.github/workflows/ci.yml` 추적 되돌림)
- 사용자가 이전에 "`.github` 폴더 내용은 공유 저장소에 push하지 말라"고 지시했었는데, `79a9478`(이번 세션 이전 커밋)이 `.gitignore`의 `.github/workflows/` 제외 규칙을 지우고 `ci.yml`을 추적·push한 상태였다. 오늘 세션에서 그 위에 계속 작업하면서 이 지시를 다시 확인하지 않고 지나쳤다.
- 사용자 확인 후 `git rm --cached .github/workflows/ci.yml`로 추적만 제거하고(로컬 파일은 유지), `.gitignore`에 `.github/workflows/ci.yml` 규칙을 복원했다. 과제 제공 워크플로 `auto-merge.yml`과 `pull_request_template.md`·`ISSUE_TEMPLATE/*`는 건드리지 않았다(사용자가 명시적으로 유지 요청).
- CHECKLIST T17 문구에서 "`ci.yml` 재설치로 `verify` Actions run 복구" 표현을 제거해 실제 상태(로컬 전용 유지)와 맞췄다.

## 2026-07-22 (T28·T29·T36 후속 — 사용자 피드백 반영)
- 방식·관계 카드의 오른쪽 진행 화살표를 상단 `발자국 n/4`와 같은 기존 `public/paw.png` 마스크 아이콘으로 바꿨다. 뒤로가기의 왼쪽 화살표는 방향 이해를 위해 유지했다.
- `어느 톤으로 보낼까냥?` 결과 전환에서 생성 냥이→관계 냥이 에셋이 바뀔 때 `key`로 단일 Canvas까지 재생성되던 원인을 제거했다. Canvas DOM은 유지하고 텍스처만 바꾸며, 새 에셋 준비 중 정적 폴백은 즉시 나타나고 준비 완료 뒤에만 사라지게 했다. WebGL·렌더 실패 뒤에는 현재 탭 동안 정적 폴백을 유지한다.
- T36의 후보 직접 수정은 제거하지 않고 기존 최대 600자 계약을 유지했다. 제한을 알 수 있도록 현재 글자 수/600을 시각적으로 표시하고 textarea 설명에 연결했으며, 수정문 비전송·원문 복원·복사 동작은 바꾸지 않았다.
- "첨부된 이미지" 피드백의 대상이 좌측 브랜드 패널의 `긴 설명 없이 빠른 선택`·`관계별 말투`·`비교할 수 있는 세 가지 톤` 장식 칩임을 확인했다. 비상호작용 정보가 한 줄 소개와 실제 오른쪽 흐름을 반복하고 모바일에서는 숨겨져 목적이 불명확하므로 제거해 브랜드·한 줄 설명·캐릭터에 집중시켰다. 상황별 고양이 디테일에 대한 긍정 피드백은 현재 에셋을 유지하는 근거로 기록했다.
- CatStage·App 관련 88개와 전체 41파일 350개 테스트, lint, production build, `git diff --check`를 통과했다. 인앱 브라우저는 사용 가능한 backend가 없어 320×568·375×667 실화면 확인을 실행하지 못했으며 다음 사용자/브라우저 실물 확인 대상으로 남겼다.

## 2026-07-22 (진행 발자국 기준 정정)
- 사용자가 말한 "맨 처음의 고양이 발바닥"은 첨부한 두 발 이미지가 아니라 기존 화면 상단 `발자국 n/4`의 작은 파란 발자국 아이콘임을 확인했다. 방식·관계 카드도 같은 `public/paw.png`를 CSS 마스크로 재사용하고 별도로 만든 긴 발 파생 에셋은 제거했다.
- DOM 선택 흐름과 뒤로가기 방향 표시는 바꾸지 않았으며 사용자 제공 원본 두 장은 모두 변경하지 않았다.

## 2026-07-22 (T26 결정적 템플릿 엔진·fallback 완료)
### 컴파일 자산·검증 규칙
- T25 승인 288문구를 24개 의미 프레임과 12개 말투×톤 규칙으로 옮기고, 정본 순서의 96세트·288문구를 만드는 순수 컴파일러를 추가했다. 말투 말끝·문장부호, intent 화행, tone 2 완화, tone 3 간결성 경계를 컴파일 단계에서 검사한다.
- bundle version은 `t25-approved-2026-07-21.1`, review status는 `approved`로 고정했다. manifest는 24/96/288 수치·문구별 provenance·소문자 SHA-256 checksum `4ac4ea33750c42164fac4b14d6b43071de122fccf3c5136868beb7ba6261c69f`를 가진다.
- `templates:generate`가 Git TypeScript·JSON 산출물을 재생성하고 `templates:check`가 1 byte라도 drift하면 실패한다. 컴파일 288개는 T25 검수지와 byte 단위로 같다.
### 런타임·장애 fallback·DB 경계
- `templateCandidatesFor` 런타임 원천을 generated artifact 하나로 전환하고 중복 288문구 상수를 제거했다. 기존 `Candidate[] | null`, tone 1→2→3, 호출마다 새 후보 객체와 생성 API 0회 계약을 유지했다. Backend/Frontend 교차검토로 브라우저 번들에 compiler·frames·`node:crypto`가 연결되지 않음도 확인했다.
- guided AI timeout·429·500은 같은 관계×상황×말투 키의 기본 초안으로 fallback하고 세부 답 미반영을 안내한다. manual AI 실패·취소는 기본 초안으로 강제 전환하지 않는 것을 App 회귀 테스트로 고정했다.
- approved manifest와 유효한 검수 시각만 `template_versions` active 입력으로 변환하며, DB 입력 allowlist에는 version·checksum·review status/time만 남기고 템플릿 본문·사용자 원문을 제외했다. 실제 검수 시각은 정본에 없어 임의로 만들거나 DB에 쓰지 않았다.
### 검증·완료 판정
- T26 관련 5파일 110테스트와 전체 43파일 365테스트, `templates:generate`, `templates:check`, `typecheck:api`, lint, production build, `git diff --check`, `any` 금지 검사가 통과했다. 빌드의 기존 CatCanvas 500 kB 경고만 비차단으로 남았다.
- 화면·카피 변경은 없어 신규 실화면 검증은 비적용으로 판정했다. 실제 DB 등록·커밋·push·배포는 수행하지 않았다. 상세 근거: [T26 계획서](../harness/tasks/T26-deterministic-template-engine/plan.md)·[검증 보고서](../harness/tasks/T26-deterministic-template-engine/verification.md).

## 2026-07-22 (T32 개인 말투 선호·카드 기본값 분리와 S3 전환)
- 카드 진입 때 관계 기본 말투를 `speechStyleId`에 저장하던 동작을 제거했다. 이제 이 값은 사용자가 직접 설명 또는 정적 결과에서 명시적으로 고른 선호만 나타내며, 명시 선호가 없는 카드·guided 경로는 조회 시 관계 기본값(`professor=seumnida`, 나머지 `haeyo`)을 사용한다.
- 신규 직접 설명은 네 말투 중 하나를 직접 고르기 전 생성할 수 없다. 명시 선택은 관계·카드·모드 이동과 30분 탭 세션에서 유지되고, 전체 초기화·만료·오염값은 미선택으로 복구한다. 말투가 없는 유효한 구세션 카드 결과는 저장 후보를 신뢰하지 않고 관계 기본 generated 후보로 다시 조회한다.
- `source=template` S3에만 `말투 바꾸기` 4지선다를 추가했다. 같은 관계×상황의 T26 검수 세 후보를 API·로딩·런타임 어미 변환 없이 즉시 교체하고 복사 완료·직접 편집·이전 초안 표시를 초기화한다. 현재 말투는 live text로 전달하며 `source=ai`에는 전환을 노출하지 않는다.
- 관련 4파일 109개와 전체 43파일 367개 테스트, 프론트·API 타입검사, `templates:check`, lint, production build, `git diff --check`, AGENTS/CLAUDE 미러, 대상 `any` 금지 검사가 통과했다. 기존 jsdom `scrollTo` 로그와 lazy CatCanvas 500kB 경고만 비차단으로 유지됐다.
- Browser 스킬의 bootstrap troubleshooting까지 수행했으나 사용 가능한 backend 목록이 `[]`여서 320×568·375×667 무가로넘침과 실제 Tab·방향키 검증은 실행하지 못했다. 이 필수 증거 전까지 CHECKLIST T32는 미체크로 유지한다. 상세 근거: [T32 계획서](../harness/tasks/T32-speech-style-presets/plan.md)·[검증 보고서](../harness/tasks/T32-speech-style-presets/verification.md).
- 이후 사용자가 320×568·375×667 화면과 키보드 동작의 수동 확인 완료를 보고했다. 원시 캡처는 저장하지 않고 사용자 확인을 근거로 AC-10과 CHECKLIST T32를 완료 처리했으며, VoiceOver/NVDA 조합별 전수 확인은 T22 범위로 유지한다.

## 2026-07-22 (T33 교수·조교 이메일 형식 마감 보완)
- 사용자가 승인한 T33 마감 계획에 따라 감사·후속 3후보의 감사 과반복과 답변이 필요 없는데 `확인해 주시면`을 붙인 문구를 제거했다. 동기화된 18후보 검토표도 같이 갱신했으며 자연스러움·전송 가능성은 자동 합격 처리하지 않고 사용자 검토로 남겼다.
- 세 이메일 후보와 아홉 복사 버튼의 접근 이름에 `정석 / 더 정중하게 / 더 간결하게` 톤 문맥을 포함해 화면 읽기에서도 서로 구분했다. 표시 라벨·복사 동작·서버·DB 계약은 바꾸지 않았다.
- T33 관련 2파일 94개와 전체 43파일 368개 테스트, 프론트·API 타입검사, `templates:check`, lint, production build, `git diff --check`, AGENTS/CLAUDE 미러, 대상 `any` 금지 검사가 통과했다. 기존 jsdom `scrollTo` 로그와 CatCanvas 500kB 경고만 비차단으로 남았다.
- CHECKLIST T33은 18후보 사용자 문구 검토와 320×568·375×667·모바일 키보드·카카오톡 인앱 복사 폴백 확인 전까지 미완료로 유지한다.
- 이후 사용자가 18후보 문구와 320×568·375×667·모바일 키보드·카카오톡 인앱 복사 폴백을 모두 확인했다고 보고했다. 이 확인을 AC-9·10 증거로 기록하고 CHECKLIST T33을 완료 처리했다.

## 2026-07-22 (T34 guided context 마감 검증 재개)
- T33 완료 후 의존이 충족된 다음 항목으로 T34를 재개했다. 공유 계약·UI·서버·fallback이 이미 구현되어 있어 중복 구현하지 않고 남은 문구·Production·모바일 증거만 마감한다.
- `guidedContext.ts`의 24질문·72옵션 질문·label·prompt fact를 담은 `guided-context-review-draft.md`를 만들고, 정본과 한 글자라도 다르면 실패하는 동기화 테스트를 추가했다. 작성 과정에서 옮김 오탈자를 테스트가 발견해 정본과 동기화했다.
- Production `/api/generate`에 실제 사용자 원문·식별자가 없는 `groupwork + schedule + ask_availability` 합성 `guided_ai` 요청을 1회 전송했다. HTTP 200·`source=ai`·tone 1/2/3이 반환됐고 특정 날짜·시간을 지어내지 않았다. `situationSummary`·`warning`은 SPEC 2장의 허용된 선택 메타데이터며 UI 선택 요약은 계속 로컬 label로 구성한다.
- 전체 43파일 369개 테스트, 프론트·API 타입검사, `templates:check`, `db:check`, lint, production build가 통과했다. 기존 jsdom `scrollTo` 로그와 CatCanvas 500kB 경고만 비차단으로 남았다.
- Browser 연결 문서의 troubleshooting까지 적용했지만 사용 가능한 backend 목록은 `[]`였다. CHECKLIST T34는 24질문·72옵션 사용자 문구 검토와 guided 320×568·375×667·키보드·스크린리더 수동 확인 전까지 미완료로 유지한다.
- 이후 사용자가 24질문·72옵션 문구와 320×568·375×667·키보드·스크린리더를 모두 확인했다고 보고했다. 이 확인을 AC-2·7·9 증거로 기록하고 CHECKLIST T34를 완료 처리했다.

## 2026-07-22 (T35 retrieval 실험 외부 gate 재개)
- T16·T19·T30·T34 의존 완료를 확인하고 기존 비운영 retrieval 구현을 재검증했다. 공식 Voyage의 `query/document`·1024차원 float 출력과 pgvector의 ANN 없는 exact cosine `<=>` 계약이 현재 adapter·repository와 일치했다.
- T35 관련 11파일 43개와 전체 43파일 369개 테스트, API 타입검사, `templates:check`, `db:check`, lint, production build를 통과했다. 합성 evaluator는 8 example set·24후보, covered 8/48, activation-ready 0/48, generation quality `null`, `productionEligible=false`를 다시 반환했다.
- 개발 DB migration을 재실행하고 명시적 확인값을 사용한 core smoke로 `retrieval_examples` 포함 여섯 테이블을 확인했다. 실 Voyage→합성 document 임시 적재→query exact top-2→자체 행 삭제를 재현하는 `retrieval:smoke` 명령과 `.env.example` 안내를 추가했다.
- 현재 환경에 `VOYAGE_API_KEY`·`VOYAGE_EMBEDDING_MODEL`이 없어 smoke는 외부 호출 전에 guard로 중단됐다. coverage 충분 검수 corpus도 없어 실제 생성 A/B를 수행할 수 없으므로 CHECKLIST T35와 운영 `/api/generate` static selector를 그대로 유지한다.
- 사용자가 이후 프로젝트에서 읽고 다른 사람에게 설명할 수 있도록 `docs/RETRIEVAL.md`를 새 정본으로 작성했다. Voyage·Gemini·Neon의 역할 분리, 현재 운영과 offline 경로, 코드 지도, 전송·저장 경계, `voyage-4-lite` 비용 계산, vector 저장 크기, latency·fallback·coverage, 실행 명령, 면접·포트폴리오 설명 문장을 한 문서에 정리하고 AGENTS/CLAUDE 참고 목록에 연결했다.
- 이후 사용자가 비프로덕션 Voyage key를 설정했다. 구형 `voyage-3.5-lite`로 시작했으나 현재 무료·권장 범위의 `voyage-4-lite`로 바로잡고 실 document/query→Neon exact top-2 smoke를 통과했다. 단건 document 호출은 smoke 직후 429를 만나 공식 배열 입력 기반 batch로 변경했다. T35 관련 11파일 45개·전체 43파일 371개 테스트와 API 타입·lint·build·템플릿·DB gate가 통과했고, 최초 catalog 적재 `8/0` 뒤 재실행 `0/8`로 idempotency를 실증했다. 최종 개발 DB에는 `reviewed-seeds-v1 + voyage-4-lite` 8행만 있고 smoke 임시 행은 없다.
- `/seed` 절차에 따라 4관계×6목적×2방식의 48개 cell별 두 상황을 [coverage corpus 검토 초안](../harness/tasks/T35-retrieval-experiment/coverage-corpus-review-draft.md)에 먼저 정리했다. 기존 검수 8세트를 표시했고 신규 필요량은 88세트·264후보다. 이 목록은 사용자 승인 전 초안이므로 메시지 본문 작성이나 approved corpus 반영은 하지 않았다.
- 사용자가 `진행`으로 48 cell 상황 목록을 승인했다. 기존 approved 8세트는 변경하지 않고 신규 88세트·264후보를 `coverageCandidateDraft.ts`에 `draft`로 작성했다. 수량·48×2 coverage·ID/문구 중복·reply/ initiate·tone·길이·금지 항목·정중함 하한선 자동 검사와 세트 내용 동일성 수동 재검토를 통과했다.
- 작성 순서가 검수자에게 노출되지 않도록 96세트의 후보 순서를 결정적으로 섞은 [블라인드 검수지](../harness/tasks/T35-retrieval-experiment/coverage-corpus-blind-review.md)와 별도 정답표를 생성했다. 신규 후보는 제3자 톤 정렬·288개 전송 가능성 판정 전까지 DB에 적재하거나 approved/운영 retrieval로 승격하지 않는다.
- retrieval 디렉터리 9파일 35개와 전체 44파일 375개 테스트, 프론트/API 타입검사, 템플릿·DB·검수지 drift check, lint, production build, `git diff --check`, AGENTS/CLAUDE mirror, 대상 `any` 검사를 통과했다. 기존 jsdom `scrollTo` 로그와 CatCanvas 500 kB 초과 경고만 비차단으로 남았다.

## 2026-07-23 (ORCH-2 task-first 선택적 멀티에이전트 마이그레이션)
- 공개 Codex·OpenCode·OpenClaw 운영 원칙과 저장소 실제 상태를 비교한 제안을 사용자가 승인했다. T항목은 의존성·완료조건 단위로 유지하고, 구현은 하나의 사용자 결과를 만드는 실행 묶음 안에서만 선택적으로 위임하도록 AGENTS/CLAUDE·하네스·오케스트레이션 스킬을 갱신했다.
- 기본은 PM 단독 실행이며 위임은 독립 산출물·고정 계약·읽기 전용 또는 비중첩 쓰기·순효율 네 게이트를 모두 통과해야 한다. 읽기 중심 병렬화를 우선하고 writer는 최대 2명, 하위 에이전트 중첩은 금지하며 PM만 공유 계약·CHECKLIST·LOG·최종 통합을 소유한다.
- `npm run harness:check`를 추가해 plan/verification 쌍, 허용 상태명, CHECKLIST와 T 작업 완료 상태를 검사한다. self-test 4건이 실패 감지를 확인했고, 수정 전 드리프트 16건을 검출한 뒤 T17·T25·T32~T36 기록을 정규화해 실제 22개 작업 폴더가 통과했다. T17의 공유 저장소 CI 미사용·로컬 전용 결정도 CICD와 하네스에 동기화했다.
- 전체 44파일 375테스트, oxlint, TypeScript/Vite build, skill validator, AGENTS/CLAUDE mirror, 링크, `git diff --check`를 통과했다. 기존 jsdom `scrollTo` 로그와 CatCanvas 500 kB 경고만 비차단으로 남았다. 제품 코드·런타임 멀티에이전트·의존성·배포·사용자 소유 미추적 파일은 변경하지 않았다.
- 실제 효율은 다음 적합 작업 2~3건에서 활성 worker, 실제 병렬 구간, 인계·충돌·재작업을 기록한 뒤 재평가한다. 그 전에는 `.codex/agents` 상시 프로필이나 worktree 자동화를 추가하지 않는다. 상세 근거: [ORCH-2 계획서](../harness/tasks/2026-07-23-task-focused-orchestration/plan.md)·[검증 보고서](../harness/tasks/2026-07-23-task-focused-orchestration/verification.md).

## 2026-07-23 (ORCH-2 이전·현재 작업 방식 비교 명문화)
- 사용자의 요청에 따라 role-first 이전 방식과 task-first 현재 방식을 `harness/README.md`의 비교표로 명문화했다. 출발점, T항목 해석, 기본 실행, 네 위임 게이트, 읽기 우선 병렬화, writer 상한, 평면 에이전트 구조, task-local 맥락, 효율 기록, custom agent/worktree 보류, 상태 자동 검사의 차이를 한곳에서 확인할 수 있게 했다.
- PM 단일 통합, 공유 계약·CHECKLIST·LOG 소유, 동일 파일 동시 수정 금지, 제품 `/api/generate` 단일 런타임처럼 바뀌지 않은 경계도 함께 기록했다.

## 2026-07-23 (T22 외부 DoD 검증 실행 준비)
- `/task-start` 의존성 순서에서 가장 이른 미완료 항목인 T22를 선택했다. 직접 의존 T21과 콘텐츠·실 provider 기반은 완료됐지만, CHECKLIST에 명시된 대학생 참여자 5명이 없어 사람 대상 결과를 만들거나 완료 처리하지 않았다.
- 기존 `COMPETITIVE_VALIDATION.md`의 과업·교차 배정·기록 스키마·블라인드 루브릭·판정 임계값을 다시 설계하지 않고, 버전 동결→자동·접근성 사전점검→5명 세션→비식별화→블라인드 검수→Gate 집계 순서를 [T22 계획서](../harness/tasks/T22-dod-external-task/plan.md)와 [현장 실행 체크리스트](../harness/tasks/T22-dod-external-task/execution-kit.md)로 연결했다.
- 실제 원문·실명·학교·계정 식별자·원시 참여자 행은 Git에 넣지 않고, 유효 paired 5명 미만이면 `Pending`을 유지하도록 중지 조건을 고정했다. [검증 보고서](../harness/tasks/T22-dod-external-task/verification.md)는 외부 참여자·고정 Preview·접근성·독립 평가가 남아 있어 `보류`로 기록했고 CHECKLIST T22는 미체크 상태를 유지했다.
- `npm run harness:check`는 23개 작업 폴더(16 T항목·7 비-T)의 상태 정합성을 통과했고, 직접 참조 정본·T22 문서 경로와 `git diff --check`도 통과했다. 현재 작업트리의 내부 사전점검으로 전체 44파일 375테스트, API 타입검사, lint, `tsc -b` 포함 production build도 통과했다. 기존 jsdom `scrollTo` 로그와 CatCanvas 500 kB 초과 경고만 비차단으로 남았으며, 이 결과는 고정 Preview 버전에서 다시 수행해야 하는 T22 최종 증거를 대체하지 않는다.
- 최신 GitHub Production deployment `5564774983`이 현재 HEAD `b9d6b2563d666b57a39894d74c106090dc301329`로 성공했고 공개 `https://dabnyang.vercel.app/`이 HTTP 200임을 확인했다. 고유 Vercel deployment URL은 로그인으로 이동해 외부 참여자에게 바로 쓸 수 없다. 고정 Preview 대신 공개 도메인의 Production push를 세션 기간 멈추고 deployment ID·SHA를 매번 재확인하는 대안을 제안 상태로 남겼으며, 사용자 승인 전에는 최종 실행 방식으로 확정하지 않는다.
- Browser 스킬의 연결·복구 절차를 적용했지만 사용 가능한 backend 목록이 `[]`여서 키보드·초점·스크린리더 실화면 검증은 수행하지 못했다. 소스 기반 자동검증으로 대체하지 않고 수동 gate를 유지했다.
- 모집 문안, 비식별 자격 확인, 자발적 참여 확인, 진행자 통일 문구, 종료 안내를 [T22 참여자 안내문](../harness/tasks/T22-dod-external-task/participant-brief.md)으로 추가했다. 이는 법적·연구윤리 심의 완료 문서가 아니며 실제 연락·보상·응답과 개인정보는 Git 밖의 접근 제한 기록으로 분리한다.
- 사용자는 외부 세션을 재개할 경우 공개 Production 도메인을 사용하고 세션 기간 deployment SHA를 동결하는 방식을 승인했지만, 대학생 5명 과업 자체는 진행하지 않기로 결정했다. 모집·세션·실제 동결은 수행하지 않고 T22를 미완료·`Pending`으로 유지했으며 사용자 검증이나 경쟁 우위를 주장하지 않는다.
- `/task-start`로 다음 항목을 재계산하면 T23은 T22, T31은 T22·T23에 의존해 현재 착수할 수 없다. T35도 제3자 블라인드 검수 결과가 없어 다음 생성 A/B로 갈 수 없다. 이 의존성을 바꾸지 않는 한 바로 실행 가능한 미완료 T항목은 없다.

## 2026-07-23 (T22 외부 가치 검증·기술 MVP 배포 분리 승인)
- 사용자가 T22 대학생 5명 과업을 실행하지 않은 채 계속 진행하는 구조 변경안을 승인했다. T22 기준·실행 킷·개인정보 경계는 삭제하지 않고 후속 외부 가치 검증으로 `Pending`·미완료 유지한다.
- T23은 T17·T20·T21·T29·T32·T33·T34·T36을 직접 의존하는 기술 배포·실기기 확인으로, T31은 T23·T29·T30·T34를 의존하는 기술 MVP 통합 DoD로 분리했다. T22는 두 항목의 완료 의존성이 아니다.
- PRD·MVP·CHECKLIST·PLAN·PRODUCT_REVIEW·COMPETITIVE_VALIDATION·CICD와 T22 하네스를 동기화했다. 기술 MVP 완료는 대학생 검증 완료, 범용 AI 대비 우위, 실제 사용자 선택·효율의 근거가 아니며 해당 주장은 T22 실행 전까지 금지한다.

## 2026-07-23 (T23 기술 배포·실기기 검증 착수)
- 새 직접 의존 T17·T20·T21·T29·T32·T33·T34·T36 완료를 확인하고 [T23 계획서](../harness/tasks/T23-technical-deployment-device/plan.md)로 착수했다. 검증 전후 Production deployment는 `5564774983`, SHA `b9d6b2563d666b57a39894d74c106090dc301329`, state `success`로 같았다.
- 공개 Production `/`은 HTTP 200과 `답냥이 — 대학생 메시지 작성 도우미` title을 반환했다. 같은 build의 JS 351,097 bytes·CSS 33,955 bytes·지연 CatCanvas 882,646 bytes가 모두 HTTP 200이며 로컬 `dist`의 provider·DB·Voyage secret marker는 0건이다.
- 실제 원문 없는 `guided_ai(groupwork/schedule/ask_availability)`와 `manual_ai(professor/initiate/ask)` 합성 요청을 각각 1회 보냈다. 둘 다 HTTP 200·`source=ai`·tone 1/2/3 세 후보를 반환했고, guided는 임의 날짜·시간을 추가하지 않았다.
- 전체 44파일 375테스트, App+generation handler 집중 2파일 111테스트, API 타입검사, template drift, Drizzle check, lint, `tsc -b` 포함 production build, 하네스 24폴더, `git diff --check`가 통과했다. 기존 jsdom `scrollTo` 로그와 CatCanvas 500 kB 경고만 비차단이다.
- Browser 연결을 재시도했지만 사용 가능한 backend가 없어 Production 320×568·375×667 실화면과 모바일·카카오톡 인앱 복사를 실행하지 못했다. 자동 테스트나 이전 버전의 사용자 확인으로 대체하지 않고 [검증 보고서](../harness/tasks/T23-technical-deployment-device/verification.md)를 `보류`, CHECKLIST T23을 미체크로 유지했다.
- 실제 정보 없이 확인할 수 있도록 카드 guided·결과 다듬기, template/manual·키보드, 교수 이메일 세 복사, 카카오톡 인앱 fallback의 네 시나리오와 합성 입력을 [T23 실기기 체크리스트](../harness/tasks/T23-technical-deployment-device/manual-checklist.md)로 고정했다.
- 이후 사용자가 320×568 카드·guided·다듬기, 375×667 template/manual·키보드, 모바일 이메일 세 복사, 카카오톡 인앱 복사 fallback을 모두 통과했다고 확인했다. 기기·OS·브라우저 버전과 원시 캡처는 별도 수집하지 않았음을 증거 한계로 남기고, 이 사용자 보고와 기존 자동·Production 증거를 합쳐 T23 및 AC-1~AC-9를 완료 처리했다.

## 2026-07-23 (T31 기술 MVP 통합 검증 — Preview gate 보류)
- T23·T29·T30·T34 완료를 확인하고 [T31 계획서](../harness/tasks/T31-technical-mvp-integration/plan.md)로 기술 MVP 통합 검증을 시작했다. 제품 코드·API·DB schema·배포 설정은 바꾸지 않았다.
- 전체 44파일 375테스트와 App·Cat·generation/interaction 계약·sink 집중 9파일 173테스트, API 타입검사, template/DB/retrieval drift·offline evaluator, lint, production build를 통과했다. evaluator는 8/48 covered·activation-ready 0/48·`productionEligible=false`로 운영 retrieval 비활성을 다시 확인했다.
- 개발 Neon migration 재실행과 guarded core·interaction smoke가 통과했다. 여섯 public table, generation background sink 임시 metadata 행, interaction 4건 집계가 일치했고 테스트 행은 자체 정리됐다. `src`와 `dist`의 DB/provider key·server import, production 생성 경로의 retrieval/agent loop, 대상 명시적 `any`는 0건이었다.
- Production deployment `5564774983`은 HEAD와 같은 `b9d6b2563d666b57a39894d74c106090dc301329`·success를 유지했다. 개인정보 없는 manual 합성 요청 1건은 HTTP 200·`source=ai`·tone 1/2/3을 반환했지만 로컬 개발 DB 시간창에는 새 metric 행이 없어, Production DB 분리와 background write 실패를 구분할 수 없었다.
- 최신 Preview는 deployment `5516621084`, SHA `c13f209eaa88bbb213ae0d0d6f2784254a734e1e`로 현재 통합 SHA보다 오래됐다. 승인 없는 branch push·새 배포는 수행하지 않았고, 현재 SHA Preview의 실제 `/api/generate`와 `waitUntil()` DB 반영 AC-6이 남아 [검증 보고서](../harness/tasks/T31-technical-mvp-integration/verification.md)를 `보류`, CHECKLIST T31을 미체크로 유지했다.
- 이후 사용자가 비프로덕션 branch push를 승인해 현재 HEAD를 `codex/t31-preview-check`로 push했다. 원격 branch는 생성됐지만 Vercel이 이미 Production에 존재하는 동일 SHA를 새 Preview deployment로 등록하지 않았고 새 Vercel commit status도 생기지 않았다. 브라우저 재배포는 사용 가능한 backend가 없어 실행하지 못했으며, 제품 tree를 바꾸지 않는 빈 배포 트리거 커밋은 별도 커밋 승인을 받기 전 생성하지 않았다.
- 사용자가 빈 trigger commit을 승인했다. 현재 더러운 작업트리와 분리한 임시 worktree에서 `76bcea5 chore: Preview 검증 트리거`를 만들었고 부모와 tree SHA `ea335bc9987fe4600c82315ad19fad27f0ac4967`가 같음을 확인한 뒤 임시 branch에만 push했다. Vercel status는 2026-07-23T06:58:05Z success가 됐고 branch alias가 생성됐다.
- Preview branch URL은 Vercel Authentication으로 302 이동하며 로컬에는 protection bypass 자격이 없고 사용 가능한 Browser backend도 없었다. 실제 `/api/generate`와 `waitUntil()` DB 반영은 사용자가 로그인된 Preview에서 합성 `friend/initiate/decline` 생성 1건을 실행한 뒤 `2026-07-23T07:00:36Z` 이후 metadata 행을 조회하는 단계로 남겼다. 임시 worktree는 push 뒤 제거했고 Production branch·현재 작업트리는 바꾸지 않았다.
- 사용자가 보호된 Preview에서 지정 manual AI 세 후보 생성을 완료했다고 보고했다. 그러나 `2026-07-23T07:00:36Z` 이후 개발 DB의 `friend/initiate/decline` 조건 행과 같은 시각 이후 `generation_runs` 전체를 각각 조회한 결과 모두 0건이었다. 원문·생성문은 조회·저장하지 않았다.
- 따라서 Preview build·실 AI 생성은 통과했지만 `waitUntil()` background write는 통과로 처리하지 않았다. Preview `DATABASE_URL`의 적용 범위·대상 DB를 Vercel에서 값 노출 없이 확인하고, 필요하면 수정·재배포한 뒤 `2026-07-23T07:09:18Z` 이후 같은 합성 요청을 재실행하는 조건으로 T31을 `보완 필요`·미완료 유지했다.
- 사용자가 Vercel에는 `GEMINI_API_KEY`만 있었음을 확인하고 `DATABASE_URL`을 Preview에 추가했다. 재배포 과정에서 `api/generate.ts`·`api/interaction.ts`의 `process`를 찾지 못하는 TS2591이 발생했다. 저장소에는 `@types/node`와 `tsconfig.api.json` Node types가 이미 있었지만 Vercel 함수 빌더가 읽는 루트 `tsconfig.json`에는 Node 타입이 없었다.
- 사용자 승인 후 루트 `tsconfig.json`에 `types: ["node"]`만 추가했다. root showConfig, API 타입검사, 전체 44파일 375테스트, lint, production build가 통과했다. 현재 작업트리와 분리한 Preview worktree에서 `tsconfig.json` 한 파일만 `4d44c40 fix: Vercel API Node 타입 인식`으로 커밋·push했고, 같은 스냅샷의 API 타입·lint·build도 통과했다.
- 새 Vercel Preview status는 2026-07-23T09:25:26Z success가 되어 TS2591 빌드 실패가 해소됐다. 보호된 Preview의 최신 runtime 생성과 `waitUntil()` DB write는 사용자가 `2026-07-23T09:29:11Z` 이후 합성 요청 1건을 다시 실행한 뒤 확인하도록 남겼고, 임시 worktree는 제거했다.
