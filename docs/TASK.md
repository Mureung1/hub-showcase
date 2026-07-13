# TASK.md

> IRIS MVP의 13일 개발 작업과 2일 발표 준비/발표 계획을 관리하는 문서입니다.

작성일: 2026-07-13

---

# 진행 방식

- 총 기간은 개발 13일 + 발표 준비/발표 2일로 잡는다.
- 매일 시작할 때 해당 날짜의 작업을 확인하고, 끝날 때 완료/이슈/이월 항목을 갱신한다.
- Backlog의 Phase를 기준으로 하되, 실제 진행 상황에 따라 다음 날 작업을 조정한다.
- MVP 완성을 우선하며 AI 요약, OAuth, Multi-site는 발표 이후 확장으로 둔다.

---

# Day 1. Project Foundation

## 목표

- Frontend/Backend 기본 프로젝트를 TypeScript 기준으로 세팅한다.
- 로컬 개발 환경의 뼈대를 만든다.
- 배포 방식을 초기에 결정한다.

## 할 일

- [x] Frontend TypeScript + React + Vite 세팅
- [x] Backend TypeScript + Express 세팅
- [x] 기본 폴더 구조 생성
- [x] ESLint/Prettier 설정
- [x] 환경 변수 예시 파일 작성
- [x] Frontend Vercel 배포 방식 결정
- [x] Backend Docker/EC2 배포 방식 결정
- [x] Backend와 Discord Bot을 같은 프로세스로 둘지 결정
- [x] 로컬 실행 명령어 정리

## 이슈

- 없음

## 이월

- 없음

---

# Day 2. Database And Prisma

## 목표

- DB.md 기준으로 MySQL/Prisma 기반을 만든다.
- 개발/배포 환경에서 DB 연결 방식을 정한다.

## 할 일

- [ ] MySQL Docker compose 작성
- [ ] Production MySQL 연결 방식 결정
- [ ] 배포 환경 DATABASE_URL 구조 정리
- [ ] Prisma 설치
- [ ] `schema.prisma` 작성
- [ ] Prisma migration 실행
- [ ] 배포 시 Prisma migration 실행 방식 결정
- [ ] Prisma client 연결 확인
- [ ] seed 또는 테스트 데이터 초안 작성

## 이슈

- 없음

## 이월

- 없음

---

# Day 3. Backend Common And Notice Config Base

## 목표

- Backend 공통 구조와 notice-config 도메인 모듈을 만든다.
- 빈 Backend 앱을 배포 가능한 상태로 만든다.

## 할 일

- [ ] Express app 구조 작성
- [ ] Health check API 작성
- [ ] 공통 success/error response 작성
- [ ] 공통 error class 작성
- [ ] logger 초안 작성
- [ ] request validation 방식 결정 및 적용
- [ ] notice-config module 생성
- [ ] notice-config routes/controller/service/repository 골격 작성
- [ ] Backend Dockerfile 초안 작성
- [ ] Backend 배포용 Docker Compose 작성
- [ ] Fork `personal-deploy` Backend CI/CD workflow 작성
- [ ] EC2에서 빈 Backend 앱 실행 확인

## 이슈

- 없음

## 이월

- 없음

---

# Day 4. Test Crawl API

## 목표

- 관리자 입력 selector로 테스트 크롤링을 수행하고 미리보기 결과를 반환한다.

## 할 일

- [ ] Axios/Cheerio crawler 기본 구현
- [ ] selector 기반 notice 추출 구현
- [ ] title/link/date/category 필수 검증 구현
- [ ] DateTime 파싱 구현
- [ ] relative link absolute URL 변환 구현
- [ ] `POST /api/admin/{guildId}/notice-config/test` 구현
- [ ] 테스트 크롤링 실패 케이스 응답 정리

## 이슈

- 없음

## 이월

- 없음

---

# Day 5. Notice Config Save And Read

## 목표

- 공지 사이트 설정과 카테고리 설정을 저장하고 조회한다.

## 할 일

- [ ] `POST /api/admin/{guildId}/notice-config` 구현
- [ ] `GET /api/admin/{guildId}/notice-config` 구현
- [ ] 활성/비활성 카테고리 저장 정책 구현
- [ ] roleId nullable 저장 처리
- [ ] 서버당 공지 사이트 1개 제약 처리
- [ ] 저장/조회 API 수동 테스트

## 이슈

- 없음

## 이월

- 없음

---

# Day 6. Discord Resource And Role

## 목표

- Discord Bot 연결과 채널/Role 관리 기능을 구현한다.
- 서버 환경에서 Discord Bot login이 가능한지 확인한다.

## 할 일

- [ ] discord.js client 구성
- [ ] Bot env 설정
- [ ] Discord 채널 목록 조회 구현
- [ ] `GET /api/admin/{guildId}/discord/channels` 구현
- [ ] 활성 카테고리 Role 생성 구현
- [ ] Role 이름 변경 구현
- [ ] Role 삭제 구현
- [ ] Bot Role hierarchy 에러 처리
- [ ] EC2 환경 변수로 Discord Bot login 확인

## 이슈

- 없음

## 이월

- 없음

---

# Day 7. Config Replace, Patch, Delete

## 목표

- 설정 수정/교체/삭제 흐름을 완성한다.
- Backend 배포 URL과 기본 API smoke test를 확인한다.

## 할 일

- [ ] `PUT /api/admin/{guildId}/notice-config` 구현
- [ ] `PATCH /api/admin/{guildId}/notice-config/categories` 구현
- [ ] `DELETE /api/admin/{guildId}/notice-config` 구현
- [ ] 기존 Role 정리 흐름 구현
- [ ] subscriptions/notices/keywords 삭제 흐름 구현
- [ ] `guildDelete` 이벤트 DB 정리 구현
- [ ] 배포된 Backend health check 확인
- [ ] 배포된 Backend에서 DB 연결 확인

## 이슈

- 없음

## 이월

- 없음

---

# Day 8. Admin Web Core Flow

## 목표

- 관리자 설정의 핵심 화면 흐름을 구현한다.
- Frontend 배포 preview를 초기에 확인한다.

## 할 일

- [ ] Landing 구현
- [ ] 시작 가이드 구현
- [ ] 사이트 등록 화면 구현
- [ ] selector 입력 form 구현
- [ ] 테스트 크롤링 API 연동
- [ ] 최근 공지 미리보기 구현
- [ ] 감지 카테고리 상태 관리 구현
- [ ] Fork `personal-deploy` Frontend CI 및 Vercel 배포 workflow 작성
- [ ] Vercel preview 배포 확인
- [ ] Frontend API base URL 환경 변수 연결 확인

## 이슈

- 없음

## 이월

- 없음

---

# Day 9. Admin Category And Complete Flow

## 목표

- 카테고리 설정, 저장, 완료 화면을 구현한다.

## 할 일

- [ ] Discord 채널 목록 API 연동
- [ ] 카테고리 설정 table 구현
- [ ] roleName/isActive 입력 구현
- [ ] 저장/다음 버튼 상태 구현
- [ ] 기존 설정 조회 후 form 채우기
- [ ] 설정 완료 화면 구현
- [ ] 설정 삭제 UI 구현
- [ ] 반응형 1차 점검

## 이슈

- 없음

## 이월

- 없음

---

# Day 10. Discord Slash Commands

## 목표

- Discord 사용자가 명령어로 설정 링크, 구독, 키워드를 사용할 수 있게 한다.

## 할 일

- [ ] `/help` 구현
- [ ] `/setup` 관리자 권한 확인 구현
- [ ] `/setup` Admin 링크 ephemeral 응답 구현
- [ ] `/subscribe` active category 조회 구현
- [ ] `/subscribe` multi-select 구현
- [ ] 구독 Role 부여/제거 구현
- [ ] `/keyword add` 구현
- [ ] `/keyword remove` 구현
- [ ] `/keyword list` 구현

## 이슈

- 없음

## 이월

- 없음

---

# Day 11. Scheduler And Notification

## 목표

- 30분 주기 크롤링과 Discord 알림을 연결한다.

## 할 일

- [ ] node-cron Scheduler 구현
- [ ] 등록된 notice site 순회 구현
- [ ] normalizedLink 생성 구현
- [ ] `hashKey` 생성 및 중복 검사 구현
- [ ] 활성 카테고리 매칭 구현
- [ ] 신규 공지 저장 구현
- [ ] Discord Embed 알림 구현
- [ ] Role mention 구현

## 이슈

- 없음

## 이월

- 없음

---

# Day 12. Keyword DM And Integration

## 목표

- 키워드 DM 알림을 완성하고 전체 흐름을 통합 점검한다.

## 할 일

- [ ] 공지 제목 기준 키워드 매칭 구현
- [ ] guildId + userId + keyword 범위 확인
- [ ] 키워드 일치 사용자 조회 구현
- [ ] DM 전송 구현
- [ ] DM 실패 처리 구현
- [ ] 설정 저장부터 알림까지 end-to-end 점검
- [ ] 주요 실패 케이스 수동 테스트

## 이슈

- 없음

## 이월

- 없음

---

# Day 13. QA And Final Deployment Check

## 목표

- MVP 안정화와 최종 배포 점검을 끝낸다.
- Day 13에는 최초 배포가 아니라 이미 배포된 환경의 최종 smoke test만 수행한다.

## 할 일

- [ ] 테스트 크롤링 실패 케이스 점검
- [ ] Role 생성/삭제 실패 케이스 점검
- [ ] Discord 채널 접근 실패 케이스 점검
- [ ] 설정 삭제 후 데이터 정리 점검
- [ ] Bot 제거 후 `guildDelete` 정리 점검
- [ ] 모바일/데스크톱 UI 점검
- [ ] 환경 변수 점검
- [ ] Production Backend smoke test
- [ ] Production Frontend smoke test
- [ ] Discord Bot production login 확인
- [ ] Prisma migration 상태 확인
- [ ] 발표 데모 시나리오 초안 작성

## 이슈

- 없음

## 이월

- 없음

---

# Day 14. 발표 준비

## 목표

- 발표 자료와 데모 흐름을 준비한다.

## 할 일

- [ ] 발표 자료 작성
- [ ] 문제 정의와 MVP 목표 정리
- [ ] 아키텍처 설명 슬라이드 작성
- [ ] 데모용 Discord 서버 준비
- [ ] 데모용 공지 사이트/selector 준비
- [ ] 데모 데이터 초기화
- [ ] 발표 리허설
- [ ] 예상 질문 정리

## 이슈

- 없음

## 이월

- 없음

---

# Day 15. 발표

## 목표

- 안정적으로 IRIS MVP를 시연하고 발표한다.

## 할 일

- [ ] 데모 환경 최종 확인
- [ ] Discord Bot 접속 확인
- [ ] Backend/Frontend 접속 확인
- [ ] DB 상태 확인
- [ ] 발표 진행
- [ ] 데모 진행
- [ ] 질의응답
- [ ] 발표 후 개선 사항 기록

## 이슈

- 없음

## 이월

- 없음
