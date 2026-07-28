# 알바노트

알바노트는 사장님과 알바생이 근무표, 공개 대타 요청, 근무 시간, 예상 급여, 알림을 한 곳에서 관리하는 React 기반 SPA 웹 서비스입니다.

## 프로젝트 목표

매장 근무 관리는 근무표 작성, 알바생 초대, 대타 요청, 급여 확인이 서로 흩어지기 쉽습니다. 알바노트는 이 흐름을 하나의 서비스 안에서 연결해 사장님은 매장 운영 상황을 빠르게 확인하고, 알바생은 본인 근무와 대타 요청 상태를 쉽게 확인할 수 있게 만드는 것을 목표로 합니다.

## 배포 URL

https://albanote-frontend.vercel.app

## 주요 기능

- 사장님 회원가입, 로그인, 매장 생성
- 알바생 초대, 시급과 기본 근무 시간 관리
- 월간 근무표 조회와 일간 근무표 상세 조회
- 하루 근무 등록, 반복 근무 등록
- 알바생 공개 대타 요청 등록
- 다른 알바생의 대타 요청 신청
- 사장님 대타 요청 승인/거절
- 승인 시 근무표 자동 변경
- 웹 내부 알림 조회와 읽음 처리
- 기본 예상 급여 계산

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query |
| Backend | Express, TypeScript, Zod |
| Database/Auth | Supabase Auth, Supabase Postgres |
| Test | Vitest, Testing Library, jsdom |
| Deploy 예정 | Frontend: Vercel, Backend: Render |

## 아키텍처

알바노트는 기능별 확장이 쉬운 모듈형 레이어드 아키텍처를 사용합니다.

```txt
React SPA Frontend
  -> Express API
  -> Service Layer
  -> Repository Layer
  -> Supabase(Postgres)
```

- Frontend는 화면, 라우팅, 입력 상태, API 호출을 담당합니다.
- Backend는 인증, 권한 확인, 요청 검증, 비즈니스 서비스 호출을 담당합니다.
- Service Layer는 근무표, 대타 요청, 알림, 급여 계산 같은 핵심 규칙을 처리합니다.
- Repository Layer는 Supabase 데이터 접근만 담당합니다.

## 문서

- 기획서: https://github.com/psm300418/Albanote/wiki/%EA%B8%B0%ED%9A%8D%EC%84%9C
- 백로그: https://github.com/psm300418/Albanote/blob/main/docs/DevelopmentBacklog.md
- 개발 관련 문서: https://github.com/psm300418/Albanote/tree/main/docs

## 참고 이미지

#10 알바생 초대 기능 아키텍처 시각화

<img width="1536" height="1024" alt="알바생 초대 기능 아키텍처 시각화" src="https://github.com/user-attachments/assets/899417a3-8a79-48fa-8267-b69c9a924291" />
