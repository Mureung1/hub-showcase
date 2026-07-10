# 사이사이

사이사이는 같은 건물 또는 가까운 생활권에 사는 사람들을 연결하는 생활 커뮤니티 서비스입니다.

자유게시판, 도와주세요 게시판, 공동구매 탭을 통해 같은 건물 안에서 필요한 정보를 나누고, 도움을 주고받고, 함께 구매할 사람을 모집할 수 있습니다.

## 프로젝트 문서

- [기획서](docs/product-plan.md)
- [4주 MVP 계획 및 Backlog](docs/4-week-plan.md)
- [디렉터리 구조](docs/directory-structure.md)
- [디자인 가이드](docs/design.md)
- [프론트 작업](docs/frontend-tasks.md) · [백엔드 작업](docs/backend-tasks.md) · [DB 작업](docs/database-tasks.md)

## 해결하려는 문제

같은 건물에 살아도 서로를 알기 어렵고, 생활 속 작은 문제를 혼자 해결해야 하는 경우가 많습니다.

사이사이는 같은 건물 사람들끼리 자유롭게 소통하고, 필요한 도움을 요청하며, 공동구매를 통해 생활비 부담을 줄일 수 있도록 돕습니다.

## 주요 기능

- 같은 건물 자동 매칭 
  - 아파트/오피스텔: 같은 건물 매칭
  - 단독, 다가구 주택 등: 근처 건물 매칭
- 자유게시판
- 도와주세요 게시판
- 상품 카드형 공동구매 모집
- 공동구매 참여 인원 확인
- 공동구매 1인 부담 금액 확인
- 내 게시글 및 참여 내역 확인

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
│  │  └─ activity/
│  ├─ repositories/            # Mock/HTTP 데이터 접근 계약
│  ├─ mocks/                   # 프론트 데모 데이터
│  ├─ lib/                     # 공통 인프라와 유틸
│  ├─ styles/                  # 전역 스타일과 디자인 토큰
│  └─ main.jsx
├─ server/                      # Express 백엔드 골격
│  ├─ src/
│  │  ├─ modules/              # users, posts, 공동구매 등 기능 모듈
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

현재는 기획 및 MVP 설계 단계입니다.
