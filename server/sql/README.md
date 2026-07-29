# server/sql

데이터베이스 스키마의 기준은 `agent/migrations/`다. 이 디렉터리는 스키마를 정의하지 않는다.

Express는 활성 분석 결과의 조회 계약만 따른다. 조회 계약은 [아키텍처](../../docs/architecture.md) 10장에, 테이블 정의는 [지식·저장 구조](../../docs/knowledge-schema.md)에 있다.

소유권 결정의 근거는 [ADR 0006](../../docs/adr/0006-migration-ownership.md)에 있다.

`001-postings.sql`은 수직 슬라이스 단계에서 사용한 평면 공고 표 `legacy_posting_samples`의 참고용 사본이다. 이 표의 정본 정의는 `agent/migrations/sql/0025_legacy_posting_samples.sql`에 있다. Express는 이 표를 폴백 조회에만 쓰고, 화면 조회는 활성 분석 버전의 `analysis_outputs.payload`를 읽는다.
