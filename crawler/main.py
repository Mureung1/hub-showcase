#!/usr/bin/env python3
"""
위비티 크롤러 메인 진입점

실행:
  python main.py
"""

import sys
import time
from datetime import datetime

# 모듈 임포트
from config import SECTIONS, MAX_PAGES
from scrapers.wevity import collect_ids, fetch_posting
from parser.eligibility_parser import parse_eligibility, determine_parse_status
from db.repository import Repository


def main():
    print("=" * 60)
    print("🤖 위비티 크롤러 시작")
    print("=" * 60)

    repo = Repository()

    try:
        repo.connect()
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        return

    total_collected = 0
    total_errors = 0

    # 대외활동만 크롤링 (공모전은 이미 226개 수집됨)
    for section in SECTIONS:
        if "active" not in section["path"]:
            print(f"\n⏭️  섹션 스킵: {section['name']} (이미 충분함)")
            continue

        print(f"\n📌 섹션: {section['name']}")
        print("-" * 60)

        # 1단계: 목록 페이지에서 ID 수집
        posting_ids = collect_ids(section["path"], max_pages=MAX_PAGES)

        if not posting_ids:
            print(f"  ⚠️  수집된 ID 없음\n")
            continue

        # 2단계: 각 공고 상세 페이지 파싱 및 DB 저장
        for idx, posting_id in enumerate(posting_ids, 1):
            print(f"\n[{idx}/{len(posting_ids)}] ID {posting_id}")

            # 상세 페이지 파싱
            posting_data = fetch_posting(posting_id, section=section["path"].split("=")[1].split("&")[0])
            if not posting_data:
                total_errors += 1
                continue

            # 원본 저장
            raw_posting_id = repo.insert_raw_posting(
                {
                    "source_url": posting_data["source_url"],
                    "raw_title": posting_data["raw_title"],
                    "raw_text": posting_data["raw_text"],
                    "scraped_at": datetime.utcnow(),
                }
            )

            if not raw_posting_id:
                total_errors += 1
                continue

            # 자격요건 파싱
            eligibility = parse_eligibility(
                posting_data["raw_text"], wevity_fields=posting_data.get("wevity_fields")
            )
            parse_status = determine_parse_status(eligibility)

            # 정규화된 공고 + 자격요건 저장
            posting_id_saved = repo.insert_posting_with_eligibility(
                raw_posting_id,
                {
                    "category": "COMPETITION" if section["path"].startswith("?c=find") else "ACTIVITY",
                    "title": posting_data["raw_title"],
                    "host_org": posting_data.get("host_org"),
                    "reception_end_date": posting_data.get("reception_end_date"),
                    "source_url": posting_data["source_url"],
                },
                eligibility,
                parse_status,
            )

            if posting_id_saved:
                total_collected += 1
                status_emoji = "✅" if parse_status == "CURATED" else "⚠️ "
                print(f"    {status_emoji} 저장됨 (parseStatus: {parse_status})")
            else:
                total_errors += 1

            # 요청 간 딜레이
            time.sleep(0.5)

    # 최종 통계
    print("\n" + "=" * 60)
    print("📊 크롤링 완료")
    print("=" * 60)

    stats = repo.get_stats()
    print(f"총 저장된 공고: {stats.get('total_postings', 0)}개")
    print(f"  - CURATED: {stats.get('curated', 0)}개")
    print(f"  - NEEDS_REVIEW: {stats.get('needs_review', 0)}개")
    print(f"수집 중 오류: {total_errors}개")

    repo.close()

    if total_collected > 0:
        print("\n✅ 크롤링 성공!")
        return 0
    else:
        print("\n❌ 저장된 데이터 없음")
        return 1


if __name__ == "__main__":
    sys.exit(main())
