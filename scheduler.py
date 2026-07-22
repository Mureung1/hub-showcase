import os
import subprocess
from apscheduler.schedulers.background import BackgroundScheduler

def update_legal_database():
    print("\n🔄 [System] 주간 법률/판례 DB 자동 업데이트를 시작합니다...")
    
    try:
        # ---------------- [1. 법령 파트] ----------------
        print(" 1) 최신 법령 데이터 수집 중...")
        # (주의) 법령수집기 파일 이름이 다르면 아래 "law_collector.py"를 수정해 주세요.
        subprocess.run(["python", "article_collector.py"], check=True)
        
        print(" 2) 법령 벡터 DB 인덱싱 중...")
        subprocess.run(["python", "indexer.py"], check=True)
        
        # ---------------- [2. 판례 파트] ----------------
        print(" 3) 최신 판례 데이터 수집 중...")
        subprocess.run(["python", "prec_collector.py"], check=True)
        
        print(" 4) 판례 벡터 DB 인덱싱 중...")
        subprocess.run(["python", "prec_indexer.py"], check=True)
        
        print("✅ [System] 진화형 벡터 DB(법령+판례) 업데이트가 성공적으로 완료되었습니다.\n")
    except Exception as e:
        print(f"❌ [System] DB 업데이트 중 치명적 오류 발생: {e}\n")

def start_scheduler():
    scheduler = BackgroundScheduler()
    # 매주 일요일 새벽 3시에 백그라운드에서 조용히 실행됨 (블로킹 없음)
    scheduler.add_job(update_legal_database, 'cron', day_of_week='sun', hour=3, minute=0)
    scheduler.start()
    print("⏱️ 주간 자동 업데이트 스케줄러가 가동 대기 중입니다.")