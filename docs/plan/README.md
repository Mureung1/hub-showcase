# Plan Docs

`docs/plan/`은 제품 방향, 기술 설계, 디자인 기준, 기능별 구현 계획의 단일 진입점이다.

## Structure

```text
docs/plan/
  product/          # 문제 정의, 서비스 범위, 사용자 흐름
  engineering/      # API, DB, 콘텐츠 수집/운영, 기술 스택
  design/           # 디자인 시스템, 프로토타입 계획
  implementation/   # 기능 단위 설계/구현 계획
  process/          # AI 협업과 태스크 계획 방식
```

## Rules

- 문서 위치는 작성 도구가 아니라 문서의 용도로 결정한다.
- 파일명은 kebab-case를 사용한다.
- API 계약은 `engineering/api-spec.md`를 기준으로 한다.
- DB 구조는 `engineering/db-schema.md`를 기준으로 한다.
- 콘텐츠 정책은 `engineering/content-strategy.md`, 수집 구현 계약은 `engineering/content-pipeline.md`를 기준으로 한다.
- 특정 기능의 설계/구현 계획은 날짜를 붙여 `implementation/`에 둔다.
- 작업 중 판단 근거와 회의성 메모는 `docs/notes/`에 둔다.
- 검증 기준과 하네스 문서는 `docs/quality/`에 둔다.

