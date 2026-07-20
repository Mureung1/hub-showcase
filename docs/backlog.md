# 개발 백로그 (4주)

혼자 개발. 매주 네이버 프로그램 데모/체크포인트가 고정돼 있어 각 주 마지막에 데모 준비를 넣는다.
지난 4주 로드맵([intro.html](intro.html))은 실제 진행과 어긋나서, 아래는 현재 상태 기준으로 다시 짠 백로그다.

## Week 1 (7/6~7/10) — 완료
- [x] 기획서 · 화면 구조 · 프로토타입 ([plan.md](plan.md), [prototype.html](prototype.html))
- [x] AI 연동 방식 조사 (Vertex Gemini + LiteLLM 게이트웨이)
- [x] 상담 프렙시트 기능
- [x] client/server 디렉토리 구조 재편
- [x] 1주차 데모 ([demo-week1.md](archive/demo-week1.md))

## Week 2 (7/13~7/17)
- [x] 2주차 목표/범위 정리 및 GitHub 이슈 등록
- [x] Supabase `checkins` 테이블 준비
- [x] server/routes/checkins.js 에러 처리 정리 (try/catch + 중앙 에러 핸들링 미들웨어 — CLAUDE.md 에러 처리 컨벤션 적용)
- [x] AI mock 결과로 입력 → 구조화 결과 → 저장 흐름 연결
- [x] React 입력 화면/결과 카드/기록 목록 구현
- [x] FE-BE-DB 수직 슬라이스 검증: 입력 → Express → Supabase 저장 → 목록 조회 ([week2-verification-result.md](archive/week2-verification-result.md))
- [x] 계획 수립 Agent / 기능 검증 Agent 산출물 작성
- [x] 컴포넌트 분리 (CheckinForm/SummaryCard/RecordCard) + 기록 상세 화면 (7/15)
- [x] 화면·데이터 흐름도 정리 ([screen-flow.md](screen-flow.md)) + 데이터 모델 초안 ([data-model.md](data-model.md)) (7/15)
- [ ] 2주차 데모 준비

오늘(7/15) 논의했으나 미룬 것 → Week 3에 반영: 기록 삭제 기능, 감정 태그 선택, 주간 모아보기

## Week 3 (7/20~7/24)
- [x] AI 연동: LiteLLM 게이트웨이로 Vertex Gemini 실호출, 스키마 강제 출력 (이미 구현됨 — mock은 게이트웨이 실패 시 fallback)
- [x] 기록 캘린더 뷰 (feature/design-upgrade, 머지 대기)
- [ ] design-upgrade 마무리: Supabase mood/image_url 컬럼 SQL 실행 → 화면 확인 → N114_유승혁 머지·푸시
- [ ] 기록 삭제 기능 — TDD로 진행: 테스트 먼저 (7/15 논의에서 미룸 — `[검증테스트]` 더미 행도 이때 정리)
- [x] 감정 태그 선택 → 무드 피커(이모지)로 구현 (feature/design-upgrade, 머지 대기)
- [ ] 주간 모아보기 (7/15 논의에서 미룸)
- [ ] PWA 설치 지원 (manifest + 아이콘 — 폰 홈 화면에 앱처럼 설치)
- [ ] 아키텍처 다이어그램: mermaid로 화면·서버·DB 흐름 그려 README에 (screen-flow.md 기반)
- [ ] Agent 산출물: 테스트코드 생성 Skill + 워크플로우 문서, feature-verifier를 새 기능 검증에 활용
- [ ] 배포 방식 조사·결정 및 시도 (프론트/백 분리 배포 — AI 게이트웨이가 로컬 전용이라 배포용 엔드포인트 결정 포함)
- [ ] Slack random 채널에 기술 공유 1건 이상 (예: PWA가 뭔지, fabricated citation 검증 경험 등)
- [ ] 3주차 데모 준비

## Week 4 (7/27~7/31)
- [ ] 반복 패턴 표시 + 지원 정보 안내 (체크리스트 6번 — 상담 프렙시트는 이미 완료됨)
- [ ] (여유 시) 회고/체크아웃 문장 변환
- [ ] 전체 마무리 · 버그 정리
- [ ] 최종 데모/발표 준비
