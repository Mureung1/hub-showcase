from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import json
import uuid
from datetime import datetime
import threading

# 우리가 만든 모듈들 임포트
from doc_generator import DocumentGenerator 
from agent import LegalAIAgent
from retriever import Retriever 
from scheduler import start_scheduler

app = FastAPI(
    title="Civil Litigation AI Agent API",
    description="진화형 법률 AI 에이전트 통합 API 서버",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
CASES_FILE = os.path.join(LOG_DIR, "cases_log.json")
WEIGHTS_FILE = os.path.join(LOG_DIR, "feedback_weights.json")

doc_gen = DocumentGenerator()
ai_agent = LegalAIAgent()
ai_agent.retriever = Retriever() 

@app.on_event("startup")
def startup_event():
    print("\n" + "="*60)
    print("🚀 [System] FastAPI 서버가 성공적으로 가동되었습니다!")
    
    if hasattr(ai_agent, 'is_llm_active') and ai_agent.is_llm_active:
        print("🟢 [Status] OpenAI API 키 적용 완료 (GPT-4o 추론 모드 가동)")
    else:
        print("⚪ [Status] OpenAI API 키 미적용 (토큰 0원 오프라인 하이브리드 모드 가동)")
    print("="*60 + "\n")
    
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

# 🚀 [핵심 해결] 옛날 버전 JSON 파일을 만나도 뻗지 않도록 방어 로직 추가
def load_weights():
    default_data = {"references": {}, "overall_stats": {"total_feedbacks": 0, "sum_rating": 0}}
    if os.path.exists(WEIGHTS_FILE):
        try:
            with open(WEIGHTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # 옛날 파일 구조면 과감히 초기화하여 에러 방지
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
        
        final_response_text = ""
        if "win_probability" in agent_result:
            final_response_text = f"⚖️ **[승소 리스크 분석]**\n{agent_result.get('win_probability', '')}\n\n💡 **[변호사 상담 전략]**\n{agent_result.get('strategy_guide', '')}"
        else:
            final_response_text = agent_result.get("response", "전략을 분석할 수 없습니다.")

        return {
            "status": "success",
            "response": final_response_text,
            "extracted_data": agent_result.get("extracted_data"),
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
    
    accuracy = int((sum_rating / (total_fb * 5)) * 100) if total_fb > 0 else 70
    speed = 95 
    
    references = weights.get("references", {})
    law_scores = [v.get("direct_score", 0) for k, v in references.items() if "법령" in k]
    prec_scores = [v.get("direct_score", 0) for k, v in references.items() if "판례" in k]
    
    statute_reliability = min(100, max(50, 70 + sum(law_scores)))
    precedent_match = min(100, max(50, 70 + sum(prec_scores)))
    resolution_power = min(100, 50 + (total_fb * 3))
    evolution_index = min(100, 40 + len(references) * 2 + total_fb * 2)

    return {
        "accuracy": accuracy,
        "speed": speed,
        "precedent_match": precedent_match,
        "statute_reliability": statute_reliability,
        "resolution_power": resolution_power,
        "evolution_index": evolution_index
    }

if __name__ == "__main__": 
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)