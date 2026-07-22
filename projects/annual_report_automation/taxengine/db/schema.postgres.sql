-- taxengine/db/schema.postgres.sql
--
-- schema.sql(SQLite)의 Postgres(Supabase) 번역본. Supabase 대시보드 SQL Editor에서
-- 1회 실행해 적용한다 — 애플리케이션은 스키마를 지연 생성하지 않는다(conn.py 참고).
--
-- ⚠️ schema.sql과 **반드시 함께 수정**할 것 — 두 스키마의 드리프트는
--    tests/test_supabase_smoke.py의 정답 대조가 마지막 안전망이다.
--
-- 번역 규칙 (최소 diff 원칙 — 애플리케이션 코드가 양쪽에서 무수정 동작해야 한다):
--   · INTEGER PRIMARY KEY AUTOINCREMENT → bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
--   · 금액 INTEGER(원 단위) → bigint  (int4 최대 21억 — 억 단위 금액이 넘칠 수 있다)
--   · 0/1 플래그·개수·bp → integer + CHECK 유지  (boolean 전환은 reader/migrate 양쪽을
--     고쳐야 하므로 데모 후 과제 — notes/DB-스키마-설계.md)
--   · 날짜 TEXT('YYYY-MM-DD') → text 유지  (DATE로 바꾸면 psycopg가 datetime.date를
--     돌려줘 엔진의 문자열 파싱이 깨진다)
--   · strftime(...) 기본값 → timestamptz DEFAULT now()
--   · 원본결과_json TEXT → text 유지  (jsonb 전환은 데모 후 선택 과제)
--   · 한글 식별자는 따옴표 없이 그대로 — Postgres는 따옴표 없는 식별자를 소문자로
--     접지만 한글은 대소문자가 없어 영향 없음. 소문자 접미(_bp, _json)도 안전.
--   · PRAGMA foreign_keys 불필요 — Postgres는 FK를 기본 강제.

-- ============================================================
-- 1. 사용자 · 회사 (멀티테넌시 뼈대)
-- ============================================================

CREATE TABLE 사용자 (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    이메일      text NOT NULL UNIQUE,
    이름        text,
    -- Supabase Auth 사용자 id(JWT의 sub 클레임) — schema.sql의 같은 컬럼 주석 참고
    auth_uid    text UNIQUE,
    생성일시    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE 회사 (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    회사명      text NOT NULL,
    -- 사업자등록번호는 통째로 저장하지 않는다(마스킹 규칙, data/README.md).

    -- "거의 고정" 프로필 — schema.sql의 같은 블록 주석 참고 (여기가 원본, 사업연도는 스냅샷)
    설립연도            integer,
    중소기업            integer NOT NULL DEFAULT 0 CHECK (중소기업 IN (0, 1)),
    부동산임대업주업     integer NOT NULL DEFAULT 0 CHECK (부동산임대업주업 IN (0, 1)),
    상시근로자수        integer,

    생성일시    timestamptz NOT NULL DEFAULT now(),
    수정일시    timestamptz NOT NULL DEFAULT now()
);

-- 지배주주 목록 — schema.sql의 같은 테이블 주석 참고
CREATE TABLE 지배주주 (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    회사id      bigint NOT NULL REFERENCES 회사(id) ON DELETE CASCADE,
    명          text NOT NULL,
    지분율_bp   integer NOT NULL CHECK (지분율_bp BETWEEN 0 AND 10000),
    정렬순서    integer NOT NULL DEFAULT 0,
    생성일시    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_지배주주_회사id ON 지배주주(회사id);

CREATE TABLE 회사_사용자 (
    회사id      bigint NOT NULL REFERENCES 회사(id) ON DELETE CASCADE,
    사용자id    bigint NOT NULL REFERENCES 사용자(id) ON DELETE CASCADE,
    역할        text NOT NULL DEFAULT 'owner' CHECK (역할 IN ('owner', 'editor', 'viewer')),
    생성일시    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (회사id, 사용자id)
);

-- ============================================================
-- 2. 사업연도
-- ============================================================

CREATE TABLE 사업연도 (
    id                          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    회사id                      bigint NOT NULL REFERENCES 회사(id) ON DELETE CASCADE,

    사업연도개시일               text NOT NULL,   -- ISO 'YYYY-MM-DD'
    사업연도종료일               text NOT NULL,
    중소기업                     integer NOT NULL DEFAULT 0 CHECK (중소기업 IN (0, 1)),
    부동산임대업주업             integer NOT NULL DEFAULT 0 CHECK (부동산임대업주업 IN (0, 1)),
    상시근로자수                 integer,
    지배주주지분율_bp            integer,          -- 1% = 100bp

    기납부세액                   bigint NOT NULL DEFAULT 0,
    이월결손금                   bigint NOT NULL DEFAULT 0,
    공제감면세액                 bigint NOT NULL DEFAULT 0,
    가산세                       bigint NOT NULL DEFAULT 0,
    기부금한도초과               bigint NOT NULL DEFAULT 0,

    수입금액                     bigint,           -- NULL = 미입력(추진비 한도 자동계산 생략)
    기업업무추진비_증빙불비금액   bigint NOT NULL DEFAULT 0,

    전기사업연도id               bigint REFERENCES 사업연도(id) ON DELETE SET NULL,

    생성일시                     timestamptz NOT NULL DEFAULT now(),
    수정일시                     timestamptz NOT NULL DEFAULT now(),

    UNIQUE (회사id, 사업연도종료일)
);

CREATE INDEX idx_사업연도_회사id ON 사업연도(회사id);
CREATE INDEX idx_사업연도_전기사업연도id ON 사업연도(전기사업연도id);

-- ============================================================
-- 3. 재무상태표 / 손익계산서
-- ============================================================

CREATE TABLE 재무상태표항목 (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    사업연도id  bigint NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    계정        text NOT NULL,
    구분        text NOT NULL CHECK (구분 IN ('자산', '자산차감', '부채', '자본')),
    금액        bigint NOT NULL,   -- 원 단위, 항상 양수(부호는 구분이 결정)
    정렬순서    integer NOT NULL DEFAULT 0,
    생성일시    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_재무상태표항목_사업연도id ON 재무상태표항목(사업연도id);

CREATE TABLE 손익계산서항목 (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    사업연도id  bigint NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    계정        text NOT NULL,     -- ⚠️ '기업업무추진비' 문자열은 pipeline.py의 매직 스트링
    구분        text NOT NULL CHECK (구분 IN ('수익', '비용')),
    금액        bigint NOT NULL,
    정렬순서    integer NOT NULL DEFAULT 0,
    생성일시    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_손익계산서항목_사업연도id ON 손익계산서항목(사업연도id);

-- ============================================================
-- 4. 자산대장
-- ============================================================

CREATE TABLE 자산 (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    사업연도id      bigint NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    명              text NOT NULL,
    구분            text NOT NULL CHECK (구분 IN ('건축물', '차량운반구', '비품', '기계장치')),
    취득일          text NOT NULL,   -- ISO 'YYYY-MM-DD'
    취득가          bigint NOT NULL,
    기초누계        bigint NOT NULL DEFAULT 0,
    회사계상액      bigint,           -- NULL 허용: 없으면 엔진이 상각범위액을 계상액으로 간주
    방법            text CHECK (방법 IS NULL OR 방법 IN ('정액', '정률')),
    내용연수        integer NOT NULL,
    전기이월부인액  bigint NOT NULL DEFAULT 0,
    업무용승용차    integer NOT NULL DEFAULT 0 CHECK (업무용승용차 IN (0, 1)),

    전기자산id      bigint REFERENCES 자산(id) ON DELETE SET NULL,

    생성일시        timestamptz NOT NULL DEFAULT now(),
    수정일시        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_자산_사업연도id ON 자산(사업연도id);
CREATE INDEX idx_자산_전기자산id ON 자산(전기자산id);

-- ============================================================
-- 5. 차량대장
-- ============================================================

CREATE TABLE 차량 (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    사업연도id      bigint NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    명              text NOT NULL,
    감가상각비      bigint NOT NULL DEFAULT 0,
    기타관련비용    bigint NOT NULL DEFAULT 0,
    전용보험가입    integer NOT NULL DEFAULT 0 CHECK (전용보험가입 IN (0, 1)),
    운행기록부작성  integer NOT NULL DEFAULT 0 CHECK (운행기록부작성 IN (0, 1)),
    업무사용비율_bp integer CHECK (업무사용비율_bp IS NULL OR (업무사용비율_bp BETWEEN 0 AND 10000)),
    생성일시        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_차량_사업연도id ON 차량(사업연도id);

-- ============================================================
-- 6. 세무조정
-- ============================================================

CREATE TABLE 세무조정 (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    사업연도id  bigint NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    과목        text NOT NULL,
    구분        text NOT NULL CHECK (구분 IN ('익금산입', '손금불산입', '손금산입', '익금불산입')),
    금액        bigint NOT NULL,
    소득처분    text CHECK (소득처분 IS NULL OR 소득처분 IN ('유보', '기타사외유출', '상여', '배당', '기타')),
    근거        text,
    생성일시    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_세무조정_사업연도id ON 세무조정(사업연도id);

-- ============================================================
-- 7. 정답지
-- ============================================================

CREATE TABLE 정답지 (
    사업연도id      bigint PRIMARY KEY REFERENCES 사업연도(id) ON DELETE CASCADE,
    각사업연도소득  bigint,
    과세표준        bigint,
    산출세액        bigint,
    차감납부세액    bigint,
    지방소득세      bigint,
    생성일시        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. 계산 스냅샷 (append-only, 감사 추적)
-- ============================================================

CREATE TABLE 계산스냅샷 (
    id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    사업연도id              bigint NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    계산일시                timestamptz NOT NULL DEFAULT now(),

    엔진버전                text,
    입력해시                text,

    당기순이익              bigint NOT NULL,
    가산조정                bigint NOT NULL,
    차감조정                bigint NOT NULL,
    각사업연도소득          bigint NOT NULL,
    이월결손금공제          bigint NOT NULL,
    과세표준                bigint NOT NULL,
    산출세액                bigint NOT NULL,
    최저한세적용여부        integer NOT NULL DEFAULT 0 CHECK (최저한세적용여부 IN (0, 1)),
    최저한세                bigint,
    최저한세배제액          bigint,
    공제감면세액_신청액     bigint NOT NULL DEFAULT 0,
    공제감면세액_적용후     bigint NOT NULL DEFAULT 0,
    가산세                  bigint NOT NULL DEFAULT 0,
    기납부세액              bigint NOT NULL DEFAULT 0,
    차감납부세액            bigint NOT NULL,
    지방소득세_산출세액     bigint NOT NULL,
    총납부세액              bigint NOT NULL,

    정답대조_일치항목수     integer,
    정답대조_전체항목수     integer,

    원본결과_json           text NOT NULL,

    생성일시                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_계산스냅샷_사업연도id ON 계산스냅샷(사업연도id);
CREATE INDEX idx_계산스냅샷_계산일시 ON 계산스냅샷(사업연도id, 계산일시);

-- ============================================================
-- 9. 입력 수정 이력 (append-only)
-- ============================================================

CREATE TABLE 입력수정이력 (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    테이블명    text NOT NULL,
    행id        bigint NOT NULL,
    사업연도id  bigint REFERENCES 사업연도(id) ON DELETE SET NULL,
    필드명      text NOT NULL,
    이전값      text,
    이후값      text,
    수정자id    bigint REFERENCES 사용자(id) ON DELETE SET NULL,
    수정일시    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_입력수정이력_사업연도id ON 입력수정이력(사업연도id);
CREATE INDEX idx_입력수정이력_테이블_행 ON 입력수정이력(테이블명, 행id);
