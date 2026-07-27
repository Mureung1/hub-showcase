"""보초 자동 근무 (MIRI-17) — 켜두면 매일 아침 07:30에 run_scout.main() 한 바퀴.

python scheduler.py 로 실행하면:
1) 켜자마자 첫 순찰 1회 (보초 교대 직후 점검 — 재경보는 alerted_at이 막아준다)
2) 이후 매일 07:30(KST) 자동 순찰. Ctrl+C로 종료.
"""
from apscheduler.schedulers.blocking import BlockingScheduler

from run_scout import main

scheduler = BlockingScheduler(timezone="Asia/Seoul")
scheduler.add_job(main, "cron", hour=7, minute=30)

if __name__ == "__main__":
    print("🐾 미리캣 보초 근무 시작 — 지금 1회 + 매일 07:30 순찰 (Ctrl+C 종료)")
    main()
    scheduler.start()
