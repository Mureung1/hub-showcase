# CLAUDE.md

## 프로젝트
한끼바꿈 — 지역거점국립대 학생의 디지털 재능과 대학가 사장님의 식사권을 물물교환하는 로컬 상생 플랫폼 (4주 MVP)

## 기술 스택
- React + Vite (client/) — JavaScript, TypeScript 미사용
- Express (server/) — 얇은 서버: ① AI 문구 생성 프록시 ② 핵심 규칙 검증만 담당
- Supabase — DB(Postgres) · Storage(이미지) · Auth(이메일 로그인)
- 상태관리 라이브러리 금지 — useState/Context로 해결

## 디렉토리 구조
- client/src/components/ — Ticket, StepBar, TagChip 등 공용 컴포넌트
- client/src/pages/ — 화면 단위 (~Page.jsx)
- client/src/lib/ — supabase.js, api.js (server 호출)
- client/src/styles/tokens.css — 디자인 토큰 (hankki-design 스킬과 동일 값)
- server/src/routes/ · services/ — AI 호출은 반드시 server 경유 (API 키 클라이언트 노출 금지)

## 핵심 도메인 규칙
- 거래 상태값: `모집중 → 진행중 → 완료대기 → 완료` 순서 고정, 건너뛰기 금지
- `완료` 전환은 사장님·헬퍼 양측 확인이 모두 있어야 성립 — 이 검증은 server가 담당
- 요청 게시글 필수 필드: 태그, 요청 내용, 기대 결과물 예시, 보상(식사권 수량), 지역
- 수정 요청은 1회 포함이 기본값
- 무응답 매칭은 자동취소 처리
- Tab2 완료 결과물 이미지는 Tab1 게시글 썸네일로 재사용 가능해야 함

## 컨벤션
- 컴포넌트: PascalCase / 페이지: ~Page.jsx / 함수·변수: camelCase
- 커밋: feat / fix / refactor / docs / chore + 한글 요약 (예: `feat: 재능 요청 등록 폼 구현`)
- 브랜치: main + feature/기능명 — main 직접 푸시 금지, PR 필수
- 환경변수는 .env (커밋 금지), .env.example만 커밋

## 하지 말 것
- 결제 기능 구현 금지 (현금 없는 물물교환 구조)
- 실시간 채팅 구현 금지 — 상태값 + 알림으로 대체
- 위치 API·GPS 사용 금지 — 지역은 프리셋 드롭다운 3개 고정: 활성 `부산대 앞` / 오픈 예정(비활성) `경북대 앞` `경상국립대 앞`
- AI 생성 홍보글 자동 게시 금지 — 사장님 확인 후에만 게시
- 태그 임의 추가 금지 (Tab1 4종, Tab2 5종 고정)
- LLM API 키를 client 코드·환경변수에 두지 않기 — server만 보유
- 외부 UI 라이브러리·상태관리 라이브러리 추가 금지 (별도 합의 전까지)

## 미확정 (개발 전 팀 결정 필요)
- AI 모델·API 선택과 비용 한도
- 배포처 (후보: client=Vercel, server=Render)
- DB 테이블 상세 스키마 (requests, confirmations, tickets, ratings 초안 기준)

## 참고
- 기획서 최종본 (노션): https://app.notion.com/p/v0-2-397dee17209c802d9495f20edf723b95
- 기획서 레포 사본: @docs/plan.md — `한끼바꿈_기획서.md`를 이 경로에 넣은 뒤 사용
- 프로토타입: @docs/prototype.html — `한끼바꿈_프로토타입_웜.html`을 이 경로에 넣은 뒤 사용
- 디자인 기준 화면: @docs/wallet-warm.html / 디자인 규칙: .claude/skills/hankki-design/SKILL.md
- 노션이 최신본, 레포 사본은 노션 수정 시 함께 갱신할 것
