# migrate_competitors.py — competitors 테이블에 위치 검색 연동에 필요한 컬럼을 추가하는 1회성 스크립트
# 실행: python migrate_competitors.py
# 멱등적으로 작성되어 있어 여러 번 실행해도 안전합니다.

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from database import engine

ADD_COLUMNS_SQL = """
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS distance_km DOUBLE PRECISION;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS source_store_name VARCHAR(255);
"""

FIND_NAME_UNIQUE_CONSTRAINT_SQL = """
SELECT tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'competitors'
  AND tc.constraint_type = 'UNIQUE'
  AND kcu.column_name = 'name'
"""

ADD_COMPOSITE_UNIQUE_SQL = """
ALTER TABLE competitors
ADD CONSTRAINT uq_competitor_name_source UNIQUE (name, source_store_name);
"""


def main():
    with engine.begin() as conn:
        print("1. 새 컬럼 추가 (latitude/longitude/distance_km/source_store_name)...")
        for stmt in ADD_COLUMNS_SQL.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                conn.execute(text(stmt))
        print("   완료")

        print("2. 기존 name 단일 unique 제약 조회...")
        rows = conn.execute(text(FIND_NAME_UNIQUE_CONSTRAINT_SQL)).fetchall()
        for row in rows:
            constraint_name = row[0]
            print(f"   기존 제약 발견: {constraint_name} -> 삭제")
            conn.execute(text(f'ALTER TABLE competitors DROP CONSTRAINT "{constraint_name}"'))
        if not rows:
            print("   기존 name unique 제약 없음 (이미 정리된 상태일 수 있음)")

        print("3. (name, source_store_name) 복합 unique 제약 추가...")
        existing = conn.execute(text(
            "SELECT 1 FROM pg_constraint WHERE conname = 'uq_competitor_name_source'"
        )).fetchone()
        if existing:
            print("   이미 존재함, 건너뜀")
        else:
            conn.execute(text(ADD_COMPOSITE_UNIQUE_SQL))
            print("   완료")

    print("마이그레이션 완료.")


if __name__ == "__main__":
    main()
