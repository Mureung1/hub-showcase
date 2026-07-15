import requests
import json
import time
import random
import os
import re
from dotenv import load_dotenv
from urllib.parse import quote

# 환경변수 로드
load_dotenv()

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
API_KEY = os.getenv("API_KEY")
OUTPUT_CHUNK_FILE = os.path.join(DATA_DIR, "precedents_chunked.json")

# RAG로 구현하고 싶은 타겟 키워드
TARGET_KEYWORDS = ["손해배상", "임대차보호", "보증금반환"]
SEARCH_LIMIT = 20 # 키워드당 수집할 최신 판례 개수

def clean_html_tags(text):
    """법제처 데이터 특유의 HTML 태그 및 불필요한 공백 제거"""
    if not text:
        return ""
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', text)
    return text.replace('&nbsp;', ' ').replace('\n', ' ').strip()

def normalize_result(text):
    """판결 결과를 '승소', '패소', '기타'로 정규화"""
    if not text:
        return "기타"
    if any(k in text for k in ["인용", "승소", "일부승소"]):
        return "승소"
    if any(k in text for k in ["기각", "각하"]):
        return "패소"
    return "기타"

def get_precedents_with_cleaning():
    print(f"총 {len(TARGET_KEYWORDS)}개 키워드에 대한 판례 수집 및 정제를 시작합니다...\n")

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Referer": "https://www.law.go.kr/",
        "Accept": "application/json"
    })

    chunked_documents = []

    for keyword in TARGET_KEYWORDS:
        print(f"[{keyword}] 관련 판례 목록 검색 중...")
        
        encoded_keyword = quote(keyword)
        list_url = f"https://www.law.go.kr/DRF/lawSearch.do?OC={API_KEY}&target=prec&type=JSON&query={encoded_keyword}&display={SEARCH_LIMIT}"
        
        try:
            response = session.get(list_url, timeout=30)
            
            if response.status_code != 200:
                print(f"  -> 서버 응답 오류: {response.status_code}")
                continue
            
            list_res = response.json()
            prec_list = list_res.get("PrecSearch", {}).get("prec", [])
            
            if not prec_list:
                print(f"  -> 검색된 판례가 없습니다.")
                continue
                
            valid_prec_count = 0
            
            for prec in prec_list:
                prec_id = prec.get("판례일련번호")
                case_name = prec.get("사건명")
                case_no = prec.get("사건번호")
                
                # 상세 조회
                detail_url = f"https://www.law.go.kr/DRF/lawService.do?OC={API_KEY}&target=prec&ID={prec_id}&type=JSON"
                detail_res = session.get(detail_url, timeout=30).json()
                
                prec_detail = detail_res.get("PrecService", {})
                
                # 내용 정제
                summary = prec_detail.get("판결요지", "")
                reason = prec_detail.get("이유", "")
                core_content = summary if summary else reason
                core_content_clean = clean_html_tags(core_content)
                
                if not core_content_clean or len(core_content_clean) < 50:
                    continue
                    
                chunk_text = f"사건명: {case_name}\n사건번호: {case_no}\n판결요지 및 이유: {core_content_clean}"
                
                # 결과값 정규화 (추가된 로직)
                raw_result = prec_detail.get("판결유형", "") or prec_detail.get("판결", "기타")
                result_normalized = normalize_result(raw_result)
                
                chunked_documents.append({
                    "case_name": case_name,
                    "case_no": case_no,
                    "content": chunk_text,
                    "result": result_normalized
                })
                valid_prec_count += 1
                time.sleep(random.uniform(0.5, 1.0))
                
            print(f"  -> 완료 (유효 판례 추출: {valid_prec_count}개)")
            time.sleep(random.uniform(1.0, 2.0))
            
        except Exception as e:
            print(f"  -> 통신/파싱 에러 발생: {e}")

    # 저장
    with open(OUTPUT_CHUNK_FILE, "w", encoding="utf-8") as f:
        json.dump(chunked_documents, f, indent=2, ensure_ascii=False)
    
    print(f"\n[정제 파이프라인 완료] 총 {len(chunked_documents)}개의 '핵심 판례 데이터'가 '{OUTPUT_CHUNK_FILE}'에 저장되었습니다.")

if __name__ == "__main__":
    get_precedents_with_cleaning()