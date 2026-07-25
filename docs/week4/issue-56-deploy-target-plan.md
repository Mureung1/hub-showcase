# API·프론트 배포 타겟 및 env 분리 결정 (이슈 #56)

> 작성일: 2026-07-25 (토) · 대상 이슈: [#56 API·프론트 배포 타겟 및 env 분리 결정](https://github.com/syd348/hub/issues/56)

## 목표 (한 줄)

**client(Vite)·server(Express)를 어디에 배포할지, dev/prod env를 어떻게 분리할지 결정하고 최소 1개
환경에 실제로 띄운다.**

## 현재 상태 (조사로 새로 밝혀진 것, 2026-07-25)

작성 시점 최초 조사(위 목표 문단)는 "배포 타겟이 미정"이라는 전제였으나, 실제로 조사해보니 전제
자체가 틀려 있었다:

- **client는 이미 배포돼 있다** — `.github/workflows/deploy-pages.yml`이 PR #55(2026-07-24)에서
  복원됐고, `main` push마다 GitHub Pages(`https://syd348.github.io/hub/`)에 정상 배포 중
  (`gh run list` 확인, 최근 실행 전부 success). `CONTEXT.md`의 "이전 GitHub Pages 자동배포는
  제거됨"은 stale 서술이었음.
- **하지만 배포된 client는 항상 mock 데이터만 보여준다** — `src/api/client.ts`가 상대경로
  `/api/...`로 fetch하는데, GitHub Pages엔 서버가 없어 항상 404 → catch로 빠져서
  `MOCK_SUBSIDIES`로 자동 대체됨. 즉 client 배포는 "성공"했지만 실제 기능은 동작한 적이 없음.
- **server의 `start` 스크립트가 애초에 동작하지 않았다** — `node dist/index.js`를 실행하면
  `@hub/shared`(확장자 없는 TS import, `exports: "./src/index.ts"`)를 Node ESM이 resolve하지
  못해 `ERR_MODULE_NOT_FOUND`로 즉시 크래시. `npm run dev`가 되던 건 `tsx watch`가 TS를
  즉석 변환해줘서였고, `build`(tsc)+`start`(node) 경로는 한 번도 실제로 실행된 적이 없었음
  (수동 재현으로 확인, 2026-07-25).

## 범위

### 포함 (이번 이슈)
- server를 실제로 실행 가능하게 고치기 (`start` 스크립트를 `tsx` 실행으로 변경 — 아래 리스크 표 참고)
- server 배포 타겟 결정 및 최소 1회 배포 (Render, `render.yaml` 블루프린트로 준비)
- client에 `VITE_API_BASE_URL` 빌드 타임 env var 추가 → 배포된 server를 실제로 가리키게 연결
- prod env(`CLIENT_ORIGIN`·`SUPABASE_*`·`BIZINFO_API_KEY`·`VITE_API_BASE_URL`) 주입 방식 결정
- `CONTEXT.md` 기술스택 표의 stale한 배포 서술 정정

### 제외 (다음으로)
- CI/CD 자동 배포 파이프라인 구축 — 이번엔 수동 배포로 타겟만 확정, 자동화는 별도 이슈
- 커스텀 도메인/HTTPS 인증서 설정
- 크롤러 cron의 배포 환경 이전 (현재 GitHub Actions로 이미 동작 중, 변경 불필요)
- esbuild/tsup 등 번들러 도입 — tsx 실대 실행으로 충분하다고 판단(아래 리스크 표)

## 실행 순서

### 묶음 1 — 배포 타겟 조사 + server 실행 버그 수정 (완료, 2026-07-25)
- [x] client·server 배포 현황 재조사 → 위 "현재 상태" 두 가지 발견
- [x] server `start` 스크립트 수정: `tsx`를 devDependencies → dependencies로 이동,
      `start`를 `node dist/index.js` → `tsx src/index.ts`로 변경 (esbuild 번들링 대신 — 이미
      `db:seed`/`db:check`도 tsx로 실행 중이라 새 도구 없이 dev=prod 실행 경로 통일)
  - `npm run start -w @hub/server` 로컬 재현 → `GET /api/health` 정상 응답 확인
- [x] `npm test`(84 passed) / `npm run lint` 통과 확인 — 기존 기능 회귀 없음
- [x] client `src/api/client.ts`에 `VITE_API_BASE_URL` 지원 추가 (미설정 시 기존과 동일한 상대경로,
      `npm run build:client` 정상 빌드 확인)
- [x] `.env.example`에 `VITE_API_BASE_URL` 추가, `deploy-pages.yml` 빌드 스텝에
      `${{ vars.VITE_API_BASE_URL }}` 주입 추가
- [x] `render.yaml` 블루프린트 작성 (server용, secrets는 `sync: false`로 대시보드 수동 입력 유도)

### 묶음 2 — 실제 Render 배포 + 연결 검증 (사용자 진행 필요)
- [ ] Render 대시보드에서 이 repo로 "New Blueprint" 생성 (`render.yaml` 자동 인식)
- [ ] `CLIENT_ORIGIN`(`https://syd348.github.io`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
      `BIZINFO_API_KEY` 대시보드에 입력
- [ ] 배포된 server URL을 GitHub repo variable `VITE_API_BASE_URL`로 등록
      (Settings → Secrets and variables → Actions → Variables)
- [ ] `deploy-pages.yml` 재실행(`workflow_dispatch` 또는 재push) → 실제 사이트에서 mock이 아닌
      Supabase 데이터가 뜨는지 확인
- [ ] `GET <render-url>/api/health`, `GET <render-url>/api/subsidies` curl 검증

## 완료 기준

- [x] server가 실제로 시작 가능함이 로컬에서 확인된다 (묶음 1)
- [ ] 배포 타겟이 결정되고 `CONTEXT.md` 기술스택 표의 "배포: 미확정"이 갱신된다
- [ ] server가 Render에 실제 배포되어 응답하고, client가 mock이 아닌 실제 API를 호출한다

## 리스크 / 결정 필요

| 항목 | 내용 | 결정 |
|------|------|-----------|
| server 실행 방식: tsx 실대 vs 번들러 | `node dist/index.js`가 `@hub/shared` 임포트를 못 찾아 크래시 | **tsx 실대로 결정** (2026-07-25) — 새 빌드 도구 없이 dev와 동일 경로로 실행, `db:seed`/`db:check`와 일관 |
| server 상시 구동 필요 | Supabase 연결 + `/api/match` 등 상태 있는 라우트라 정적 호스팅 불가 | **Render 무료 웹 서비스로 결정** — `render.yaml` 블루프린트 준비 완료 |
| client 배포 타겟 | GitHub Pages 재조사 결과 이미 동작 중 | **변경 없음** — 새로 고를 필요 없이 기존 `deploy-pages.yml` 유지, `VITE_API_BASE_URL`만 추가 |
| 무료 티어 콜드스타트 | Render 무료 플랜은 유휴 시 슬립 → 첫 요청 지연 가능 | MVP 단계이므로 우선 수용, 문제되면 유료 전환 검토 |
| SUPABASE_SERVICE_ROLE_KEY 노출 위험 | service_role 키는 서버 전용, 절대 client/커밋에 포함 금지 | Render 대시보드 secrets(`sync: false`)만 사용, `.env`/`render.yaml`에 값 커밋 금지 |
| 실제 Render 계정 생성·클릭 배포 | 에이전트가 사용자 크리덴셜로 외부 서비스 가입·배포를 대신 할 수 없음 | 묶음 2는 사용자가 직접 진행, 필요한 설정값은 위 체크리스트로 준비해둠 |
