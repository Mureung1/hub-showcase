# 개발 백로그 (4주)

혼자 개발. 매주 네이버 프로그램 데모/체크포인트가 고정돼 있어 각 주 마지막에 데모 준비를 넣는다.
아래 목록은 현재 구현 상태를 기준으로 관리한다.

## Week 1 (7/6~7/10) — 완료
- [x] 기획서 · 화면 구조 · 초기 프로토타입 검증 ([plan.md](plan.md))
- [x] AI 연동 방식 조사 (Vertex Gemini + LiteLLM 게이트웨이)
- [x] 상담 프렙시트 기능
- [x] client/server 디렉토리 구조 재편
- [x] 1주차 데모 진행 (발표 자료는 로컬 보관)

## Week 2 (7/13~7/17)
- [x] 2주차 목표/범위 정리 및 GitHub 이슈 등록
- [x] Supabase `checkins` 테이블 준비
- [x] server/routes/checkins.js 에러 처리 정리 (try/catch + 중앙 에러 핸들링 미들웨어 — CLAUDE.md 에러 처리 컨벤션 적용)
- [x] AI mock 결과로 입력 → 구조화 결과 → 저장 흐름 연결
- [x] React 입력 화면/결과 카드/기록 목록 구현
- [x] FE-BE-DB 수직 슬라이스 검증: 입력 → Express → Supabase 저장 → 목록 조회
- [x] 계획 수립 Agent / 기능 검증 Agent 산출물 작성
- [x] 컴포넌트 분리 (CheckinForm/SummaryCard/RecordCard) + 기록 상세 화면 (7/15)
- [x] 화면·데이터 흐름도 정리 ([screen-flow.md](screen-flow.md)) + 데이터 모델 초안 ([data-model.md](data-model.md)) (7/15)
- [x] 2주차 데모 진행 (발표 자료는 로컬 보관)

오늘(7/15) 논의했으나 미룬 것 → Week 3에 반영: 기록 삭제 기능, 감정 태그 선택, 주간 모아보기

## Week 3 (7/20~7/24)
- [x] AI 연동: LiteLLM 게이트웨이로 Vertex Gemini 실호출, 스키마 강제 출력 (이미 구현됨 — mock은 게이트웨이 실패 시 fallback)
- [x] 기록 캘린더 뷰
- [x] 무드·사진 필드 반영과 화면 흐름 연결
- [x] 기록 삭제 기능 — [삭제 기능 설계](features/delete-checkin-plan.md)를 기준으로 TDD 구현·스모크 검증
- [x] 감정 태그 선택 → 무드 피커(이모지)로 구현
- [ ] 주간 모아보기 (7/15 논의에서 미룸)
- [ ] PWA 설치 지원 (manifest + 아이콘 — 폰 홈 화면에 앱처럼 설치)
- [x] 아키텍처 다이어그램을 README에 반영
- [x] Agent 산출물: 기능 개발 절차와 검증 역할 문서화
- [ ] Render 단일 서비스 구성 검토 완료, 실제 공개 URL 배포·접속 검증
- [ ] Slack random 채널에 기술 공유 1건 이상 (예: PWA가 뭔지, fabricated citation 검증 경험 등)
- [ ] 3주차 데모 준비

## Week 4 (7/27~7/31)

멘토링 피드백으로 방향 전환 — 로그인·클라우드 저장 대신 게스트 모드(로컬 저장) 중심으로.

- [ ] 핵심 기능 마무리 — 게스트로 시작, 브라우저 저장, 새로고침 유지, 삭제, 저장 방식 안내
- [ ] 기능 추가·버그 수정 — 기본/AI 정리 구분, AI 전송 전 안내, 기록 내보내기, 모바일 확인
- [ ] 배포 (할 수 있으면 — Render 단일 서비스, 실제 공개 URL 접속 검증)
- [ ] Agent·Skill 워크플로우 정리
- [ ] 발표 자료 정리
