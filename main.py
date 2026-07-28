from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import json
import uuid
from datetime import datetime
import threading
import socket  # 내부 IP 감지를 위한 라이브러리

# 사용자 정의 모듈 (기존 유지)
try:
    from doc_generator import DocumentGenerator 
    from agent import LegalAIAgent
    from retriever import Retriever 
    from scheduler import start_scheduler
except ImportError as e:
    print(f"⚠️ 모듈 임포트 오류 (테스트 환경에 따라 무시 가능): {e}")
    
    class DocumentGenerator: 
        def generate(self, t, d): 
            return f"별표 배경 {t} 초안"
            
    class LegalAIAgent: 
        def __init__(self): 
            self.is_llm_active = False
            self.retriever = None
            
        def extract_live_facts(self, q): 
            return {"case_type": "더미 사건"}
            
        def get_institutions(self, q):
            return []
            
        def ask(self, q, c): 
            return {"response": "더미 답변", "extracted_data": {}, "strategy_guide_list": []}
            
    class Retriever: 
        def search(self, q): 
            return []
            
    def start_scheduler(): 
        pass

# ==============================================================================
# 상대 경로 설정 및 네트워크 자동화 로직
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
BACKEND_ENV_PATH = os.path.join(BASE_DIR, ".env")
REACT_DIR = os.path.join(BASE_DIR, "frontend")
REACT_ENV_PATH = os.path.join(REACT_DIR, ".env")
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
CASES_FILE = os.path.join(LOG_DIR, "cases_log.json")
WEIGHTS_FILE = os.path.join(LOG_DIR, "feedback_weights.json")

def get_current_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def update_react_env(ip, port=8000):
    api_url = f"http://{ip}:{port}"
    print("\n" + "="*60)
    print(f"📡 [Network] 환경 변화 감지. 현재 IP: {ip}")
    if not os.path.exists(REACT_DIR):
        print(f"❌ [Error] React 폴더를 찾을 수 없습니다: {REACT_DIR}")
        return
    try:
        with open(REACT_ENV_PATH, "w", encoding="utf-8") as f:
            f.write(f"REACT_APP_API_URL={api_url}\n")
        print(f"✅ [System] React .env 자동 업데이트 완료: {api_url}")
    except Exception as e:
        print(f"❌ [Error] .env 파일 쓰기 실패: {e}")
    print("="*60 + "\n")

# ==============================================================================

app = FastAPI(
    title="Civil Litigation AI Agent API",
    description="진화형 법률 AI 에이전트 통합 API 서버 (위치 기반 기관 안내 적용)",
    version="3.2"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

doc_gen = DocumentGenerator()
ai_agent = LegalAIAgent()
ai_agent.retriever = Retriever() 

@app.on_event("startup")
def startup_event():
    def run_scheduler_in_background():
        try:
            start_scheduler()
            print("✅ [System] 스케줄러가 백그라운드에 안전하게 등록되었습니다.")
        except Exception as e:
            print(f"⚠️ [System] 스케줄러 등록 중 오류 발생 (무시하고 서버 구동): {e}")

    scheduler_thread = threading.Thread(target=run_scheduler_in_background, daemon=True)
    scheduler_thread.start()

class ChatRequest(BaseModel):
    query: str
    case_type: str = ""

class DocumentRequest(BaseModel):
    doc_type: str
    sender_name: str = ""
    sender_address: str = ""
    sender_phone: str = ""
    receiver_name: str = ""
    receiver_address: str = ""
    title: str = ""
    facts: str = ""
    legal_basis: str = ""
    demands: str = ""
    deadline: str = ""
    related_laws: list = []
    strategy_guide: str = ""

class CaseLog(BaseModel):
    query: str
    extracted_data: dict
    doc_type: str
    document_content: str
    related_laws: list = []

class FeedbackData(BaseModel):
    case_id: str
    rating: int
    comment: str

class CardFeedbackData(BaseModel):
    law_title: str
    is_useful: bool
    is_cancel: bool = False 

def load_weights():
    default_data = {"references": {}, "overall_stats": {"total_feedbacks": 0, "sum_rating": 0}}
    if os.path.exists(WEIGHTS_FILE):
        try:
            with open(WEIGHTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "references" not in data:
                    return default_data
                return data
        except:
            return default_data
    return default_data

def save_weights(weights):
    with open(WEIGHTS_FILE, "w", encoding="utf-8") as f:
        json.dump(weights, f, ensure_ascii=False, indent=2)

@app.post("/api/analyze")
def analyze_live(request: ChatRequest):
    try:
        facts = ai_agent.extract_live_facts(request.query)
        return {"status": "success", "facts": facts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ask")
def ask_agent(request: ChatRequest):
    try:
        query = request.query
        case_type = request.case_type
        searched_context = []
        enhanced_search_query = f"{case_type} {query}" if case_type else query
        
        print(f"\n{'-'*50}")
        print(f"🚀 [{datetime.now().strftime('%H:%M:%S')}] 새로운 요청: '{query}'")
        
        if ai_agent.retriever:
            searched_context = ai_agent.retriever.search(enhanced_search_query)
            
        agent_result = ai_agent.ask(query, searched_context)
        
        # 🚀 [추가] 웹 검색을 통한 관할 기관 및 연락처 추출
        institutions = ai_agent.get_institutions(query)
        
        strategy_list = agent_result.get('strategy_guide', [])
        if isinstance(strategy_list, str):
            strategy_list = [strategy_list]
            
        final_response_text = f"⚖️ **[승소 리스크 분석]**\n{agent_result.get('win_probability', '전략을 분석할 수 없습니다.')}"

        return {
            "status": "success",
            "response": final_response_text,
            "extracted_data": agent_result.get("extracted_data"),
            "strategy_guide_list": strategy_list,
            "institutions": institutions, # 🚀 프론트엔드로 기관 정보 전달
            "related_laws": searched_context 
        }
    except Exception as e:
        print(f"❌ API Ask Error 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-document")
def generate_document(request: DocumentRequest):
    try:
        doc_data = request.dict()
        doc_data['date'] = datetime.now().strftime("%Y년 %m월 %d일")
        rendered_document = doc_gen.generate(doc_data["doc_type"], doc_data)
        return {"status": "success", "document_content": rendered_document}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문서 렌더링 실패: {e}")

@app.post("/api/cases")
def save_case(case: CaseLog):
    case_data = case.dict() 
    case_data["id"] = str(uuid.uuid4())
    case_data["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    case_data["rating"] = 0
    case_data["comment"] = ""

    cases = []
    if os.path.exists(CASES_FILE):
        with open(CASES_FILE, "r", encoding="utf-8") as f:
            cases = json.load(f)
    
    cases.append(case_data)
    with open(CASES_FILE, "w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
        
    return {"status": "success", "id": case_data["id"]}

@app.get("/api/cases")
def get_cases():
    if os.path.exists(CASES_FILE):
        with open(CASES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.delete("/api/cases/{case_id}")
def delete_case(case_id: str):
    if not os.path.exists(CASES_FILE):
        return {"status": "error"}
        
    with open(CASES_FILE, "r", encoding="utf-8") as f:
        cases = json.load(f)
        
    target_case = next((c for c in cases if c.get("id") == case_id), None)
    
    if target_case and target_case.get("rating", 0) > 0:
        weights = load_weights()
        rating = target_case["rating"]
        weights["overall_stats"]["total_feedbacks"] = max(0, weights["overall_stats"].get("total_feedbacks", 1) - 1)
        weights["overall_stats"]["sum_rating"] = max(0, weights["overall_stats"].get("sum_rating", rating) - rating)
        
        point_change = 0
        if rating == 5: point_change = 2
        elif rating == 4: point_change = 1
        elif rating <= 2: point_change = -2
        
        if point_change != 0 and "related_laws" in target_case:
            for idx, law in enumerate(target_case["related_laws"]):
                law_title = law.get("title", "")
                if law_title in weights["references"]:
                    boost = int(point_change * (1.0 if idx == 0 else 0.5))
                    weights["references"][law_title]["direct_score"] -= boost
        save_weights(weights)

    cases = [c for c in cases if c.get("id") != case_id]
    with open(CASES_FILE, "w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
    return {"status": "success"}

@app.post("/api/card-feedback")
def update_card_feedback(feedback: CardFeedbackData):
    weights = load_weights()
    if feedback.law_title not in weights["references"]:
        weights["references"][feedback.law_title] = {"direct_score": 0, "picked_count": 0}
    point_change = 10 if feedback.is_useful else -10
    
    if feedback.is_cancel:
        weights["references"][feedback.law_title]["direct_score"] -= point_change
        weights["references"][feedback.law_title]["picked_count"] = max(0, weights["references"][feedback.law_title]["picked_count"] - 1)
    else:
        weights["references"][feedback.law_title]["direct_score"] += point_change
        weights["references"][feedback.law_title]["picked_count"] += 1
    save_weights(weights)
    return {"status": "success"}

@app.post("/api/feedback")
def update_feedback(feedback: FeedbackData):
    if not os.path.exists(CASES_FILE):
        return {"status": "error"}
    with open(CASES_FILE, "r", encoding="utf-8") as f:
        cases = json.load(f)
        
    target_case = None
    for case in cases:
        if case.get("id") == feedback.case_id:
            case["rating"] = feedback.rating
            case["comment"] = feedback.comment
            target_case = case
            break
            
    with open(CASES_FILE, "w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)

    weights = load_weights()
    weights["overall_stats"]["total_feedbacks"] += 1
    weights["overall_stats"]["sum_rating"] += feedback.rating

    point_change = 0
    if feedback.rating == 5: point_change = 2
    elif feedback.rating == 4: point_change = 1
    elif feedback.rating <= 2: point_change = -2

    if point_change != 0 and target_case and "related_laws" in target_case:
        for idx, law in enumerate(target_case["related_laws"]):
            law_title = law.get("title", "")
            if not law_title: continue
            if law_title not in weights["references"]:
                weights["references"][law_title] = {"direct_score": 0, "picked_count": 0}
            boost = int(point_change * (1.0 if idx == 0 else 0.5))
            weights["references"][law_title]["direct_score"] += boost

    save_weights(weights)
    return {"status": "success"}

@app.get("/api/agent-stats")
def get_agent_stats():
    weights = load_weights()
    stats = weights.get("overall_stats", {})
    total_fb = stats.get("total_feedbacks", 0)
    sum_rating = stats.get("sum_rating", 0)
    
    # 1. 정확도: 무조건 70을 깔지 않고, 순수 누적된 별점의 평균 (데이터가 없으면 0%)
    accuracy = int((sum_rating / (total_fb * 5)) * 100) if total_fb > 0 else 0
    
    # 2. 신속성: 서버 스펙 기준 (고정 88%)
    speed = 88 
    
    references = weights.get("references", {})
    law_scores = [v.get("direct_score", 0) for k, v in references.items() if "법령" in k]
    prec_scores = [v.get("direct_score", 0) for k, v in references.items() if "판례" in k]
    
    law_sum = sum(law_scores)
    prec_sum = sum(prec_scores)
    
    # 3 & 4. 법령 신뢰도 / 판례 적합성: 
    # 기본 50점에서 시작. 피드백 가중치 총합에 따라 천천히 증감 (삭제 시 감점 반영)
    statute_reliability = min(100, max(0, 50 + int(law_sum * 1.5)))
    precedent_match = min(100, max(0, 50 + int(prec_sum * 1.5)))
    
    # 5. 문제 해결력: 실제 DB에 저장된 '생성된 문서(사건)' 개수에 비례 (기본 20점)
    cases_count = 0
    if os.path.exists(CASES_FILE):
        try:
            with open(CASES_FILE, "r", encoding="utf-8") as f:
                cases_count = len(json.load(f))
        except:
            pass
    resolution_power = min(100, 20 + (cases_count * 5))
    
    # 6. 진화 지수: 문서 피드백 횟수 + 카드 투표 횟수를 종합하여 성장
    total_card_votes = sum(v.get("picked_count", 0) for v in references.values())
    evolution_index = min(100, (total_fb + total_card_votes) * 3)

    return {
        "accuracy": accuracy,
        "speed": speed,
        "precedent_match": precedent_match,
        "statute_reliability": statute_reliability,
        "resolution_power": resolution_power,
        "evolution_index": evolution_index
    }

if __name__ == "__main__": 
    current_ip = get_current_ip()
    update_react_env(current_ip)
    
    print("\n" + "="*60)
    print("🚀 [System] FastAPI 법률 AI 에이전트 서버 가동!")
    print(f"🔗 [Local Connection] http://127.0.0.1:8000")
    print(f"📡 [External/Mobile] http://{current_ip}:8000")
    print("="*60 + "\n")
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)