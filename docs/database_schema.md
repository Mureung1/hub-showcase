# Database Schema: saved_papers

본 문서는 **TSK-008: Supabase 데이터베이스 연동** 및 "내 서재 보관" 기능을 지원하기 위해 논문 데이터를 영구 보관할 `saved_papers` 테이블의 물리 데이터 모델 명세서입니다.

## 1. 테이블 정의 (Table Definition)

- **테이블명**: `saved_papers`
- **설명**: 사용자가 큐레이션된 결과 목록에서 "내 서재 보관"을 트리거하여 영구 아카이빙 처리한 논문 메타데이터 및 매칭 스코어 보관 테이블

## 2. 컬럼 상세 명세 (Column Specifications)

| 컬럼명 (Column Name) | 데이터 타입 (Data Type) | PK 여부 | Null 허용 여부 | 기본값 (Default) | 제약 조건 (Constraints) | 설명 (Description) |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `id` | `UUID` | PK | Not Null | `gen_random_uuid()` | - | 시스템 고유 식별자 (자동 생성 UUID) |
| `user_id` | `UUID` | - | Yes | - | - | 회원 고유 식별자 (로컬 데모용 Nullable) |
| `paper_id` | `VARCHAR(50)` | - | Not Null | - | `UNIQUE` | 원본 논문 식별 아이디 (예: 'paper-001') |
| `title` | `TEXT` | - | Not Null | - | - | 논문 제목 (Title) |
| `authors` | `TEXT` | - | Not Null | - | - | 논문 저자 목록 (Comma-separated authors) |
| `channel` | `VARCHAR(50)` | - | Not Null | - | - | 학술 채널명 (예: 'arXiv', 'NeurIPS', 'IEEE' 등) |
| `year` | `INTEGER` | - | Not Null | - | - | 논문 발행 연도 (Year of publication) |
| `match_score` | `INTEGER` | - | Not Null | - | - | 에이전트 큐레이션 매칭 점수 (%) |
| `created_at` | `TIMESTAMPTZ` | - | Not Null | `timezone('utc'::text, now())` | - | 보관 처리된 일시 (자동 생성 타임스탬프) |

## 3. 테이블 생성 DDL (Data Definition Language)

아래 SQL DDL 구문을 복사하여 Supabase SQL Editor 또는 PostgreSQL 클라이언트에서 실행하면 `saved_papers` 테이블을 즉시 생성할 수 있습니다.

```sql
-- saved_papers 테이블 생성
CREATE TABLE IF NOT EXISTS saved_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    paper_id VARCHAR(50) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    match_score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_saved_papers_paper_id ON saved_papers (paper_id);
```
