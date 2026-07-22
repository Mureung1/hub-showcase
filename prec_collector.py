import requests
import json
import time
import random
import os
import re
from dotenv import load_dotenv
from urllib.parse import quote

load_dotenv()

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
API_KEY = os.getenv("API_KEY")
OUTPUT_CHUNK_FILE = os.path.join(DATA_DIR, "precedents_chunked.json")

TARGET_KEYWORDS = [
    "임대차보증금", 
    "건물명도,명도소송", 
    "소유권이전등기,소유권 이전", 
    "권리금", 
    "공사대금", 
    "하자보수,하자 보수", 
    "전세사기,보증금 편취,보증금 반환", 
    "매매대금",
    "대여금,돈을 빌려", 
    "부당이득", 
    "구상금", 
    "약정금", 
    "채무부존재", 
    "가압류", 
    "가처분", 
    "사해행위", 
    "손해배상", 
    "위자료", 
    "의료과실,의료사고", 
    "교통사고", 
    
    # 🚀 [핵심 수정] 범죄 키워드 뒤에 반드시 '손해배상'이나 '위자료'를 붙여서 민사 판례를 유도합니다.
    "명예훼손 손해배상,명예훼손 위자료", 
    "저작권침해,저작권 침해", 
    "폭행 손해배상,상해 손해배상,폭행 위자료", # <- 이렇게 바꿔주세요!
    "모욕 손해배상,모욕 위자료",
    
    "이혼", 
    "재산분할", 
    "양육비", 
    "상속재산,상속재산분할", 
    "유류분", 
    "친권",
    "부당해고", 
    "임금체불,체불임금", 
    "퇴직금", 
    "산업재해,산재", 
    "영업비밀", 
    "주주총회", 
    "보이스피싱 피해복구,전화금융사기 부당이득", # <- 사기도 돈을 돌려받는 민사로 유도
    "사기 손해배상,사기 부당이득"
]

MAX_ITEMS_PER_KEYWORD = 50 
ITEMS_PER_PAGE = 50 

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
    print(f"총 {len(TARGET_KEYWORDS)}개 법률 테마에 대한 [고효율+동의어 확장] 판례 수집을 시작합니다...\n")

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://www.law.go.kr/",
        "Accept": "application/json"
    })

    chunked_documents = []
    total_collected = 0
    seen_case_nos = set() # 중복 판례 방지용 집합(Set)

    for query_group in TARGET_KEYWORDS:
        keywords = [k.strip() for k in query_group.split(',')]
        display_keyword = keywords[0]
        
        print(f"\n🔍 [{display_keyword}] 관련 핵심 판례 추출 중... (확장 검색어: {query_group})")
        valid_count = 0
        
        # 쪼갠 동의어들을 순회하면서 총 50개를 채웁니다.
        for keyword in keywords:
            if valid_count >= MAX_ITEMS_PER_KEYWORD:
                break # 이미 50개를 채웠으면 다음 그룹으로 넘어감
                
            encoded_keyword = quote(keyword)
            list_url = f"https://www.law.go.kr/DRF/lawSearch.do?OC={API_KEY}&target=prec&type=JSON&query={encoded_keyword}&display={ITEMS_PER_PAGE}"
            
            try:
                response = session.get(list_url, timeout=30)
                if response.status_code != 200:
                    continue
                
                list_res = response.json()
                
                # [핵심 에러 방어] API가 에러를 뱉어서 딕셔너리가 아닌 문자열이 올 경우 스킵
                prec_search = list_res.get("PrecSearch")
                if not isinstance(prec_search, dict):
                    continue
                
                prec_list = prec_search.get("prec", [])
                
                # 결과가 1개일 때 리스트가 아니라 딕셔너리로 오는 엣지 케이스 방어
                if isinstance(prec_list, dict):
                    prec_list = [prec_list]
                elif not isinstance(prec_list, list):
                    continue
                
                for prec in prec_list:
                    if valid_count >= MAX_ITEMS_PER_KEYWORD:
                        break
                        
                    prec_id = prec.get("판례일련번호")
                    case_name = prec.get("사건명")
                    case_no = prec.get("사건번호")
                    
                    # 동의어 검색 시 동일한 판례가 중복 수집되는 것을 완벽 차단
                    if case_no in seen_case_nos:
                        continue
                    
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
                    
                    seen_case_nos.add(case_no)
                    valid_count += 1
                    total_collected += 1
                    time.sleep(random.uniform(0.1, 0.3))
                    
            except Exception as e:
                print(f"  -> [{keyword}] 통신/파싱 에러 발생 (건너뜁니다)")
                continue
                
        print(f"✅ [{display_keyword}] 수집 완료: {valid_count}개")

    with open(OUTPUT_CHUNK_FILE, "w", encoding="utf-8") as f:
        json.dump(chunked_documents, f, indent=2, ensure_ascii=False)
    
    print(f"\n🚀 [수집 완료] 총 {total_collected}개의 '고순도 정예 판례 데이터'가 중복 없이 저장되었습니다!")
    print("이제 prec_indexer.py를 실행하여 벡터 DB를 갱신하세요!")

if __name__ == "__main__":
    get_all_precedents_with_cleaning()