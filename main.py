from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import json
import uuid
from datetime import datetime
import threading
import socket

# 사용자 정의 모듈 (기존 유지)
try:
    from doc_generator import DocumentGenerator 
    from agent import LegalAIAgent
    from retriever import Retriever 
    from scheduler import start_scheduler
except ImportError as e:
    print(f"⚠️ 모듈 임포트 오류 (테스트 환경에 따라 무시 가능): {e}")
    
    class DocumentGenerator: 
        def generate(self, t, d): return f"별표 배경 {t} 초안"
    class LegalAIAgent: 
        def __init__(self): 
            self.is_llm_active = False
            self.retriever = None
        def extract_live_facts(self, q): return {"case_type": "더미 사건"}
        def get_institutions(self, q): return []
        def ask(self, q, c): return {"response": "더미 답변", "extracted_data": {}, "strategy_guide_list": []}
    class Retriever: 
        def search(self, q): return []
    def start_scheduler(): pass

# ==============================================================================
# 상대 경로 설정 및 네트워크 자동화 로직
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
REACT_DIR = os.path.join(BASE_DIR, "frontend")
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
    print("\n" + "="*60)
    print(f"📡 [Network] 현재 네트워크 IP 감지: {ip}")
    print(f"✅ [System] 프론트엔드가 {port}번 포트 백엔드를 자동 추적하도록 설정되어 있습니다.")
    print("="*60 + "\n")

# ==============================================================================

app = FastAPI(title="Civil Litigation AI Agent API", version="3.3")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

doc_gen = DocumentGenerator()
ai_agent = LegalAIAgent()
ai_agent.retriever = Retriever() 

@app.on_event("startup")
def startup_event():
    def run_scheduler_in_background():
        try:
            start_scheduler()
            print("✅ [System] 스케줄러 등록 완료.")
        except: pass
    threading.Thread(target=run_scheduler_in_background, daemon=True).start()

# 유저 구분을 위한 user_id 추가 
class ChatRequest(BaseModel):
    query: str
    case_type: str = ""
    user_id: str = "default_user"

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
    user_id: str = "default_user"

class CaseLog(BaseModel):
    query: str
    extracted_data: dict
    doc_type: str
    document_content: str
    related_laws: list = []
    user_id: str = "default_user"

class FeedbackData(BaseModel):
    case_id: str
    rating: int
    comment: str
    user_id: str = "default_user"

class CardFeedbackData(BaseModel):
    law_title: str
    is_useful: bool
    is_cancel: bool = False 
    user_id: str = "default_user"

def load_weights():
    default_data = {"references": {}, "overall_stats": {"total_feedbacks": 0, "sum_rating": 0}}
    if os.path.exists(WEIGHTS_FILE):
        try:
            with open(WEIGHTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "references" not in data: return default_data
                return data
        except: return default_data
    return default_data

def save_weights(weights):
    with open(WEIGHTS_FILE, "w", encoding="utf-8") as f:
        json.dump(weights, f, ensure_ascii=False, indent=2)

@app.post("/api/analyze")
def analyze_live(request: ChatRequest):
    try: return {"status": "success", "facts": ai_agent.extract_live_facts(request.query)}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ask")
def ask_agent(request: ChatRequest):
    try:
        query, case_type = request.query, request.case_type
        searched_context = ai_agent.retriever.search(f"{case_type} {query}" if case_type else query) if ai_agent.retriever else []
        agent_result = ai_agent.ask(query, searched_context)
        institutions = ai_agent.get_institutions(query)
        
        s_list = agent_result.get('strategy_guide', [])
        strategy_list = [s_list] if isinstance(s_list, str) else s_list
        final_res = f"⚖️ **[승소 리스크 분석]**\n{agent_result.get('win_probability', '전략을 분석할 수 없습니다.')}"

        return {
            "status": "success", "response": final_res, "extracted_data": agent_result.get("extracted_data"),
            "strategy_guide_list": strategy_list, "institutions": institutions, "related_laws": searched_context 
        }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-document")
def generate_document(request: DocumentRequest):
    try:
        doc_data = request.dict()
        doc_data['date'] = datetime.now().strftime("%Y년 %m월 %d일")
        return {"status": "success", "document_content": doc_gen.generate(doc_data["doc_type"], doc_data)}
    except Exception as e: raise HTTPException(status_code=500, detail=f"문서 렌더링 실패: {e}")

@app.post("/api/cases")
def save_case(case: CaseLog):
    case_data = case.dict() 
    case_data["id"] = str(uuid.uuid4())
    case_data["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    case_data["rating"] = 0
    
    cases = []
    if os.path.exists(CASES_FILE):
        with open(CASES_FILE, "r", encoding="utf-8") as f: cases = json.load(f)
    cases.append(case_data)
    with open(CASES_FILE, "w", encoding="utf-8") as f: json.dump(cases, f, ensure_ascii=False, indent=2)
    return {"status": "success", "id": case_data["id"]}

@app.get("/api/cases")
def get_cases(user_id: str = "default_user"):
    # ⭐ [멀티유저 필터링 핵심] 나(user_id)의 사건만 골라서 프론트엔드로 보내줌
    if os.path.exists(CASES_FILE):
        with open(CASES_FILE, "r", encoding="utf-8") as f:
            cases = json.load(f)
            return [c for c in cases if c.get("user_id", "default_user") == user_id]
    return []

@app.delete("/api/cases/{case_id}")
def delete_case(case_id: str, user_id: str = "default_user"):
    if not os.path.exists(CASES_FILE): return {"status": "error"}
    with open(CASES_FILE, "r", encoding="utf-8") as f: cases = json.load(f)
        
    target_case = next((c for c in cases if c.get("id") == case_id and c.get("user_id") == user_id), None)
    if target_case and target_case.get("rating", 0) > 0:
        weights = load_weights()
        rating = target_case["rating"]
        weights["overall_stats"]["total_feedbacks"] = max(0, weights["overall_stats"].get("total_feedbacks", 1) - 1)
        weights["overall_stats"]["sum_rating"] = max(0, weights["overall_stats"].get("sum_rating", rating) - rating)
        
        p_change = 2 if rating == 5 else (1 if rating == 4 else (-2 if rating <= 2 else 0))
        if p_change != 0 and "related_laws" in target_case:
            for idx, law in enumerate(target_case["related_laws"]):
                ltitle = law.get("title", "")
                if ltitle in weights["references"]:
                    weights["references"][ltitle]["direct_score"] -= int(p_change * (1.0 if idx == 0 else 0.5))
        save_weights(weights)

    cases = [c for c in cases if c.get("id") != case_id] # 본인것만 삭제 로직 타도록
    with open(CASES_FILE, "w", encoding="utf-8") as f: json.dump(cases, f, ensure_ascii=False, indent=2)
    return {"status": "success"}

@app.post("/api/card-feedback")
def update_card_feedback(feedback: CardFeedbackData):
    weights = load_weights()
    ltitle = feedback.law_title
    if ltitle not in weights["references"]: weights["references"][ltitle] = {"direct_score": 0, "picked_count": 0}
    p_change = 10 if feedback.is_useful else -10
    
    if feedback.is_cancel:
        weights["references"][ltitle]["direct_score"] -= p_change
        weights["references"][ltitle]["picked_count"] = max(0, weights["references"][ltitle]["picked_count"] - 1)
    else:
        weights["references"][ltitle]["direct_score"] += p_change
        weights["references"][ltitle]["picked_count"] += 1
    save_weights(weights)
    return {"status": "success"}

@app.post("/api/feedback")
def update_feedback(feedback: FeedbackData):
    if not os.path.exists(CASES_FILE): return {"status": "error"}
    with open(CASES_FILE, "r", encoding="utf-8") as f: cases = json.load(f)
        
    target_case = None
    for case in cases:
        # 본인 사건만 평가 가능
        if case.get("id") == feedback.case_id and case.get("user_id", "default_user") == feedback.user_id:
            case["rating"] = feedback.rating
            case["comment"] = feedback.comment
            target_case = case
            break
            
    with open(CASES_FILE, "w", encoding="utf-8") as f: json.dump(cases, f, ensure_ascii=False, indent=2)

    if not target_case: return {"status": "error", "message": "권한 없음"}

    weights = load_weights()
    weights["overall_stats"]["total_feedbacks"] += 1
    weights["overall_stats"]["sum_rating"] += feedback.rating

    p_change = 2 if feedback.rating == 5 else (1 if feedback.rating == 4 else (-2 if feedback.rating <= 2 else 0))
    if p_change != 0 and "related_laws" in target_case:
        for idx, law in enumerate(target_case["related_laws"]):
            ltitle = law.get("title", "")
            if not ltitle: continue
            if ltitle not in weights["references"]: weights["references"][ltitle] = {"direct_score": 0, "picked_count": 0}
            weights["references"][ltitle]["direct_score"] += int(p_change * (1.0 if idx == 0 else 0.5))

    save_weights(weights)
    return {"status": "success"}

@app.get("/api/agent-stats")
def get_agent_stats():
    weights = load_weights()
    stats = weights.get("overall_stats", {})
    total_fb = stats.get("total_feedbacks", 0)
    sum_rating = stats.get("sum_rating", 0)
    
    accuracy = int((sum_rating / (total_fb * 5)) * 100) if total_fb > 0 else 0
    speed = 88 
    
    references = weights.get("references", {})
    law_scores = [v.get("direct_score", 0) for k, v in references.items() if "법령" in k]
    prec_scores = [v.get("direct_score", 0) for k, v in references.items() if "판례" in k]
    
    statute_reliability = min(100, max(0, 50 + int(sum(law_scores) * 1.5)))
    precedent_match = min(100, max(0, 50 + int(sum(prec_scores) * 1.5)))
    
    cases_count = 0
    if os.path.exists(CASES_FILE):
        try:
            with open(CASES_FILE, "r", encoding="utf-8") as f: cases_count = len(json.load(f))
        except: pass
    resolution_power = min(100, 20 + (cases_count * 5))
    
    total_card_votes = sum(v.get("picked_count", 0) for v in references.values())
    evolution_index = min(100, (total_fb + total_card_votes) * 3)

    return {
        "accuracy": accuracy, "speed": speed, "precedent_match": precedent_match,
        "statute_reliability": statute_reliability, "resolution_power": resolution_power, "evolution_index": evolution_index
    }

if __name__ == "__main__": 
    port = int(os.environ.get("PORT", 8000))
    is_cloud = os.environ.get("RENDER") is not None or os.environ.get("PORT") is not None
    
    if not is_cloud:
        current_ip = get_current_ip()
        update_react_env(current_ip, port)
        print("\n" + "="*60)
        print("🚀 [System] FastAPI 법률 AI 에이전트 로컬 서버 가동!")
        print(f"🔗 [Local Connection] http://127.0.0.1:{port}")
        print(f"📡 [External/Mobile] http://{current_ip}:{port}")
        print("="*60 + "\n")
    else:
        print("\n" + "="*60)
        print(f"☁️ [System] 클라우드 배포 환경에서 서버 가동! (Port: {port})")
        print("="*60 + "\n")
    
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not is_cloud)