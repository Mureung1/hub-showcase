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

# [핵심 업그레이드] 민사/가사/노동/부동산 등 실생활 주요 법률 분쟁 키워드 총망라
TARGET_KEYWORDS = [
    # 1. 부동산 / 임대차 (가장 빈번함)
    "임대차보증금", "건물명도", "소유권이전등기", "권리금", "공사대금", "하자보수", "전세사기", "매매대금",
    # 2. 금전 / 채권채무
    "대여금", "부당이득", "구상금", "약정금", "채무부존재", "가압류", "가처분", "사해행위취소",
    # 3. 손해배상 / 불법행위
    "손해배상", "위자료", "의료과실", "교통사고", "명예훼손", "저작권침해", "폭행",
    # 4. 가사 / 상속
    "이혼", "재산분할", "양육비", "상속재산분할", "유류분", "친권",
    # 5. 노동 / 기업 기타
    "부당해고", "임금체불", "퇴직금", "산재", "영업비밀", "주주총회"
]

SEARCH_LIMIT = 50 # 키워드당 50개씩만 모아도 총 1,500개가 넘는 양질의 데이터 구축 가능

def clean_html_tags(text):
    if not text: return ""
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', text)
    return text.replace('&nbsp;', ' ').replace('\n', ' ').strip()

def normalize_result(text):
    if not text: return "기타"
    if any(k in text for k in ["인용", "승소", "일부승소"]): return "승소"
    if any(k in text for k in ["기각", "각하"]): return "패소"
    return "기타"

def get_all_precedents_with_cleaning():
    print(f"총 {len(TARGET_KEYWORDS)}개 키워드에 대한 판례 일괄 수집을 시작합니다...\n")

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://www.law.go.kr/",
        "Accept": "application/json"
    })

    chunked_documents = []

    for keyword in TARGET_KEYWORDS:
        print(f"[{keyword}] 관련 판례 검색 중...")
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
                
                detail_url = f"https://www.law.go.kr/DRF/lawService.do?OC={API_KEY}&target=prec&ID={prec_id}&type=JSON"
                detail_res = session.get(detail_url, timeout=30).json()
                prec_detail = detail_res.get("PrecService", {})
                
                summary = prec_detail.get("판결요지", "")
                reason = prec_detail.get("이유", "")
                core_content_clean = clean_html_tags(summary if summary else reason)
                
                if not core_content_clean or len(core_content_clean) < 50:
                    continue
                    
                chunk_text = f"사건명: {case_name}\n사건번호: {case_no}\n판결요지 및 이유: {core_content_clean}"
                result_normalized = normalize_result(prec_detail.get("판결유형", "") or prec_detail.get("판결", "기타"))
                
                chunked_documents.append({
                    "case_name": case_name,
                    "case_no": case_no,
                    "content": chunk_text,
                    "result": result_normalized
                })
                valid_prec_count += 1
                time.sleep(random.uniform(0.3, 0.7))
                
            print(f"  -> 완료 (유효 판례 추출: {valid_prec_count}개)")
            
        except Exception as e:
            print(f"  -> 통신/파싱 에러 발생: {e}")

    with open(OUTPUT_CHUNK_FILE, "w", encoding="utf-8") as f:
        json.dump(chunked_documents, f, indent=2, ensure_ascii=False)
    
    print(f"\n[일괄 수집 완료] 총 {len(chunked_documents)}개의 '핵심 판례 데이터'가 저장되었습니다.")
    print("이제 prec_indexer.py를 실행하여 벡터 DB를 생성하세요!")

if __name__ == "__main__":
    get_all_precedents_with_cleaning()