"""데모/리허설용: 공지의 경보 표시(alerted_at)를 되돌려 경보를 다시 울릴 수 있게 한다.

사용:
  python demo_reset.py            → 표시된 공지 전부 리셋
  python demo_reset.py 시간표     → 제목에 "시간표"가 든 공지만 리셋
그다음 run_scout.py를 돌리면 해당 공지의 경보가 다시 발사된다 (멱등성 데모의 짝).
"""
import sys

from db import reset_alerts

if __name__ == "__main__":
    keyword = sys.argv[1] if len(sys.argv) > 1 else None
    n = reset_alerts(keyword)
    target = f'제목에 "{keyword}"가 든 공지' if keyword else "표시된 공지 전부"
    print(f"리셋 완료 — {target}: {n}건 (run_scout.py 실행 시 경보 재발사)")
