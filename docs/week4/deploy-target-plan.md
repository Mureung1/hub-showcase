# API·프론트 배포 타겟 및 env 분리 결정 (이슈 #56)

> 작성일: 2026-07-25 (토) · 대상 이슈: [#56 API·프론트 배포 타겟 및 env 분리 결정](https://github.com/syd348/hub/issues/56)

## 목표 (한 줄)

**client(Vite)·server(Express)를 어디에 배포할지, dev/prod env를 어떻게 분리할지 결정하고 최소 1개
환경에 실제로 띄운다.**

## 현재 상태 (전환 전)

- 로컬 개발만 존재: `npm run dev`(client+server 동시), client는 Vite `/api/*` 프록시로 `localhost:3001` 호출
- `.env.example`엔 `PORT`, `CLIENT_ORIGIN`, `SUPABASE_*`, `BIZINFO_API_KEY`만 있고 dev/prod 구분 없음
- `server/package.json`에 `build`(tsc) + `start`(node dist) 스크립트는 이미 있어 프로덕션 실행 자체는 가능
- 루트 `build`는 server build + client(tsc+vite build)를 순서대로 실행 — 단일 배포 아티팩트 전제는 없음
- CONTEXT.md 기술스택 표에 "배포: 미확정, 이전 GitHub Pages 자동배포는 제거됨"이라고 명시돼 있음
- `.github/workflows/`엔 crawler cron만 있고 배포 워크플로우 없음

## 범위

### 포함 (이번 이슈)
- client/server 배포 타겟 후보 비교 (예: Vercel+Render/Railway, 단일 VM, GitHub Pages는 client 정적 배포만
  가능하므로 server는 별도 필요)
- prod에서 `CLIENT_ORIGIN`(CORS)·`SUPABASE_*`·`BIZINFO_API_KEY` 등 env를 어떻게 주입할지 결정
- 결정한 타겟에 최소 구성으로 1회 배포해 동작 확인 (`GET /api/health` 응답 확인)

### 제외 (다음으로)
- CI/CD 자동 배포 파이프라인 구축 — 이번엔 수동 배포로 타겟만 확정, 자동화는 별도 이슈
- 커스텀 도메인/HTTPS 인증서 설정
- 크롤러 cron의 배포 환경 이전 (현재 GitHub Actions로 이미 동작 중, 변경 불필요)

## 실행 순서

### 묶음 1 — 배포 타겟 후보 조사 + 결정 (승인 필요)
- [ ] client(정적 SPA)·server(Express, Supabase 연결 필요) 요구사항 정리
- [ ] 무료/저비용 후보 2~3개 비교 (예: Vercel(client) + Render/Railway/Fly.io(server))
- [ ] env 분리 방식 결정 — 플랫폼 대시보드 secrets vs `.env.production` 커밋 안 함 원칙 유지

### 묶음 2 — 최소 배포 + 검증 (승인 필요)
- [ ] 결정한 플랫폼에 server 배포, env 변수 등록
- [ ] client 빌드 산출물 배포, `CLIENT_ORIGIN`/API 베이스 URL 연결
- [ ] `GET /api/health`, `GET /api/subsidies` 실제 URL로 curl 검증

## 완료 기준

- [ ] 배포 타겟이 결정되고 CONTEXT.md 기술스택 표의 "배포: 미확정"이 갱신된다
- [ ] client/server가 각 타겟에 최소 1회 배포되어 실제 URL로 응답한다
- [ ] prod env 변수 목록과 주입 방식이 문서화된다

## 리스크 / 결정 필요

| 항목 | 내용 | 기본 방침 |
|------|------|-----------|
| server 상시 구동 필요 | Supabase 연결 + `/api/match` 등 상태 있는 라우트라 정적 호스팅 불가 | server는 별도 Node 호스팅(Render/Railway/Fly.io) 중 선택, client만 정적 배포 |
| 무료 티어 콜드스타트 | 무료 플랜은 유휴 시 슬립 → 첫 요청 지연 가능 | MVP 단계이므로 우선 수용, 문제되면 유료 전환 검토 |
| SUPABASE_SERVICE_ROLE_KEY 노출 위험 | service_role 키는 서버 전용, 절대 client/커밋에 포함 금지 | 플랫폼 secrets 매니저만 사용, `.env` 커밋 금지 원칙 유지 |
