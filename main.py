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
    allow_origins=["*"], # 개발 환경
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
CASES_FILE = os.path.join(LOG_DIR, "cases_log.json")

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

class FeedbackData(BaseModel):
    case_id: str
    rating: int
    comment: str

@app.post("/api/analyze")
async def analyze_live(request: ChatRequest):
    try:
        facts = ai_agent.extract_live_facts(request.query)
        return {"status": "success", "facts": facts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ask")
async def ask_agent(request: ChatRequest):
    try:
        query = request.query
        case_type = request.case_type
        searched_context = []
        
        enhanced_search_query = f"{case_type} {query}" if case_type else query
        
        print(f"\n{'-'*50}")
        print(f"🚀 [{datetime.now().strftime('%H:%M:%S')}] 새로운 요청: '{query}'")
        print(f"💡 [강화된 쿼리]: '{enhanced_search_query}'")
        print(f"{'-'*50}")
        
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
async def generate_document(request: DocumentRequest):
    try:
        doc_data = request.dict()
        doc_data['date'] = datetime.now().strftime("%Y년 %m월 %d일")
        
        rendered_document = doc_gen.generate(doc_data["doc_type"], doc_data)
            
        return {"status": "success", "document_content": rendered_document}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문서 렌더링 실패: {e}")

@app.post("/api/cases")
async def save_case(case: CaseLog):
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
async def get_cases():
    if os.path.exists(CASES_FILE):
        with open(CASES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

# 🚀 [신규 추가] 사건 삭제 API
@app.delete("/api/cases/{case_id}")
async def delete_case(case_id: str):
    if not os.path.exists(CASES_FILE):
        return {"status": "error", "message": "파일이 없습니다."}
        
    with open(CASES_FILE, "r", encoding="utf-8") as f:
        cases = json.load(f)
        
    # 해당 ID를 제외하고 리스트 재구성
    cases = [c for c in cases if c.get("id") != case_id]
            
    with open(CASES_FILE, "w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
        
    return {"status": "success"}

@app.post("/api/feedback")
async def update_feedback(feedback: FeedbackData):
    if not os.path.exists(CASES_FILE):
        return {"status": "error", "message": "기록된 사건이 없습니다."}
        
    with open(CASES_FILE, "r", encoding="utf-8") as f:
        cases = json.load(f)
        
    for case in cases:
        if case.get("id") == feedback.case_id:
            case["rating"] = feedback.rating
            case["comment"] = feedback.comment
            break
            
    with open(CASES_FILE, "w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
        
    return {"status": "success"}

if __name__ == "__main__": 
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)