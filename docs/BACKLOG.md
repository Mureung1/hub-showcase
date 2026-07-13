# BACKLOG.md

> IRIS MVP 개발 계획 및 진행 상황을 관리하는 문서입니다.

작성일: 2026-07-13

---

# 1. 목표

- Discord를 통해 대학 공지를 편하게 구독할 수 있는 MVP를 완성한다.
- 관리자 페이지와 Discord Bot을 실제로 연동한다.
- 공지 사이트 설정, 크롤링, 중복 검사, Discord 알림까지 하나의 동작 흐름을 구현한다.

---

# 2. 개발 범위

## MVP

- Admin Web
- Backend REST API
- MySQL + Prisma
- Discord Bot
- Frontend Vercel 배포
- Backend Docker/EC2 배포
- 공지 사이트 등록
- 테스트 크롤링
- 카테고리 설정
- Discord Role 생성/수정/삭제
- 카테고리 구독
- 키워드 알림
- 30분 주기 Scheduler
- Discord 채널 알림
- 설정 삭제 및 Bot 제거 데이터 정리

## Future

- AI 공지 요약
- AI Selector 추천
- Discord OAuth
- 여러 공지 사이트 지원
- 관리자 대시보드
- Google Calendar 연동
- 마감일 추출 및 재알림

---

# 3. 현재 진행 상황

## 완료

- [x] 프로젝트 기획
- [x] Prototype 제작
- [x] README
- [x] DESIGN.md
- [x] SPEC.md
- [x] API.md
- [x] DB.md
- [x] ARCHITECTURE.md
- [x] DEVELOPMENT.md

## 진행 중

- [ ] React 프로젝트 초기 세팅
- [ ] Express 프로젝트 초기 세팅

## 미완료

- [ ] Prisma schema 작성
- [ ] MySQL Docker 개발 환경 구성
- [ ] Backend 공통 설정
- [ ] Admin Web 구현
- [ ] Discord Bot 구현
- [ ] 공지 크롤러 구현
- [ ] Scheduler 구현
- [ ] Discord 알림 구현
- [ ] 키워드 알림 구현

---

# 4. 개발 원칙

- MVP 범위를 먼저 완성한다.
- 문서를 기준으로 구현하되, 구현 중 바뀐 결정은 문서에 반영한다.
- API contract를 먼저 고정한 뒤 UI와 연동한다.
- 기능 단위로 개발하고 테스트한다.
- 도메인 모듈 기준으로 코드를 나눈다.
- 배포는 마지막에 처음 시도하지 않고, 빈 앱 배포를 초반에 먼저 성공시킨다.
- AI 기능은 1차 MVP 이후 구현하되, 확장 가능한 위치만 예약한다.

---

# 5. 작업 순서

## Phase 1. Project Foundation

- [ ] Frontend TypeScript + React + Vite 세팅
- [ ] Backend TypeScript + Express 세팅
- [ ] ESLint/Prettier 기준 정리
- [ ] 환경 변수 구조 정리
- [ ] Frontend Vercel 배포 방식 결정
- [ ] Backend Docker/EC2 배포 방식 결정
- [ ] Backend health check API 작성
- [ ] Backend Dockerfile 초안 작성
- [ ] 빈 Backend 앱 EC2 실행 확인
- [ ] MySQL Docker 개발 환경 구성
- [ ] Production DB 연결 방식 정리
- [ ] Prisma migration 배포 방식 정리
- [ ] Prisma 설치 및 schema 작성
- [ ] 공통 error/response/logger 구조 작성

## Phase 2. Backend Notice Config

- [ ] `notice_sites`, `categories`, `notices`, `subscriptions`, `keywords` Prisma model 작성
- [ ] notice-config 도메인 모듈 생성
- [ ] 테스트 크롤링 API 구현
- [ ] 전체 설정 저장 API 구현
- [ ] 전체 설정 조회 API 구현
- [ ] 전체 설정 교체 API 구현
- [ ] 카테고리 설정 PATCH API 구현
- [ ] 전체 설정 삭제 API 구현

## Phase 3. Discord Resource And Role

- [ ] Discord Bot 기본 클라이언트 구성
- [ ] Discord 채널 목록 조회 API 구현
- [ ] 활성 카테고리 Role 생성 구현
- [ ] Role 이름 변경 구현
- [ ] Role 삭제 구현
- [ ] Bot Role hierarchy 에러 처리
- [ ] EC2 환경에서 Discord Bot login 확인
- [ ] `guildDelete` 이벤트 DB 정리 구현

## Phase 4. Admin Web

- [ ] Landing 구현
- [ ] 시작 가이드 구현
- [ ] 사이트 등록 화면 구현
- [ ] 테스트 크롤링 결과 미리보기 구현
- [ ] 카테고리 설정 화면 구현
- [ ] 기존 설정 조회 및 수정 흐름 구현
- [ ] 설정 완료 화면 구현
- [ ] 설정 삭제 UI 구현
- [ ] Vercel preview 배포 확인
- [ ] Frontend API base URL 환경 변수 연결 확인

## Phase 5. Discord Commands

- [ ] `/help` 구현
- [ ] `/setup` 관리자 권한 확인 구현
- [ ] `/setup` Admin 링크 ephemeral 응답 구현
- [ ] `/subscribe` active category 조회 구현
- [ ] `/subscribe` multi-select interaction 구현
- [ ] 구독 Role 부여/제거 구현
- [ ] `/keyword add` 구현
- [ ] `/keyword remove` 구현
- [ ] `/keyword list` 구현

## Phase 6. Crawling And Notification

- [ ] 30분 Scheduler 구현
- [ ] 등록된 notice site 순회 구현
- [ ] selector 기반 공지 추출 구현
- [ ] DateTime 파싱 구현
- [ ] normalizedLink 생성 구현
- [ ] `hashKey` 중복 검사 구현
- [ ] 활성 카테고리 공지 저장 구현
- [ ] 카테고리별 Discord Embed 알림 구현
- [ ] Role mention 구현
- [ ] 키워드 제목 매칭 구현
- [ ] 키워드 DM 알림 구현

## Phase 7. QA And Release Prep

- [ ] 테스트 크롤링 실패 케이스 점검
- [ ] Role 생성 실패 케이스 점검
- [ ] Discord 채널 접근 실패 케이스 점검
- [ ] DM 실패 케이스 점검
- [ ] 설정 삭제 후 데이터 정리 점검
- [ ] 모바일/데스크톱 관리자 UI 점검
- [ ] 배포 환경 변수 점검
- [ ] Production Backend smoke test
- [ ] Production Frontend smoke test
- [ ] Discord Bot production login 확인
- [ ] Prisma migration 상태 확인
- [ ] 발표용 시나리오 점검

---

# 6. 우선순위

## P0

- 프로젝트 세팅
- 배포 방식 결정
- 빈 Backend 앱 EC2 실행
- Prisma schema
- 테스트 크롤링
- notice-config 저장/조회
- Discord Bot 기본 연결
- Discord 채널 조회
- Role 생성

## P1

- Admin Web 설정 흐름
- Vercel preview 배포
- `/setup`
- `/subscribe`
- Scheduler
- 공지 저장과 중복 검사
- Discord 채널 알림

## P2

- `/keyword`
- 키워드 DM 알림
- 설정 교체
- 카테고리 PATCH
- 전체 설정 삭제
- `guildDelete` 데이터 정리

## P3

- AI 요약
- AI Selector 추천
- Dashboard
- Discord OAuth
- Multi-site
- Calendar 연동

---

# 7. 개발 일정

## Week 1

- 프로젝트 세팅
- 빈 Backend 앱 배포 확인
- Prisma schema
- Production DB 연결 방식 정리
- Backend notice-config API
- 테스트 크롤링
- Admin 사이트 등록/카테고리 설정 화면

## Week 2

- Discord Bot 기본 구성
- 서버 환경에서 Discord Bot login 확인
- `/setup`
- Discord 채널 조회
- Role 생성/수정/삭제
- `/subscribe`
- Scheduler와 공지 크롤러

## Week 3

- Discord 채널 알림
- 키워드 명령어와 DM 알림
- 설정 수정/삭제
- 실패 케이스 점검
- 최종 배포 smoke test
- 발표 준비

---

# 8. 이후 개선 사항

- AI 공지 요약
- AI Selector 추천 또는 자동 입력
- Discord OAuth
- 한 Discord 서버에 여러 공지 사이트 지원
- 관리자 대시보드
- Google Calendar 연동
