import requests
import time
import json
import os
import random
from dotenv import load_dotenv

def get_all_laws_safe_batch():
    # 1. 초기 설정 (데이터 저장 폴더 생성)
    DATA_DIR = "data"
    os.makedirs(DATA_DIR, exist_ok=True)
    API_KEY = os.getenv("API_KEY") # 성공했던 OC 코드
    
    # 2. 세션 객체 생성 (브라우저처럼 상태와 쿠키를 유지)
    session = requests.Session()
    
    # 3. 완벽한 브라우저 위장 헤더
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.law.go.kr/DRF/lawSearch.do",
        "Connection": "keep-alive"
    }

    # 4. 서버에 먼저 접속하여 '정상 유저' 쿠키 발급받기
    print("서버 접속 및 보안 세션 통과 중...")
    try:
        session.get("https://www.law.go.kr/", headers=headers, timeout=10)
    except Exception as e:
        print("초기 접속 실패. 인터넷 연결을 확인하세요:", e)
        return

    all_laws = []
    page = 1
    
    print("본격적인 법령 데이터 수집을 시작합니다...")
    
    # 5. 페이지 순회하며 데이터 수집
    while True:
        url = f"https://www.law.go.kr/DRF/lawSearch.do?OC={API_KEY}&target=law&type=json&page={page}"
        
        try:
            # 매 요청마다 확보한 세션(session)을 사용
            response = session.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                laws = data.get('LawSearch', {}).get('law', [])
                
                if not laws:
                    print("더 이상 가져올 데이터가 없습니다. 수집 루프를 종료합니다.")
                    break
                
                all_laws.extend(laws)
                print(f"페이지 {page} 수집 완료 (현재 누적: {len(all_laws)}개)")
                
                # [핵심 방어기제] 악의적 봇으로 차단당하지 않기 위한 무작위 대기 (1.5초 ~ 3.5초)
                sleep_time = random.uniform(1.5, 3.5)
                time.sleep(sleep_time) 
                
                page += 1
            else:
                print(f"서버에서 차단했거나 에러 발생 (Status: {response.status_code})")
                break
                
        except Exception as e:
            print(f"통신 에러 발생 (재시도 필요): {e}")
            break
            
    # 6. 수집된 전체 데이터를 로컬 JSON 파일로 덤프 (Phase 1 완료)
    save_path = os.path.join(DATA_DIR, "all_laws_complete.json")
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(all_laws, f, indent=2, ensure_ascii=False)
        
    print(f"\n축하합니다! 총 {len(all_laws)}개의 법령 데이터가 '{save_path}'에 안전하게 저장되었습니다.")

if __name__ == "__main__":
    get_all_laws_safe_batch()