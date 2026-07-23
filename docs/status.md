# 현재 진행 상황

마지막 갱신: 2026-07-23

## 완료

- 문서형 Agent를 Codex skill로 변환: project-planning-agent, project-verification-agent, project-document-manager
- 학습 정리용 repo-side Codex skill 추가: project-learning-agent
- Codex 하네스 Recommended안 구축: `.codex/agents`, `.agents/skills`, `docs/wiki`, `scripts/verify-harness.ps1`, 완료 계획 문서 추가
- Superpowers와 프로젝트 workflow skills를 `C:\Users\sun99\.codex\skills`에 설치하여 다음 턴/새 세션에서 자동 발견 가능하도록 구성
- Codex 하네스 감사 후 최소 수정: TOML/config 정책 검사 강화, Wiki `source_paths` 검증 범위 수정, 운영 workflow와 5개 eval 시나리오를 Wiki synthesis로 정착

- React + Vite + TypeScript 프로젝트 구성
- XP 데스크톱형 정적 프로토타입 구현
- Profile Setup Wizard, QuestRunner.exe, 실패 이유, 복구 퀘스트, 매니저, 기록 노트 정적 시연 흐름 구성
- React 버전의 프로필, 퀘스트, 완료/실패/복구, 창 열기/닫기/드래그 기본 로직 구현
- React flow/state를 정적 HTML 기준에 맞게 정리: 첫 접속 Profile Setup Wizard, 기본 열린 창, 완료 후 기록 노트 자동 열림 방지, 완료 퀘스트 재실행 방지, 실패/복구 흐름 유지
- React 기록 흐름 연결: 완료/실패/복구 이벤트가 기록 목록과 매니저 상태를 갱신하고, 기록 노트는 사용자가 열 때만 렌더링
- Hono 기반 `/api/quest-events`, `/api/manager-context` 추가: 완료/실패/복구 Quest Event를 server-side mock store 또는 Supabase store에 저장하고 manager context를 React 기록 노트/Lumi 상태에 반영
- Vite local middleware로 `/api/*` 요청을 Hono app에 연결
- Supabase 준비 문서와 migration 추가: `.env.example`, `docs/environment-setup.md`, `docs/supabase-setup.md`, `supabase/migrations/001_create_quest_logs.sql`
- 2주차 발표 자료 생성 및 핵심 작업 1 슬라이드 정정: `outputs/week2-progress-report.pptx`, `outputs/week2-progress-report-core1-revised.pptx`
- 2026-07-14 React 핵심 화면과 mock 기록 흐름 정리: Profile Setup Wizard, XP 데스크톱, QuestRunner.exe, 실패/복구, 기록 노트의 `useState` 기반 흐름을 읽기 쉬운 한글 상태로 정리
- `src/data/quests.ts`, `src/layers/agent/ruleBasedAgent.ts`의 깨진 한글 mock/Agent 문구 정리
- 문서를 역할별 `docs/` 구조로 분리
- MVP 이후 확장 계획 문서화
- 저장소 작업 규칙 `AGENTS.md` 작성
- `concept.png` 기반 XP 디자인 시스템과 CSS 토큰 문서 작성
- 에셋 생성 프롬프트 구조화
- 문서 관계를 설명하는 `docs/project-knowledge-map.md` 추가
- 계획 수립 Agent 문서 작성
- 기능 검증 Agent 문서 작성
- 문서 관리 Agent 문서 작성
- Agent 사용 가이드 작성
- 7월 30일 최종 로드맵 작성
- 2주차 계획과 오늘 계획 작성
- GitHub Project 운영 가이드 작성
- 개발 Task 백로그를 GitHub Issues/Projects 등록 단위로 재정렬
- 2026-07-17 매니저 캐릭터 새 방향 후보 기록: `pink-animal-samesize-evolution` 기준으로 Stage 1~4 크기/시점은 유지하고, 전자 장식 대신 동물형 귀여움과 픽셀 품질만 점진적으로 강화하는 방향을 `docs/asset-prompts/`와 관련 skill 문서에 반영
- 2026-07-17 실제 신기한 생물 모티브 후보 기준 기록: `real-creature-cyber-pet-evolution` 문서에 Stage 1은 작게, Stage 2~4는 동일 크기/시점으로 유지하는 사이버 펫 진화 규칙을 추가
- 2026-07-17 실제 생물 모티브 후보 v2 피드백 반영: Stage 3/4는 크기 증가 없이 생물별 디테일이 분명히 올라가야 하며, 사탄 나뭇잎 꼬리 도마뱀붙이는 애니메이션을 위해 더 단순한 실루엣을 우선하도록 문서와 검수 skill에 추가
- 2026-07-17 동적 MVP 캐릭터 애니메이션 계획에 `hanging`, `hiding` 창 상호작용 상태를 추가하고, 창 UI는 sprite에 굽지 않고 React/CSS 레이어에서 edge/mask로 처리하는 기준을 문서와 manifest 슬롯에 반영
- 2026-07-17 매니저 기준 에셋을 `call_z97P9uZ2ElI20evcQGicQRu9`로 고정하고, `public/assets/lumi/`의 `lumi-idle/focused/happy/recovering/resting/hover/hanging/hiding-sheet.png`와 `lumi-growth-01~03.png` canonical 슬롯을 해당 기준의 임시 정적 sheet로 정렬
- 2026-07-17 실제 생물 모티브 9종 v2 contact sheet와 개별 후보 PNG를 생성: `public/assets/_review/real-creature-candidates-stage-1-4-v2-contact.png`, `public/assets/lumi/candidate-*-stage-1-4-v2.png`, `candidate-*-stage-1-4-v2-chromakey.png`
- 2026-07-18 캐릭터 후보는 Stage 1/2만 실제 애니메이션 base로 쓰고 Stage 3/4 확장은 보류하는 방향으로 전환
- 2026-07-18 기존 desktop icon 9종의 `idle`/`hover` pixel v2 PNG를 생성하고 manifest를 `*-idle-pixel-v2.png`, `*-hover-pixel-v2.png`로 연결
- 2026-07-18 캐릭터 애니메이션 base 기준을 확정: 실제 생물 9종은 `call_5sUTBQlinROYVyU6ME7HGChS`, 핑크 매니저는 `call_z97P9uZ2ElI20evcQGicQRu9`, 플라나리아는 `call_FC5eMPVVWE0EfZgjCbcenep4`의 Stage 1/2를 사용
- 2026-07-18 webcam 연결 확장용 `pixel-tv` desktop icon future slot을 추가하고, `PIXELTV.jfif` 무드 참조 기반의 `pixel-tv-idle-pixel-v2.png`, `pixel-tv-hover-pixel-v2.png`를 manifest에 연결
- 2026-07-18 desktop hover icon 7종을 재디자인: quest pencil, manager extra sparkles, profile manager-card, journal open book, trash mouth, rewards untied ribbon, pixel-tv screen noise
- 2026-07-18 플라나리아 Stage 1 기준 이미지를 `call_FC5eMPVVWE0EfZgjCbcenep4`에서 추출하고, `idle/focused/happy/recovering/hover/hanging/hiding` 샘플 sprite sheet 7종을 생성
- 2026-07-18 플라나리아 Stage 1 animation sample의 기준 프레임, CSS background-position, 상태별 fps, 배치 anchor, reduced-motion fallback 기준을 문서화
- 2026-07-22 플라나리아와 도마뱀붙이, `hover`를 제외한 9종 Stage 1 펫 상호작용 motion sheet 90개를 생성: `idle/focused/happy/recovering/hanging/hiding/run/jump/walk/climbing`, variable source frame count, `playbackFrames`, `hold`, `mirrorX` 재생 기준을 manifest와 검수 문서에 반영
- 2026-07-22 핑크 매니저 motion board는 `pink-manager-motion-board-v3-refined-from-call-pj.png`를 선호 방향으로 두고, `jump`는 오른쪽 3/4 시점이 유지되는 `pink-manager-jump-v2-right-facing.png`로 교체 후보를 확정. `pink-manager-motion-board-v3-jump-fixed-review.png`는 검수용 합성본이며 canonical sheet 승격 전 별도 crop-safe 추출이 필요
- 2026-07-22 핑크 매니저 V3 board row와 오른쪽 3/4 `jump` 후보를 row별로 crop/정규화해 `public/assets/lumi/pink-manager-stage-2-v2/`에 10개 motion sheet로 추출하고, `public/assets/_review/pink-manager-stage-2-v2-contact.png` 검수본 생성
- 2026-07-22 핑크 매니저 V3 crop 결과 검수 후, review/contact board를 production sheet 원본으로 쓰지 않기로 결정. 이후 생성은 motion별 production sprite sheet를 직접 만들고, 각 PNG 안에서 캐릭터 scale/bbox/anchor가 일치하는지 검수하는 방식으로 전환
- 2026-07-20 동적 에셋 animation pipeline 내용을 `asset-prompts` 문서와 Wiki synthesis로 재배치하고, `docs/wiki/synthesis/dynamic-asset-animation-pipeline.md`를 추가
- 2026-07-21 Supabase 실제 DB 수직 슬라이스 검증 완료: `/api/health`가 `storageMode: "supabase"`와 `supabaseConfigured: true`를 반환했고, `POST /api/quest-events`, `GET /api/quest-events`, `GET /api/manager-context`가 실제 Supabase 경로에서 통과
- 2026-07-21 Supabase 수직 슬라이스 브라우저 UI 수동 확인 완료: 완료/실패/복구 이벤트 후 Network `POST`/`GET`와 기록 노트 표시를 확인
- 2026-07-21 GitHub Issues/Project 정리 완료: 기존 P0 이슈 상태를 최신화하고 3주차 P1, 4주차 P2 확장 이슈를 Project #1에 `Priority`, `Week`, `Type`, `Status` 필드와 함께 등록
- 2026-07-22 동적 asset/data manifest를 코드에서 확장하고 검증: `soundAssets`, `interactionObjectAssets`, `projectionModeAssets`, projection/interaction future slot을 추가하고 main Lumi runtime animation을 `pink-manager-stage-2` canonical sheets로 전환
- 2026-07-22 T-710 blink focus scene prototype을 React/CSS overlay로 조정: 온보딩 후 서비스 진입과 시작 메뉴 서비스 종료 직전에만 blink가 재생되고, 저장된 프로필로 새로고침해 desktop에 바로 들어올 때는 재생하지 않음
- 2026-07-22 T-724 Single-plane Pepper projection mode prototype을 Pixel TV 우클릭 속성 flow에 연결: 속성 창의 변환/원복으로 TV 아이콘 sprite가 바뀌고, 변환된 아이콘 실행 시 hidden route `?projection=pepper`의 검은 배경 Lumi glow 출력으로 이동
- 2026-07-22 Canvas 기반 sprite animation을 메인 매니저 창, hover, window interaction layer에 적용하고 `?review=sprites` 전용 검수 화면과 sprite sheet verifier를 유지
- 2026-07-23 manager asset 폴더 명명 규칙을 확정: canonical runtime은 `public/assets/lumi/<pet-id>-<stage-id>/`와 version suffix 없는 `<pet-id>-<stage-id>-<motion>-sheet.png`를 사용하고, 후보는 `*-production-candidates/`에 version suffix로 보관
- 2026-07-23 `pink-manager`와 `glass-frog`는 사실상 Stage 2 기준 이미지로 확정하고 canonical 폴더를 `pink-manager-stage-2/`, `glass-frog-stage-2/`로 정리. 꼬마비로드갯민숭달팽이는 Stage 2 두 번째 후보를 기준으로 삼고, 등 돌기는 징그럽지 않은 납작한 별점/펄 무늬로 대체하는 motion plan을 추가

- 2026-07-23 꼬마비로드갯민숭달팽이 Stage 2 production candidate motion sheet 10종을 생성하고 review set에 연결: `public/assets/lumi/sea-bunny-slug-stage-2-production-candidates/sea-bunny-slug-stage-2-*-sheet-v1.png`, contact sheet `public/assets/_review/sea-bunny-slug-stage-2-production-candidates-contact.png`. 1차 눈검수상 `focused`의 스캔 FX와 `hanging`의 흡착부는 사용자 검수 후 v2 후보 가능성 있음

- 2026-07-23 꼬마비로드갯민숭달팽이 `hanging`은 한쪽 귀로 대롱대롱 매달리는 v2, `climbing`은 엉덩이만 보이는 정후면 대신 긴 등면이 보이는 rear 3/4 top-back v2로 재생성하고 review set을 v2 파일로 연결
- 2026-07-23 TDD 우선 확장 도메인 규칙 추가: 성장/보상/능력치, stage 해금/회귀, interaction object rect/resize/progress, pet locomotion, pixelizer plan, blink/sound policy, public quest/gesture policy를 RED -> GREEN 흐름으로 테스트화
- 2026-07-23 Pet Behavior State Machine 추가: 상황 기반 후보 생성, deterministic weighted behavior selection, persona별 weight 조정, behavior state -> animation state mapping을 테스트로 고정
- 2026-07-23 ManagerBehaviorIntent 경계 추가: LLM이 줄 수 있는 `behaviorStyle`, `tone`, `line`, `suggestedBehaviorBias`를 정규화하고 unknown behavior, invalid style, 과도한 weightDelta를 fallback/clamp 처리
- 2026-07-23 ManagerBehaviorAdapter 추가: raw manager intent를 정규화한 뒤 현재 BehaviorContext와 결합해 weighted behavior와 animation state를 결정하는 도메인 경계를 TDD로 고정
- 2026-07-23 TDD 반복 workflow를 `.codex/agents/tdd_workflow.toml` Agent와 `.agents/skills/tdd-test-writing/SKILL.md` Skill로 분리
- 2026-07-23 아키텍처 5장 구조도와 Supabase 확장 정규화 후보를 최신 기준으로 갱신
- 2026-07-23 PR showcase 제출용 `showcase/showcase.json`, `thumbnail.webp`, `screenshots/home.webp` 추가

## 검증

- 정적 미리보기 URL: http://localhost:5173/prototype-static.html
- 파일 직접 열기 경로: file:///D:/2026.1/AIAgentChallenge/hub/public/prototype-static.html
- 초기 문서 작업 당시에는 빌드 검증을 수행하지 않았고, 이후 React/Hono 작업에서는 별도 검증을 수행함
- 하네스 구조 검증 통과: `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- TOML 파싱 검증 통과: `.codex/config.toml`, `.codex/agents/*.toml`
- TypeScript 검증 통과: `npm.cmd run typecheck`
- 프로덕션 빌드 통과: `npm.cmd run build`
- 2026-07-14 하네스 감사 재검증 통과: `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- 2026-07-14 TypeScript 재검증 통과: `npm.cmd run typecheck`
- 2026-07-14 프로덕션 빌드 재검증 통과: `npm.cmd run build`
- 2026-07-14 React 핵심 화면/mock 기록 흐름 TypeScript 검증 통과: `npm.cmd run typecheck`
- 2026-07-16 Hono Quest Event 수직 슬라이스 검증 통과: `npm.cmd run typecheck`, `npm.cmd run typecheck:server`, Vite dev middleware HTTP smoke test
- 2026-07-16 프로덕션 빌드 검증 통과: `npm.cmd run build`
- 2026-07-16 로컬 dev 서버 확인: `npm.cmd run dev -- --host 127.0.0.1 --port 4175`, `/api/health` 응답 `{"ok":true}`
- 2026-07-16 발표 자료 overflow 검증 통과: `slides_test.py`
- 2026-07-16 수직 슬라이스 검증 보강 통과: `npm.cmd run typecheck`, `npm.cmd run typecheck:server`, `npm.cmd run build`, `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- 2026-07-16 `/api/health`가 Hono API storage mode를 반환하도록 보강: Supabase env가 없으면 `memory`, 실제 env가 있으면 `supabase`로 확인 가능
- 2026-07-17 동적 asset manifest 정렬 후 TypeScript 검증 통과: `npm.cmd run typecheck`
- 2026-07-17 실제 생물 v2 후보 PNG 생성 후 chroma-key 제거본 네 모서리 alpha 검증 통과
- 2026-07-18 desktop icon pixel v2 18개가 모두 48x48 PNG로 생성됨을 확인하고 TypeScript 검증 통과: `npm.cmd run typecheck`
- 2026-07-18 `pixel-tv` icon pixel v2 2개가 48x48 RGBA/투명 모서리 PNG로 생성됨을 확인하고 TypeScript 검증 통과: `npm.cmd run typecheck`
- 2026-07-18 hover redesign 7개 PNG가 모두 48x48 RGBA/투명 모서리로 유지됨을 확인
- 2026-07-18 플라나리아 Stage 1 animation sample 7개가 모두 `256x64` RGBA sprite sheet로 생성되고, 일반 상태 중심 오차는 대략 0~1px 수준으로 보정됨
- 2026-07-22 9종 Stage 1 펫 motion sheet 90개와 플라나리아 샘플 7개가 `npm.cmd run verify:sprites`에서 통과하고, `npm.cmd run typecheck` 통과
- 2026-07-22 핑크 매니저 motion board 검수 결과: V3는 상태별 연기와 `run/walk/climbing` 방향성은 우수하나, 원본 board grid가 crop-safe하지 않아 production sheet로 직접 승격하지 않고 row별 검수/추출 단계를 추가하기로 함
- 2026-07-22 핑크 매니저 crop 방식 재검수 결과: row crop도 머리/장식/프레임 여백이 흔들려 production 기준으로 부적합. 다음 생성부터는 contact sheet를 만들지 않고, 실제 runtime용 production sprite sheet 자체를 생성/검수 대상으로 삼기로 함
- 2026-07-18 플라나리아 Stage 1 animation 기준 frame-0 7개와 reference contact sheet를 생성하고 문서 경로 확인
- 2026-07-20 Wiki index/source/log 갱신 후 하네스 구조 검증 통과: `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- 2026-07-21 Supabase 실제 DB 검증 통과: `GET /api/health` -> `supabase`, `POST /api/quest-events` -> `201 Created`, `GET /api/quest-events?limit=5` -> `200 OK`, `GET /api/manager-context` -> `200 OK`
- 2026-07-22 asset/animation 검증 통과: `npm.cmd run typecheck`, `npm.cmd run verify:sprites`, `npm.cmd run build`
- 2026-07-23 canonical manager asset 검증 통과: `npm.cmd run verify:sprites`, `npm.cmd run typecheck`
- 2026-07-23 TDD 도메인 규칙 검증 통과: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- 2026-07-23 문서/하네스 최신화 검증 통과: `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- 로컬 skill 설치 확인: Superpowers, 하네스 workflow skills, `project-learning-agent`
- React 화면은 정적 HTML 기준으로 큰 flow/state 차이는 줄였고, 남은 시각 차이는 사용자가 직접 화면을 보며 추가 점검 예정

## 다음 작업

- 1순위: 캐릭터 생동감 후속 작업. `T-713` cyber-purr 사운드 후보를 정리하고, TDD로 만든 `ManagerBehaviorIntent`, `ManagerBehaviorAdapter`, Pet Behavior State Machine을 React Lumi animation state와 연결
- 2순위: 성장/보상 구조 연결. TDD로 만든 `T-703`, `T-717`, `T-712` 성장/보상 도메인 규칙을 Quest Event metadata, 기록 노트, 매니저 상태, 외형 선택 UI와 연결하고 `T-718` Supabase 정규화 기준을 확정
- 3순위: 상호작용 오브젝트 prototype. TDD로 만든 interaction object, pet locomotion, behavior state machine을 실제 사다리/평지/창탈출 UI prototype에 연결
- 4순위: 월드/실험 기능 prototype. `T-708`, `T-721`, `T-722`, `T-723` 하루 흐름 Web theme, 현실 픽셀화 TV, 공개 퀘스트 탐색, 웹캠 손 제스처 탐색을 별도 prototype으로 검증
- 후속 검수: `T-724` Single-plane Pepper projection mode는 기본 flow가 연결되어 있으므로 브라우저에서 projection 화면 품질과 front/back 자동 회전 v1.5 필요 여부만 추가 판단
- React 화면은 이미 `WindowFrame`, `ProfileWizard`, `DesktopShell`, `QuestWindow`, `ManagerWindow`, `JournalWindow` 중심으로 분리되어 있고, 다음 분리는 UI 파일 추가보다 `useQuestFlow`, `useQuestLogSync`, `usePixelTvMode` 같은 상태 hook 단위가 우선
- 기록 노트 API 로딩/빈 상태/실패 상태 polish
- 정적 HTML 기준으로 남은 UI 시각 차이 수동 점검 및 우선순위화
- 다음 에셋 제작 세션에서 `docs/dynamic-asset-requirements.md` 기준으로 sprite, icon, theme, reward, sound asset을 생성
- `docs/notion-dashboard-guide.md`는 오래된 문서이므로 공식 흐름에서 제외 상태 유지
- 오래된 계획 문서에 남아 있는 Notion 기준 표현은 역사 문맥인지 현재 기준인지 정리 필요

## 차단 요소

- Supabase Key와 API Key는 저장소에 넣지 않아야 하며, `.env`에는 로컬 실제 값만 둬야 함
- Supabase env가 없는 새 환경에서는 서버가 memory store로 fallback하므로 `/api/health`로 storage mode를 먼저 확인해야 함
- 이번 세션에서는 dev server가 실행 중이 아니어서 `/api/health` UI 재검증은 수행하지 못함
- 현재 PowerShell 환경에 `Path`/`PATH` 중복이 있어 `Start-Process` 기반 자동 dev-server smoke test는 실패할 수 있음. 수동 브라우저 검증 또는 깨끗한 shell에서 `npm.cmd run dev`로 확인 필요
- GitHub Wiki는 코드 PR에 포함되지 않아 별도 동기화 필요
