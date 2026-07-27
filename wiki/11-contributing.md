# 기여 방법

마지막 업데이트: 2026-07-27

## 이 문서의 목적

변경을 안전하게 개발·검증·리뷰하기 위한 저장소 기반 절차를 제공한다.

## 빠른 요약

TypeScript strict, oxlint, Vitest가 기본 품질 게이트다. API 계약 변경은 브라우저와 서버 양쪽 테스트가 필요하다. 커밋/푸시는 저장소 `AGENTS.md`가 사용자 요청 시에만 하도록 규정한다.

## 권장 작업 흐름

```bash
npm ci
npm run lint
npm run typecheck:api
npm test
npm run build
```

템플릿 변경 시 추가로 실행한다.

```bash
npm run templates:generate
npm run templates:check
```

DB/schema 변경 시에는 `npm run db:generate`, `npm run db:check` 및 관련 repository/schema test를 실행한다. 개발 DB를 쓰는 smoke 명령은 `.env.example`의 confirm value를 확인한다.

## 코드 스타일/테스트

- lint: `oxlint` (`package.json`)
- 브라우저 테스트: Vitest + jsdom + React Testing Library (`vite.config.ts`, `src/test/setup.ts`)
- 서버/도메인 테스트: 각 소스 옆 `*.test.ts`
- 타입: `tsconfig.app.json`, `tsconfig.api.json`의 strict 설정

## PR 체크리스트

- [ ] 변경 모듈의 단위 테스트를 추가/갱신했다.
- [ ] `npm run lint`, `npm run typecheck:api`, `npm test`, `npm run build`을 통과했다.
- [ ] API 변경이면 `src/shared/*/contracts.ts`와 handler 테스트를 함께 검토했다.
- [ ] DB 변경이면 migration과 schema/repository를 함께 검토했다.
- [ ] 생성 템플릿 변경이면 generated 파일과 template check를 확인했다.
- [ ] secret/원문/개인정보를 소스·fixture·로그에 추가하지 않았다.

## 브랜치 전략

`docs/CICD.md`에는 과제 컨벤션의 branch/PR 형식이 서술돼 있지만, GitHub branch protection와 현재 기본 브랜치 설정은 저장소 파일로 확정할 수 없다. `AGENTS.md`는 커밋 메시지 형식과 명시 파일 staging을 규정한다.

## 근거

- 명령/도구: `package.json`, `vite.config.ts`, `tsconfig.api.json`
- PR 템플릿: `.github/pull_request_template.md`
- 로컬 작업·커밋 규칙: `AGENTS.md`

## 주의사항/함정

`.github/workflows/ci.yml`은 ignore돼 있어 로컬 검증 성공이 원격 required check 존재를 뜻하지 않는다.

## TODO/확인 필요

- CODEOWNERS, 원격 branch protection, PR 승인 수, release 정책은 확인 필요.
