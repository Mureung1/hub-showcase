-- taxengine/db/schema.sql
--
-- CSV(data/private/<사업연도>/*.csv) → SQLite DB 이행 스키마.
-- 근거·트레이드오프 설명은 notes/DB-스키마-설계.md 참고. 이 파일은 순수 DDL만 담는다.
--
-- 설계 원칙 (notes/기술스택-결정.md §3 존중):
--   · DB는 SQLite. 금액은 전부 INTEGER(원 단위) — SQLite는 DECIMAL(n,m)을 선언해도
--     내부적으로 REAL(부동소수)로 저장할 수 있으므로 NUMERIC/REAL/DECIMAL 타입은 쓰지 않는다.
--   · 세율·상각률 등 법령 상수(taxengine/domain/rates.py)는 테이블화하지 않는다 — 코드 리뷰가
--     필요한 값이라 사용자 데이터와 성격이 다르다는 게 이 프로젝트의 기존 방침.
--   · 테이블·컬럼명은 이 저장소의 기존 코드(loader.py 등)가 이미 한글 식별자를 쓰는 관례를
--     그대로 따른다 — DB 행 → 로더가 반환하던 것과 같은 한글 키 딕셔너리로 매핑하기 쉽도록.
--   · 소상공인 멀티테넌시 대비: 회사(companies)·사용자(users)를 분리하고 N:N 관계로 연결.
--
-- 실행 시 애플리케이션 커넥션마다 아래를 한 번 실행해야 외래키가 강제된다(SQLite는 기본 OFF):
--   PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. 사용자 · 회사 (멀티테넌시 뼈대 — 인증/권한 설계는 범위 밖)
-- ============================================================

CREATE TABLE 사용자 (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    이메일      TEXT NOT NULL UNIQUE,
    이름        TEXT,
    -- Supabase Auth 사용자 id(JWT의 sub 클레임). 로그인 없이 만들어진 행(--owner-email)은 NULL,
    -- 그 이메일로 처음 로그인할 때 채워진다 — taxengine/api/auth.py 현재사용자() 연결 규칙.
    auth_uid    TEXT UNIQUE,
    생성일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE 회사 (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    회사명      TEXT NOT NULL,
    -- 사업자등록번호는 통째로 저장하지 않는다(마스킹 규칙, data/README.md). 필요하면
    -- 뒤 3~4자리만 코드로 저장하는 컬럼을 나중에 추가한다.

    -- "거의 고정" 프로필 (온보딩에서 최초 1회 입력, 이후 매년 "작년과 같나요?"로 확인만).
    -- ⚠️ 사업연도 테이블에도 같은 이름의 컬럼이 있는 건 중복이 아니라 의도다: 여기가 원본이고,
    --    사업연도 쪽은 "그 해 신고에 실제로 쓴 확정값" 스냅샷(감사 추적) — 매년 위저드의
    --    확인 단계가 여기 값을 사업연도 행으로 복사한다.
    설립연도            INTEGER,
    중소기업            INTEGER NOT NULL DEFAULT 0 CHECK (중소기업 IN (0, 1)),
    부동산임대업주업     INTEGER NOT NULL DEFAULT 0 CHECK (부동산임대업주업 IN (0, 1)),
    상시근로자수        INTEGER,

    생성일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    수정일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 지배주주 목록 — 회사 고정 프로필의 일부(FE ShareholdersField가 여러 명을 입력받으므로
-- 합계 한 숫자가 아니라 명단으로 정규화). 사업연도.지배주주지분율_bp는 이 명단의 합계를
-- 그 해 확정값으로 복사한 스냅샷이다.
CREATE TABLE 지배주주 (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    회사id      INTEGER NOT NULL REFERENCES 회사(id) ON DELETE CASCADE,
    명          TEXT NOT NULL,
    지분율_bp   INTEGER NOT NULL CHECK (지분율_bp BETWEEN 0 AND 10000),
    정렬순서    INTEGER NOT NULL DEFAULT 0,
    생성일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_지배주주_회사id ON 지배주주(회사id);

-- 사용자 1명이 여러 회사를, 회사 1개를 여러 사용자가 다룰 수 있게 N:N으로 잡아둔다
-- (지금은 1인·1회사만 쓰지만 프론트엔드가 붙으면 바로 막힌다 — PLAN.md §7-F).
CREATE TABLE 회사_사용자 (
    회사id      INTEGER NOT NULL REFERENCES 회사(id) ON DELETE CASCADE,
    사용자id    INTEGER NOT NULL REFERENCES 사용자(id) ON DELETE CASCADE,
    역할        TEXT NOT NULL DEFAULT 'owner' CHECK (역할 IN ('owner', 'editor', 'viewer')),
    생성일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (회사id, 사용자id)
);

-- ============================================================
-- 2. 사업연도 — CSV 폴더 하나(= company.csv의 별지1/중기검토표 부분)에 대응
-- ============================================================

CREATE TABLE 사업연도 (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    회사id                      INTEGER NOT NULL REFERENCES 회사(id) ON DELETE CASCADE,

    -- 별지1 표지 + 중소기업 기준검토표 (company.csv 상단)
    사업연도개시일               TEXT NOT NULL,   -- ISO 'YYYY-MM-DD'. 법인세율 분기 기준(rates.py)
    사업연도종료일               TEXT NOT NULL,
    중소기업                     INTEGER NOT NULL DEFAULT 0 CHECK (중소기업 IN (0, 1)),
    부동산임대업주업             INTEGER NOT NULL DEFAULT 0 CHECK (부동산임대업주업 IN (0, 1)),
    상시근로자수                 INTEGER,
    -- 지배주주지분율은 금액이 아니라 비율(%)이지만 부동소수 오차를 피하려고 동일하게
    -- 정수로 고정한다: basis point(1% = 100bp) 단위. 예) 100.00% → 10000.
    지배주주지분율_bp            INTEGER,

    -- 별지3 계산 입력 (원 단위 정수 — money.py 규율과 동일)
    기납부세액                   INTEGER NOT NULL DEFAULT 0,
    이월결손금                   INTEGER NOT NULL DEFAULT 0,
    공제감면세액                 INTEGER NOT NULL DEFAULT 0,
    가산세                       INTEGER NOT NULL DEFAULT 0,
    기부금한도초과               INTEGER NOT NULL DEFAULT 0,

    -- 기업업무추진비 한도계산 입력 (별지 제23호)
    수입금액                     INTEGER,          -- NULL = 미입력(하위호환: 한도 자동계산 생략)
    기업업무추진비_증빙불비금액   INTEGER NOT NULL DEFAULT 0,

    -- 연도 간 이월 체인 — 이 사업연도의 "전기"가 DB의 어느 행인지 명시적으로 연결한다.
    -- (cli/reproduce.py --prev 가 지금 하는 일을 DB 레벨 FK로 고정한 것.)
    전기사업연도id               INTEGER REFERENCES 사업연도(id) ON DELETE SET NULL,

    생성일시                     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    수정일시                     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    UNIQUE (회사id, 사업연도종료일)
);

CREATE INDEX idx_사업연도_회사id ON 사업연도(회사id);
CREATE INDEX idx_사업연도_전기사업연도id ON 사업연도(전기사업연도id);

-- ============================================================
-- 3. 재무상태표 / 손익계산서 — balance_sheet.csv / income_statement.csv
-- ============================================================

CREATE TABLE 재무상태표항목 (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    사업연도id  INTEGER NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    계정        TEXT NOT NULL,     -- 자유 텍스트. 표준 과목명은 data/계정과목-카탈로그.md 참고용일 뿐
                                    -- (엔진이 강제하는 통제 어휘가 아니라 FK로 묶지 않는다 — §설계문서)
    구분        TEXT NOT NULL CHECK (구분 IN ('자산', '자산차감', '부채', '자본')),
    금액        INTEGER NOT NULL,  -- 원 단위. 항상 양수로 입력(자산차감도 양수, 부호는 구분이 결정)
    정렬순서    INTEGER NOT NULL DEFAULT 0,
    생성일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_재무상태표항목_사업연도id ON 재무상태표항목(사업연도id);

CREATE TABLE 손익계산서항목 (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    사업연도id  INTEGER NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    계정        TEXT NOT NULL,     -- ⚠️ '기업업무추진비'라는 정확한 문자열을 pipeline.py가 찾아
                                    -- 합산한다(engine 자동계산 트리거) — 계정명이 매직 스트링으로 쓰인다.
    구분        TEXT NOT NULL CHECK (구분 IN ('수익', '비용')),
    금액        INTEGER NOT NULL,
    정렬순서    INTEGER NOT NULL DEFAULT 0,
    생성일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_손익계산서항목_사업연도id ON 손익계산서항목(사업연도id);

-- ============================================================
-- 4. 자산대장 — assets.csv (감가상각 시부인의 마스터, 연도 간 이월 추적)
-- ============================================================

CREATE TABLE 자산 (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    사업연도id      INTEGER NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    명              TEXT NOT NULL,
    구분            TEXT NOT NULL CHECK (구분 IN ('건축물', '차량운반구', '비품', '기계장치')),
    취득일          TEXT NOT NULL,   -- ISO 'YYYY-MM-DD'
    취득가          INTEGER NOT NULL,
    -- 기초누계·전기이월부인액은 "전기에서 자동 계산해 채우는 값"이 아니라 CSV와 동일하게
    -- 당해 연도의 리터럴 입력값으로 저장한다(종이 신고서에 실제로 적힌 숫자와 1:1 대응해야
    -- 감사 추적이 성립하므로). 아래 전기자산id로 전기 행과 연결해 검증(당기 입력 == 전기가
    -- 함의하는 값)만 DB 레벨에서 가능하게 한다 — taxengine/carryover.py의 연속성검증()과 동일 로직.
    기초누계        INTEGER NOT NULL DEFAULT 0,
    회사계상액      INTEGER,          -- NULL 허용: 없으면 엔진이 상각범위액을 그대로 계상액으로 간주
    방법            TEXT CHECK (방법 IS NULL OR 방법 IN ('정액', '정률')),
    내용연수        INTEGER NOT NULL,
    전기이월부인액  INTEGER NOT NULL DEFAULT 0,
    업무용승용차    INTEGER NOT NULL DEFAULT 0 CHECK (업무용승용차 IN (0, 1)),

    -- 연도 간 이월 체인의 핵심: "이 자산이 전기의 어느 자산 행에서 이어지는가"를
    -- CSV처럼 '명' 문자열 매칭이 아니라 안정적인 FK로 고정한다.
    전기자산id      INTEGER REFERENCES 자산(id) ON DELETE SET NULL,

    생성일시        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    수정일시        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_자산_사업연도id ON 자산(사업연도id);
CREATE INDEX idx_자산_전기자산id ON 자산(전기자산id);

-- ============================================================
-- 5. 차량대장 — cars.csv (업무용승용차 관련비용 명세서, 별지 제29호)
-- ============================================================

CREATE TABLE 차량 (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    사업연도id      INTEGER NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    명              TEXT NOT NULL,
    감가상각비      INTEGER NOT NULL DEFAULT 0,
    기타관련비용    INTEGER NOT NULL DEFAULT 0,
    전용보험가입    INTEGER NOT NULL DEFAULT 0 CHECK (전용보험가입 IN (0, 1)),
    운행기록부작성  INTEGER NOT NULL DEFAULT 0 CHECK (운행기록부작성 IN (0, 1)),
    -- 업무사용비율도 지분율과 같은 이유로 basis point 정수(0~10000)로 저장.
    업무사용비율_bp INTEGER CHECK (업무사용비율_bp IS NULL OR (업무사용비율_bp BETWEEN 0 AND 10000)),
    생성일시        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_차량_사업연도id ON 차량(사업연도id);

-- ============================================================
-- 6. 세무조정 — adjustments.csv (소득금액조정합계표)
-- ============================================================

CREATE TABLE 세무조정 (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    사업연도id  INTEGER NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    과목        TEXT NOT NULL,
    구분        TEXT NOT NULL CHECK (구분 IN ('익금산입', '손금불산입', '손금산입', '익금불산입')),
    금액        INTEGER NOT NULL,
    소득처분    TEXT CHECK (소득처분 IS NULL OR 소득처분 IN ('유보', '기타사외유출', '상여', '배당', '기타')),
    근거        TEXT,   -- 조문 등 자유 텍스트 메모
    생성일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_세무조정_사업연도id ON 세무조정(사업연도id);

-- ============================================================
-- 7. 정답지 — answer.csv (종이책 별지3 실제값, 재현 대조용 채점표)
-- ============================================================

CREATE TABLE 정답지 (
    사업연도id      INTEGER PRIMARY KEY REFERENCES 사업연도(id) ON DELETE CASCADE,
    각사업연도소득  INTEGER,
    과세표준        INTEGER,
    산출세액        INTEGER,
    차감납부세액    INTEGER,
    지방소득세      INTEGER,
    생성일시        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ============================================================
-- 8. 계산 스냅샷 — pipeline.py 실행() 결과의 버전 이력 (append-only, 감사 추적)
-- ============================================================

-- 입력(재무상태표항목·손익계산서항목·자산·차량·세무조정·사업연도)을 수정할 때마다 다시 계산해
-- 새 스냅샷을 추가한다. UPDATE로 덮어쓰지 않는다 — "이 세액이 그 시점 입력값으로 계산됐다"는
-- 사실 자체가 세무 감사 추적의 핵심이라서다(README/PLAN.md "세무는 틀리면 가산세").
CREATE TABLE 계산스냅샷 (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    사업연도id              INTEGER NOT NULL REFERENCES 사업연도(id) ON DELETE CASCADE,
    계산일시                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    -- 이 스냅샷이 "어느 시점 법령/코드 기준"으로 계산됐는지 기록 (rates.py는 테이블화하지
    -- 않는 대신, 계산에 쓰인 엔진 코드 버전을 여기 남겨 사후 추적 가능하게 한다).
    엔진버전                TEXT,   -- 예: git commit sha 또는 taxengine 패키지 버전 태그
    입력해시                TEXT,   -- 이 스냅샷을 만든 입력 테이블 상태의 해시(선택) — 재계산 필요 여부 판단용

    -- 별지3 핵심 산출값 (engine/tax.py 계산() 반환값과 1:1 대응, 전부 원 단위 정수)
    당기순이익              INTEGER NOT NULL,
    가산조정                INTEGER NOT NULL,
    차감조정                INTEGER NOT NULL,
    각사업연도소득          INTEGER NOT NULL,
    이월결손금공제          INTEGER NOT NULL,
    과세표준                INTEGER NOT NULL,
    산출세액                INTEGER NOT NULL,
    최저한세적용여부        INTEGER NOT NULL DEFAULT 0 CHECK (최저한세적용여부 IN (0, 1)),
    최저한세                INTEGER,
    최저한세배제액          INTEGER,
    공제감면세액_신청액     INTEGER NOT NULL DEFAULT 0,
    공제감면세액_적용후     INTEGER NOT NULL DEFAULT 0,
    가산세                  INTEGER NOT NULL DEFAULT 0,
    기납부세액              INTEGER NOT NULL DEFAULT 0,
    차감납부세액            INTEGER NOT NULL,
    지방소득세_산출세액     INTEGER NOT NULL,
    총납부세액              INTEGER NOT NULL,

    -- 정답지 대조 결과 (당시 정답지 값과 비교한 스냅샷 — 정답지 자체가 나중에 고쳐져도
    -- "그때는 몇 개 일치했다"는 기록이 남는다)
    정답대조_일치항목수     INTEGER,
    정답대조_전체항목수     INTEGER,

    -- 시부인 결과(자산별 부인·추인액)·기업업무추진비 한도·차량 판정 등 세부 산출 내역은
    -- 입력(자산/차량/세무조정/사업연도)에서 언제든 재계산 가능한 순수 파생값이라 별도
    -- 정규화 테이블을 두지 않는다(중복 소스가 늘면 그게 곧 불일치 리스크 — §설계문서 트레이드오프).
    -- 다만 "그 시점에 실제로 무엇을 계산해 보여줬는가"의 원문 그대로를 감사용으로 보존하려고
    -- pipeline.py 실행() 반환값 전체(단계 배열·시부인들·세율내역 등)를 JSON으로 통째 저장한다.
    원본결과_json           TEXT NOT NULL,

    생성일시                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_계산스냅샷_사업연도id ON 계산스냅샷(사업연도id);
CREATE INDEX idx_계산스냅샷_계산일시 ON 계산스냅샷(사업연도id, 계산일시);

-- ============================================================
-- 9. 입력 수정 이력 — 감사 추적 (append-only)
-- ============================================================

-- 특정 입력 테이블/행/필드가 언제·누구에 의해·무엇에서 무엇으로 바뀌었는지 남긴다.
-- 각 입력 테이블에 개별 이력 테이블을 두지 않고 하나의 범용 로그로 합쳐 과설계를 피한다
-- (지금은 "누가 뭘 언제 고쳤나"를 추적할 수 있으면 충분 — §설계문서 트레이드오프).
CREATE TABLE 입력수정이력 (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    테이블명    TEXT NOT NULL,   -- 예: '자산', '재무상태표항목', '사업연도'
    행id        INTEGER NOT NULL,
    사업연도id  INTEGER REFERENCES 사업연도(id) ON DELETE SET NULL,
    필드명      TEXT NOT NULL,
    이전값      TEXT,
    이후값      TEXT,
    수정자id    INTEGER REFERENCES 사용자(id) ON DELETE SET NULL,
    수정일시    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_입력수정이력_사업연도id ON 입력수정이력(사업연도id);
CREATE INDEX idx_입력수정이력_테이블_행 ON 입력수정이력(테이블명, 행id);
