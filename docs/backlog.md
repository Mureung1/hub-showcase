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
- [ ] AI 연동: LiteLLM 게이트웨이로 Vertex Gemini 실호출, 스키마 강제 출력 (plan.md 체크리스트 3번)
- [ ] 기록 캘린더 뷰 (체크리스트 5번)
- [ ] 기록 삭제 기능 (7/15 논의에서 미룸)
- [ ] 감정 태그 선택 (7/15 논의에서 미룸 — 데이터 모델 논의 포인트 참고)
- [ ] 주간 모아보기 (7/15 논의에서 미룸)
- [ ] 배포 방식 조사·결정 및 시도 (프론트/백 분리 배포 — 처음이라 옵션 비교부터 시작)
- [ ] 3주차 데모 준비

## Week 4 (7/27~7/31)
- [ ] 반복 패턴 표시 + 지원 정보 안내 (체크리스트 6번 — 상담 프렙시트는 이미 완료됨)
- [ ] (여유 시) 회고/체크아웃 문장 변환
- [ ] 전체 마무리 · 버그 정리
- [ ] 최종 데모/발표 준비
