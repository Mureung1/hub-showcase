# 알바노트

알바노트는 사장님과 알바생이 근무표, 공개 대타 요청, 근무 시간, 예상 급여, 알림을 한 곳에서 관리할 수 있는 React 기반 SPA 웹 서비스입니다.

## 배포 URL

- Frontend: https://albanote-frontend.vercel.app
- Backend: Render 배포 환경에서 운영

## 문제 상황

아르바이트 근무 관리는 근무표 작성, 알바생 초대, 일정 공유, 대타 요청, 급여 확인이 서로 다른 도구나 메신저에 흩어지는 경우가 많습니다.

이렇게 관리하면 근무 일정이 바뀌었을 때 최신 정보를 다시 확인해야 하고, 대타 요청이 승인되었는지 놓치기 쉽습니다. 알바생 입장에서도 본인의 근무 일정과 예상 급여를 바로 확인하기 어렵습니다.

또 갑자기 근무가 어려워졌을 때 알바생이 사장님이나 다른 알바생에게 직접 연락해 근무 변경을 요청해야 하는 부담이 있습니다. 요청을 받은 사장님도 누가 대신 근무할 수 있는지, 근무표를 어떻게 바꿔야 하는지 다시 확인해야 해서 관리 부담이 커집니다.

## 서비스 설명

알바노트는 매장 운영에 필요한 근무 관리 흐름을 하나의 서비스 안에 모았습니다.

사장님은 매장을 만들고 알바생을 초대할 수 있으며, 하루 근무나 반복 근무를 등록할 수 있습니다. 알바생은 본인의 근무 일정을 확인하고, 근무가 어려운 날에는 공개 대타 요청을 등록할 수 있습니다. 같은 매장의 다른 알바생은 대타 요청에 지원할 수 있고, 사장님이 승인하면 근무표가 자동으로 변경됩니다.

## 주요 기능

- 사장님 회원가입, 로그인, 매장 생성
- 알바생 초대, 시급과 기본 근무 요일/시간 관리
- 월간 근무표 조회와 일간 근무표 상세 조회
- 하루 근무 등록과 반복 근무 등록
- 알바생 공개 대타 요청 등록
- 같은 매장 알바생의 대타 요청 지원
- 사장님의 대타 요청 승인/거절
- 대타 승인 후 근무표 자동 변경
- 알림 조회와 읽음 처리
- 등록된 근무 시간과 시급 기반 기본 예상 급여 계산

## 기술 스택과 사용 이유

| 영역 | 사용 기술 | 사용 이유 |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | 근무표, 대타 요청, 알림처럼 화면 이동이 많은 서비스를 SPA로 자연스럽게 구현하기 위해 사용했습니다. TypeScript로 근무 일정, 사용자 역할, 대타 요청 상태 같은 데이터를 더 명확하게 다룹니다. |
| Routing/Data | React Router, TanStack Query | 클라이언트 라우팅으로 화면을 전환하고, 서버에서 가져온 근무표/대타 요청/알림 데이터를 캐싱하고 갱신하기 위해 사용했습니다. |
| Backend | Express, TypeScript, Zod | REST API를 빠르게 구성하고, 요청 검증과 비즈니스 로직을 명확하게 분리하기 위해 사용했습니다. |
| Database/Auth | Supabase Auth, Supabase Postgres | 인증과 Postgres 데이터베이스를 함께 사용할 수 있어 사장님/알바생 계정, 매장 소속, 근무 일정처럼 관계가 있는 데이터를 관리하기에 적합했습니다. |
| Test | Vitest, Testing Library, jsdom | 날짜 계산 로직과 주요 서비스 로직을 빠르게 검증하고, React 컴포넌트 테스트 환경을 구성하기 위해 사용했습니다. |
| Deploy | Vercel, Render | 프론트엔드는 Vercel, 백엔드는 Render로 분리 배포해 SPA와 API 서버를 각각 독립적으로 운영했습니다. |

## 아키텍처

알바노트는 기능별 확장이 쉬운 모듈러 레이어드 아키텍처를 사용합니다.

```txt
React SPA Frontend
  -> Express API
  -> Service Layer
  -> Repository Layer
  -> Supabase(Postgres)
```

- Frontend는 화면, 라우팅, 입력 상태, API 호출, 클라이언트 상태를 담당합니다.
- Express API는 요청 검증, 인증/권한 확인, 서비스 호출을 담당합니다.
- Service Layer는 근무표, 대타 요청, 알림, 급여 계산 같은 비즈니스 규칙을 처리합니다.
- Repository Layer는 Supabase 데이터베이스 접근만 담당합니다.
- 권한 검사는 프론트엔드에서 화면 제어로 1차 처리하고, 백엔드 API에서 다시 검증합니다.

## AI Agent와의 협업 방식

이 프로젝트는 기획부터 기능 개발, 오류 수정, 배포까지 Codex와 함께 진행했습니다.

저는 서비스의 문제 상황, 핵심 기능, 사용자 흐름, 화면 방향성을 정했습니다. 각 백로그를 개발하기 전에는 필요한 정책과 모호한 부분을 Codex와 논의했고, 최종 방향은 제가 확인하고 결정했습니다.

Codex는 확정된 요구사항을 바탕으로 프론트엔드와 백엔드 코드를 작성하고, 테스트 코드와 배포 오류 수정도 도왔습니다. 저는 실행 결과를 확인하면서 기능이 의도대로 동작하는지 검증하고, 불필요한 기능을 줄이거나 입력 방식과 화면 흐름을 조정했습니다.

## 개발 중 발생한 문제와 해결

### 반복 근무 등록의 memo 데이터 불일치

반복 근무 등록 화면에서는 `memo`를 보내지 않도록 수정했지만, 백엔드 요청 검증 스키마는 여전히 `memo`를 필수값으로 기대하고 있었습니다. 그 결과 요청 body에 `memo`가 없을 때 `Invalid input: expected nonoptional, received undefined` 오류가 발생했습니다.

검증 스키마를 실제 기능 정책에 맞게 수정해 반복 근무 등록 요청에서 `memo`를 요구하지 않도록 처리했습니다.

이후 Repository 계층에서 `recurring_schedule_rules` 테이블에 `memo` 컬럼이 있다고 가정하고 insert/select를 수행하면서 Supabase의 `Could not find the 'memo' column` 오류가 다시 발생했습니다. 실제 DB 스키마에는 반복 근무 규칙 테이블에 `memo` 컬럼이 없었기 때문에, Repository 쿼리와 타입 정의에서도 `memo`를 제거해 프론트엔드, 백엔드, DB 스키마의 데이터 구조를 일치시켰습니다.

### 하루 근무 등록의 선택 메모 처리

하루 근무 등록에서 메모를 입력하지 않으면 백엔드 검증 단계에서 오류가 발생했습니다. 실제 사용 정책상 하루 근무의 메모는 필수 정보가 아니라 선택 정보였기 때문에, 요청 검증 스키마에서 메모 필드를 optional로 변경했습니다.

이를 통해 프론트엔드는 메모가 비어 있는 요청도 보낼 수 있고, 백엔드는 메모가 있을 때만 저장하도록 처리했습니다.

### 다가오는 내 근무에 지난 근무가 표시되는 문제

메인 화면의 "다가오는 내 근무" 영역에서 날짜 기준만 사용하거나 현재 시각을 충분히 반영하지 않아, 이미 종료된 근무가 함께 표시되는 문제가 있었습니다.

프론트엔드에서 현재 날짜와 시간을 기준으로 근무 시작 일시를 비교하도록 필터링 조건을 수정했습니다. 그 결과 이미 지난 근무는 제외되고, 사용자가 앞으로 남은 근무만 확인할 수 있게 되었습니다.

### Render 백엔드 배포 오류

Render 배포 환경에서 Node와 TypeScript 버전이 올라가면서 `moduleResolution=node10` 옵션이 제거되어 백엔드 빌드가 실패했습니다.

백엔드 `tsconfig.json`의 `module`과 `moduleResolution` 설정을 최신 Node 실행 환경에 맞게 `Node16` 계열로 변경했습니다. 또한 Render의 production 설치 환경에서는 devDependencies가 설치되지 않을 수 있어, 백엔드 빌드 시 필요한 TypeScript와 타입 패키지를 production 설치에서도 사용할 수 있도록 의존성 위치를 조정했습니다.

### Vercel 프론트엔드 배포 오류

프론트엔드 `vite.config.ts`에서 테스트 설정을 위해 `vitest/config`를 함께 import하고 있었는데, Vercel 배포 빌드에서는 해당 모듈을 찾지 못해 빌드가 실패했습니다.

Vite 설정과 Vitest 설정을 분리해 배포 빌드에서는 `vite.config.ts`가 Vite 관련 설정만 참조하도록 변경했습니다.

이후 Vercel에서 명확한 오류 로그 없이 `tsc -b && vite build` 단계가 실패하는 문제가 있었습니다. 배포에 필요한 번들 생성은 `vite build`가 담당하도록 build 명령을 단순화했고, 타입 검사는 `typecheck` 명령으로 분리해 로컬과 CI 성격의 검증 단계에서 따로 실행할 수 있게 정리했습니다.

## 문서 링크

- [기획서](https://github.com/psm300418/Albanote/wiki/%EA%B8%B0%ED%9A%8D%EC%84%9C)
- [개발 백로그](https://github.com/psm300418/Albanote/blob/main/docs/DevelopmentBacklog.md)
- [아키텍처 문서](https://github.com/psm300418/Albanote/blob/main/docs/Architecture.md)
- [디자인 문서](https://github.com/psm300418/Albanote/blob/main/docs/Design.md)
- [개발 문서 폴더](https://github.com/psm300418/Albanote/tree/main/docs)

## 아키텍처 이미지

#10 알바생 초대 기능 아키텍처 시각화

<img width="1536" height="1024" alt="알바생 초대 기능 아키텍처 시각화" src="https://github.com/user-attachments/assets/899417a3-8a79-48fa-8267-b69c9a924291" />
