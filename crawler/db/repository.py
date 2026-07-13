import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import uuid
import json
from typing import Dict, Optional
from config import DATABASE_URL


class Repository:
    def __init__(self):
        self.conn = None

    def connect(self):
        """Supabase PostgreSQL 연결"""
        try:
            self.conn = psycopg2.connect(DATABASE_URL)
            print("✅ 데이터베이스 연결 성공")
        except Exception as e:
            print(f"❌ 데이터베이스 연결 실패: {e}")
            raise

    def close(self):
        """연결 종료"""
        if self.conn:
            self.conn.close()
            print("데이터베이스 연결 종료")

    def insert_raw_posting(self, posting_data: Dict) -> Optional[str]:
        """원본 공고 저장 (RawPosting 테이블)

        Args:
            posting_data: {
                'source_url': str,
                'raw_title': str,
                'raw_text': str,
                'scraped_at': datetime
            }

        Returns:
            저장된 raw_posting.id 또는 None
        """
        if not self.conn:
            print("❌ 데이터베이스 연결 안 됨")
            return None

        try:
            raw_posting_id = str(uuid.uuid4())
            source_url = posting_data["source_url"]

            # 중복 체크
            with self.conn.cursor() as cur:
                cur.execute(
                    'SELECT id FROM "raw_postings" WHERE "sourceUrl" = %s',
                    (source_url,),
                )
                if cur.fetchone():
                    print(f"  ⚠️  이미 수집됨: {source_url}")
                    return None

            # INSERT
            with self.conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO "raw_postings"
                    ("id", "sourceSite", "sourceUrl", "rawTitle", "rawText", "scrapedAt", "status", "createdAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        raw_posting_id,
                        "wevity",
                        source_url,
                        posting_data["raw_title"],
                        posting_data["raw_text"],
                        posting_data["scraped_at"],
                        "RAW",
                        datetime.utcnow(),
                    ),
                )
            self.conn.commit()
            return raw_posting_id

        except Exception as e:
            self.conn.rollback()
            print(f"  ❌ raw_posting 저장 실패: {e}")
            return None

    def insert_posting_with_eligibility(
        self, raw_posting_id: str, posting_data: Dict, eligibility_data: Dict, parse_status: str
    ) -> Optional[str]:
        """정규화된 공고 + 자격요건 저장 (Posting + Eligibility)

        Args:
            raw_posting_id: 연결할 RawPosting의 id
            posting_data: {
                'category': str ('COMPETITION' or 'ACTIVITY'),
                'title': str,
                'host_org': Optional[str],
                'reception_start_date': Optional[datetime],
                'reception_end_date': Optional[datetime],
                'source_url': str,
            }
            eligibility_data: parser의 반환값
            parse_status: 'CURATED' or 'NEEDS_REVIEW'

        Returns:
            저장된 posting.id 또는 None
        """
        if not self.conn:
            print("❌ 데이터베이스 연결 안 됨")
            return None

        try:
            posting_id = str(uuid.uuid4())
            now = datetime.utcnow()

            with self.conn.cursor() as cur:
                # Posting INSERT
                cur.execute(
                    """
                    INSERT INTO "postings"
                    ("id", "rawPostingId", "category", "title", "hostOrg",
                     "receptionStartDate", "receptionEndDate", "sourceUrl",
                     "parseStatus", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        posting_id,
                        raw_posting_id,
                        posting_data.get("category", "ACTIVITY"),
                        posting_data["title"],
                        posting_data.get("host_org"),
                        posting_data.get("reception_start_date"),
                        posting_data.get("reception_end_date"),
                        posting_data["source_url"],
                        parse_status,
                        now,
                        now,
                    ),
                )

                # Eligibility INSERT (1:1)
                cur.execute(
                    """
                    INSERT INTO "eligibilities"
                    ("id", "postingId", "majors", "regions", "grades",
                     "enrollmentStatuses", "ageMin", "ageMax", "rawEligibilityText")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        str(uuid.uuid4()),
                        posting_id,
                        eligibility_data.get("majors", []),
                        eligibility_data.get("regions", []),
                        eligibility_data.get("grades", []),
                        eligibility_data.get("enrollment_statuses", []),
                        eligibility_data.get("age_min"),
                        eligibility_data.get("age_max"),
                        eligibility_data.get("raw_eligibility_text", ""),
                    ),
                )

            self.conn.commit()
            return posting_id

        except Exception as e:
            self.conn.rollback()
            print(f"  ❌ posting/eligibility 저장 실패: {e}")
            return None

    def get_stats(self) -> Dict:
        """통계 조회"""
        if not self.conn:
            return {}

        try:
            with self.conn.cursor() as cur:
                cur.execute('SELECT COUNT(*) FROM "postings"')
                posting_count = cur.fetchone()[0]

                cur.execute(
                    'SELECT COUNT(*) FROM "postings" WHERE "parseStatus" = %s',
                    ("NEEDS_REVIEW",),
                )
                needs_review_count = cur.fetchone()[0]

                return {
                    "total_postings": posting_count,
                    "needs_review": needs_review_count,
                    "curated": posting_count - needs_review_count,
                }
        except Exception as e:
            print(f"❌ 통계 조회 실패: {e}")
            return {}
