# 사이사이

사이사이는 같은 건물 또는 가까운 생활권에 사는 사람들을 연결하는 생활 커뮤니티 서비스입니다.

자유게시판, 도와주세요 게시판, 공동구매 탭을 통해 같은 건물 안에서 필요한 정보를 나누고, 도움을 주고받고, 함께 구매할 사람을 모집할 수 있습니다.

## 프로젝트 문서

- [기획서](docs/product-plan.md)
- [남은 3주 MVP 계획 및 Backlog](docs/4-week-plan.md)
- [디렉터리 구조](docs/directory-structure.md)
- [디자인 가이드](docs/design.md)
- [프론트 작업](docs/frontend-tasks.md) · [백엔드 작업](docs/backend-tasks.md) · [DB 작업](docs/database-tasks.md)

## 해결하려는 문제

같은 건물에 살아도 서로를 알기 어렵고, 생활 속 작은 문제를 혼자 해결해야 하는 경우가 많습니다.

사이사이는 같은 건물 사람들끼리 자유롭게 소통하고, 필요한 도움을 요청하며, 공동구매를 통해 생활비 부담을 줄일 수 있도록 돕습니다.

## 주요 기능

- 이메일/비밀번호 회원가입과 로그인
- Kakao 주소 검색 기반 커뮤니티 자동 배정
  - 아파트/오피스텔: 같은 단지·동 번호
  - 주택/빌라: H3 해상도 9 생활권
- 자유게시판 글·댓글
- 도와주세요 글·댓글·작성자 완료·1:1 채팅
- 공동구매 생성·참여·모집자 확정
- 확정 참여자 그룹 채팅과 예상 1인 부담 금액

## 기술 스택

- Frontend: React, Vite
- Backend 예정: Express
- Database 예정: Supabase

## 파일 구조

```text
hub/
├─ src/                         # React 프론트엔드
│  ├─ app/                     # 앱 진입점과 AppShell
│  ├─ components/ui/           # 여러 기능이 공유하는 UI
│  ├─ features/                # 기능별 화면과 로직
│  │  ├─ auth/
│  │  ├─ onboarding/
│  │  ├─ posts/
│  │  ├─ help-requests/
│  │  ├─ group-buys/
│  │  └─ conversations/
│  ├─ repositories/            # API 계약과 HTTP 데이터 접근
│  ├─ mocks/                   # 기존 빈 디렉터리, 이번 MVP에서 미사용
│  ├─ lib/                     # 공통 인프라와 유틸
│  ├─ styles/                  # 전역 스타일과 디자인 토큰
│  └─ main.jsx
├─ server/                      # Express 백엔드 골격
│  ├─ src/
│  │  ├─ modules/              # users, addresses, posts, conversations 등
│  │  ├─ middleware/           # 인증과 공통 요청 처리
│  │  ├─ lib/                  # Supabase client와 공통 유틸
│  │  ├─ config/               # 환경 변수와 런타임 설정
│  │  └─ errors/               # 공통 오류
│  └─ test/                    # API 통합 테스트
├─ supabase/                    # Supabase DB 골격
│  ├─ migrations/              # 스키마, 함수, RLS
│  ├─ tests/                   # RLS와 RPC 테스트
│  └─ seed.sql                 # DB 기준 데이터
├─ scripts/                     # Auth 데모 seed 스크립트 예정
├─ docs/                        # 기획, 디자인, task, 일정 문서
├─ prototype/                   # 참고용 HTML/CSS/JS 프로토타입
├─ package.json                 # 프론트·백엔드 공용 패키지 설정
└─ vite.config.js
```

백엔드와 Supabase는 현재 디렉터리 골격만 준비된 상태입니다. 세부 배치와 import 규칙은 [디렉터리 구조 문서](docs/directory-structure.md)를 기준으로 합니다.

## 실행 방법

```bash
npm install
npm run dev
```

## 개발 상태

1주차 기획·설계는 완료됐고 실제 기능은 아직 구현되지 않았습니다. 2026년 7월 13일부터 7월 31일까지의 구현 순서와 완료 조건은 [남은 3주 MVP 계획](docs/4-week-plan.md)을 기준으로 합니다.
