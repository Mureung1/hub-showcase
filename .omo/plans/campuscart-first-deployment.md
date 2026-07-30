# CampusCart 첫 배포

## TL;DR

> **Summary**: 현재 `feat/pickup-page`의 Express 서버를 Render에 먼저 배포하고, 해당 주소를 Vercel의 React/Vite 프론트에 연결한다.
> **Deliverables**: Render API URL, Vercel FE URL, 배포 설정 파일, 라이브 기능 점검 결과
> **Effort**: Short
> **Parallel**: NO
> **Critical Path**: 배포 설정 → Render → Vercel → 상호 주소 설정 → 라이브 QA

## Context

### Original Request

- Render와 Vercel에 본인 포크 저장소를 연결한다.
- FE·BE를 각각 배포하고 Supabase까지 연결한다.
- 상태 확인 API와 핵심 공동구매 흐름을 확인한다.

### Interview Summary

- 최신 코드 브랜치: `feat/pickup-page`
- Render: `npm ci` → `npm start`, `/api/health`
- Vercel: Vite, `npm run build`, `dist`
- 프로덕션 Vercel 주소 하나만 CORS에 허용한다.
- 기존 Supabase 프로젝트와 이미 적용된 테이블을 사용한다.
- PR은 사용자 허락 없이 생성하지 않는다.

### Metis Review

- SPA 직접 접근 rewrite와 Node 버전 고정을 추가한다.
- Render 첫 배포 전에 Supabase 환경변수를 입력한다.
- 정적 health 응답 외에 DB 목록 API도 확인한다.
- 미리보기 Vercel 주소는 오늘 CORS 범위에서 제외한다.

## Work Objectives

### Core Objective

Vercel 화면에서 Render API를 통해 Supabase 데이터를 조회하고 저장할 수 있게 한다.

### Definition of Done

- Render `/api/health`가 HTTP 200을 반환한다.
- Render `/api/group-buys`가 Supabase 목록을 반환한다.
- Vercel 루트와 `/group-buys`가 열린다.
- Vercel에서 로그인 후 공동구매 참여·취소가 동작한다.
- 실제 비밀 키가 Git에 포함되지 않는다.

### Must NOT Have

- 실제 Supabase 키를 파일이나 GitHub에 기록하지 않는다.
- 유료 플랜을 선택하지 않는다.
- PR을 자동 생성하지 않는다.
- 기존 `.omo/`, `outputs/`를 커밋하지 않는다.

## Verification Strategy

- 배포 전: `npm run lint`, `npm test`, `npm run test:db`, `npm run build`
- 배포 후: Render health/list API와 Vercel 브라우저 흐름을 실제로 확인
- 비밀 키 검사는 값이 아닌 변수명과 Git 추적 여부만 확인

## Execution Strategy

1. 배포 설정 추가 및 로컬 검증
2. Render 첫 배포 및 API 주소 기록
3. Vercel 첫 배포 및 FE 주소 기록
4. 양쪽 환경변수에 서로의 주소 반영 후 재배포
5. 라이브 핵심 기능 QA

## TODOs

- [x] 1. 배포 설정 준비
  - `package.json`에 Node 20 이상을 명시한다.
  - `vercel.json`에 모든 SPA 경로를 `/index.html`로 보내는 rewrite를 추가한다.
  - Render 설정값을 문서와 대조한다.
  - Acceptance: lint, unit test, DB test, build가 모두 통과한다.
  - QA: 로컬 `/group-buys`와 `/api/health`가 정상이다.
  - Commit: `chore: 첫 배포 설정 추가`

- [ ] 2. Render 백엔드 배포
  - 저장소 `lsiwooo/hub`, 브랜치 `feat/pickup-page`를 선택한다.
  - Build `npm ci`, Start `npm start`, Health `/api/health`.
  - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 Render 환경변수에 입력한다.
  - Acceptance: `https://<service>.onrender.com/api/health`와 `/api/group-buys`가 200이다.
  - Failure QA: 로그에 누락된 환경변수나 포트 오류가 없는지 확인한다.

- [ ] 3. Vercel 프론트엔드 배포
  - 같은 저장소와 브랜치를 선택하고 Vite preset을 사용한다.
  - Build `npm run build`, Output `dist`.
  - Render 주소를 `VITE_API_URL`에 입력한다.
  - Acceptance: Vercel 루트와 `/group-buys` 직접 접근이 모두 열린다.
  - Failure QA: 브라우저 Network에서 API 주소와 CORS 오류를 확인한다.

- [ ] 4. FE·BE 상호 연결
  - Render `FRONTEND_URL`에 확정된 Vercel 프로덕션 URL을 입력하고 재배포한다.
  - Vercel `VITE_API_URL` 값이 확정 Render URL인지 확인하고 재배포한다.
  - Acceptance: Vercel에서 Render의 `/api/group-buys` 요청이 200이다.
  - Failure QA: CORS 오류가 있으면 주소의 `https://`와 끝 슬래시를 확인한다.

- [ ] 5. 라이브 핵심 기능 점검
  - 로그인 → 목록 → 참여 → 참여 취소를 실행한다.
  - Render 로그에 요청이 기록되는지 확인한다.
  - Supabase에서 참여 정보와 인원 변경을 확인한다.
  - Acceptance: 화면, 서버, DB의 결과가 일치한다.
  - Failure QA: 실패 위치를 FE, BE, DB로 나눠 기록한다.

## Final Verification Wave

- [ ] F1. 배포 주소 두 개 기록
- [ ] F2. 비밀 키 Git 미포함 확인
- [ ] F3. 라이브 브라우저 QA
- [ ] F4. 미완료·막힌 지점 기록

## Commit Strategy

- 배포 설정 파일만 커밋하고 push한다.
- 서비스 설정 값과 실제 키는 커밋하지 않는다.
- PR 생성은 사용자에게 맡긴다.

## Success Criteria

- FE와 BE의 첫 프로덕션 배포가 존재한다.
- FE가 BE를 호출하고 BE가 Supabase를 조회한다.
- 핵심 흐름의 성공 또는 정확한 실패 지점이 기록된다.
