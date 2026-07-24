# 프로젝트 문서

`docs/`는 프로젝트의 개발 규칙, 기획·설계, 검증 기준, 논의 기록을 모아둔 문서의 단일 진입점이다.

## 문서 구조

```text
docs/
  DEVELOPMENT.md    # Git, 코딩 컨벤션, 검증 규칙
  plan/             # 제품 방향, 기술 설계, 디자인 기준, 기능별 구현 계획
    product/        # 문제 정의, 서비스 범위, 사용자 흐름
    engineering/    # API, DB, 콘텐츠 수집·운영, 기술 스택
    design/         # 디자인 시스템, 프로토타입 계획
    implementation/ # 기능 단위 설계·구현 계획
    process/        # AI 협업과 태스크 계획 방식
  quality/          # 구현 완료 판정 기준과 검증 절차
  notes/            # 작업 중 판단 근거와 논의 기록
  prototype/        # HTML 프로토타입
```

## 문서 배치 규칙

- 문서 위치는 작성 도구가 아니라 문서의 용도로 결정한다.
- 파일명은 kebab-case를 사용한다.
- 제품·기술·디자인 설계와 기능별 구현 계획은 `plan/`에 둔다.
- 특정 기능의 설계·구현 계획은 날짜를 붙여 `plan/implementation/`에 둔다.
- 작업 중 판단 근거와 회의성 메모는 `notes/`에 둔다.
- 검증 기준과 하네스 문서는 `quality/`에 둔다.
- `prototype/`은 HTML 프로토타입이며 실제 빌드 대상이 아니다.

## 기준 문서

- Git, 코딩 컨벤션, 검증 규칙: `DEVELOPMENT.md`
- API 계약: `plan/engineering/api-spec.md`
- DB 구조: `plan/engineering/db-schema.md`
- 콘텐츠 정책: `plan/engineering/content-strategy.md`
- 콘텐츠 수집 구현 계약: `plan/engineering/content-pipeline.md`
- 검증 원칙과 실행 대상: `quality/verification-guide.md`
