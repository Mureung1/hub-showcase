import requests
import json
import time
import random
import os
from dotenv import load_dotenv

DATA_DIR = "data"
API_KEY = os.getenv("API_KEY")
BASE_META_FILE = os.path.join(DATA_DIR, "all_laws_complete.json")
OUTPUT_CHUNK_FILE = os.path.join(DATA_DIR, "law_articles_chunked.json")

TARGET_LAWS = [
    # 1. 기본 민사 및 소송 절차
    "민법", "민사소송법", "민사집행법", "소액사건심판법", "민사조정법",
    # 2. 부동산 / 임대차
    "주택임대차보호법", "상가건물 임대차보호법", "집합건물의 소유 및 관리에 관한 법률", "공인중개사법",
    # 3. 금전 / 채권채무
    "이자제한법", "대부업 등의 등록 및 금융이용자 보호에 관한 법률", "채권의 공정한 추심에 관한 법률", "어음법", "수표법",
    # 4. 손해배상 / 생활
    "자동차손해배상 보장법", "국가배상법", "제조물 책임법", "정보통신망 이용촉진 및 정보보호 등에 관한 법률",
    # 5. 가사 / 노동
    "가사소송법", "근로기준법", "최저임금법", "남녀고용평등과 일·가정 양립 지원에 관한 법률"
]

def get_law_articles_with_cleaning():
    if not os.path.exists(BASE_META_FILE):
        print("기본 법령 목록 파일이 없습니다. 목록 수집을 먼저 진행해주세요.")
        return

    with open(BASE_META_FILE, "r", encoding="utf-8") as f:
        all_laws = json.load(f)

    target_mst_list = []
    for law in all_laws:
        if law["법령명한글"] in TARGET_LAWS:
            target_mst_list.append({
                "name": law["법령명한글"],
                "mst": law["법령일련번호"]
            })

    print(f"총 {len(target_mst_list)}개의 핵심 법령 상세 조문 수집 및 정제를 시작합니다...\n")

    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.law.go.kr/"
    }
    session.get("https://www.law.go.kr/", headers=headers)

    chunked_documents = []

    for target in target_mst_list:
        print(f"[{target['name']}] 상세 조문 수집 및 실시간 정제 중...")
        url = f"https://www.law.go.kr/DRF/lawService.do?OC={API_KEY}&target=law&MST={target['mst']}&type=json"
        
        try:
            response = session.get(url, headers=headers, timeout=30)
            data = response.json()

            law_data = data.get("Law") or data.get("법령", {})
            if not law_data:
                print(f"  -> [데이터 에러] 법령 본문이 없습니다.\n")
                continue

            # 조문 노드 추출
            jo_list = []
            if "Jo" in law_data:
                jo_list = law_data["Jo"]
            elif "조문" in law_data:
                jomun_node = law_data["조문"]
                if isinstance(jomun_node, dict) and "조문단위" in jomun_node:
                    jo_list = jomun_node["조문단위"]
                elif isinstance(jomun_node, list):
                    jo_list = jomun_node

            if isinstance(jo_list, dict):
                jo_list = [jo_list]

            if not jo_list:
                print(f"  -> [파싱 경고] 조문 데이터를 찾을 수 없습니다.\n")
                continue

            valid_jo_count = 0
            filtered_jo_count = 0

            for jo in jo_list:
                jo_no = jo.get("joNo") or jo.get("조문번호", "")
                jo_title = (jo.get("joYoil") or jo.get("조문제목", "")).strip()
                jo_content = jo.get("joCts") or jo.get("조문내용", "")
                
                if isinstance(jo_content, list):
                    jo_content = " ".join([str(x) for x in jo_content])
                elif isinstance(jo_content, dict):
                    jo_content = str(jo_content)
                
                jo_content_clean = jo_content.strip()
                if not jo_content_clean:
                    continue

                # 🔍 [핵심 정제 알고리즘] 
                # 대한민국 법령 규칙상 진짜 조문은 반드시 '제1조(법원)'처럼 제목(jo_title)이 존재합니다.
                # 제목이 비어있으면서 내용에 편, 장, 절, 총칙 등이 들어간 데이터는 100% 목차성 껍데기 데이터입니다.
                if not jo_title and any(keyword in jo_content_clean for keyword in ["편", "장", "절", "총칙", "통칙"]):
                    filtered_jo_count += 1
                    continue # 벡터 DB에 넣지 않고 스킵합니다.

                # 진짜 알맹이 데이터만 구조화하여 문서 생성
                chunk_text = f"법령명: {target['name']}\n조항: 제{jo_no}조"
                if jo_title:
                    chunk_text += f"({jo_title})"
                chunk_text += f"\n내용: {jo_content_clean}"
                
                chunked_documents.append({
                    "law_name": target['name'],
                    "article_no": jo_no,
                    "content": chunk_text
                })
                valid_jo_count += 1
            
            print(f"  -> 완료 (유효 조문: {valid_jo_count}개 / 목차 노이즈 필터링: {filtered_jo_count}개)")
            time.sleep(random.uniform(1.5, 3.0))

        except Exception as e:
            print(f"  -> 통신/파싱 에러 발생: {e}\n")

    # 정제 완료된 데이터 저장
    with open(OUTPUT_CHUNK_FILE, "w", encoding="utf-8") as f:
        json.dump(chunked_documents, f, indent=2, ensure_ascii=False)
    
    print(f"\n[정제 파이프라인 완료] 총 {len(chunked_documents)}개의 '순도 100% 알맹이 조문'이 '{OUTPUT_CHUNK_FILE}'에 저장되었습니다.")

if __name__ == "__main__":
    get_law_articles_with_cleaning()