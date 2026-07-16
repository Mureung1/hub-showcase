from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import json
import uuid
from datetime import datetime

from doc_generator import DocumentGenerator
from agent import LegalAIAgent
from retriever import Retriever 

app = FastAPI(
    title="Civil Litigation AI Agent API",
    description="진화형 법률 AI 에이전트 v3.0 통합 API 서버",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
doc_gen = DocumentGenerator()
ai_agent = LegalAIAgent()
ai_agent.retriever = Retriever() 

class ChatRequest(BaseModel):
    query: str

class DocumentRequest(BaseModel):
    doc_type: str
    sender_name: str
    sender_address: str
    sender_phone: str
    receiver_name: str
    receiver_address: str
    title: str
    facts: str
    legal_basis: str
    demands: str
    deadline: str

class FeedbackRequest(BaseModel):
    query: str
    extracted_data: dict
    rating: int
    user_comment: str

# [NEW] 실시간 토큰 0 추출 API
@app.post("/api/analyze")
async def analyze_live(request: ChatRequest):
    try:
        # LLM 없이 정규식으로만 가볍게 빼옵니다.
        facts = ai_agent.extract_live_facts(request.query)
        return {"status": "success", "facts": facts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ask")
async def ask_agent(request: ChatRequest):
    try:
        query = request.query
        searched_context = []
        
        print(f"\n{'-'*50}")
        print(f"🚀 [{datetime.now().strftime('%H:%M:%S')}] 새로운 요청 도착: '{query}'")
        print(f"{'-'*50}")
        
        print("🔍 1. 로컬 벡터 DB(법령/판례) 검색 시작...")
        if ai_agent.retriever:
            searched_context = ai_agent.retriever.search(query)
            print(f"✅ 검색 완료: 총 {len(searched_context)}건의 관련 레퍼런스를 찾았습니다.")
            
        print("🧠 2. AI 에이전트 추론 및 데이터 추출 시작...")
        agent_result = ai_agent.ask(query, searched_context)
        print("✅ AI 추론 완료! 프론트엔드로 응답을 반환합니다.\n")

        return {
            "status": "success",
            "response": agent_result.get("response"),
            "extracted_data": agent_result.get("extracted_data"),
            "related_laws": searched_context 
        }
    except Exception as e:
        print(f"❌ API Ask Error 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-document")
async def generate_document(request: DocumentRequest):
    try:
        doc_data = request.model_dump()
        template_file = "cert_of_contents.txt" if doc_data["doc_type"] == "content_proof" else "complaint.txt"
        
        try:
            template = doc_gen.env.get_template(template_file)
            doc_data['date'] = datetime.now().strftime("%Y년 %m월 %d일")
            rendered_document = template.render(doc_data)
            
            filename = f"{'내용증명' if doc_data['doc_type'] == 'content_proof' else '소장'}_{doc_data['receiver_name']}_{datetime.now().strftime('%Y%m%d%H%M')}.txt"
            filepath = os.path.join(doc_gen.output_dir, filename)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(rendered_document)
                
            print(f"📄 문서 생성 성공: {filename}")
            return {"status": "success", "document_content": rendered_document}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"템플릿 렌더링 실패: {e}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ... 하단 피드백 로직 기존과 동일 ...
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
CASES_FILE = os.path.join(LOG_DIR, "cases_log.json")

class CaseLog(BaseModel):
    query: str
    extracted_data: dict
    doc_type: str
    document_content: str

class FeedbackData(BaseModel):
    case_id: str
    rating: int
    comment: str

@app.post("/api/cases")
async def save_case(case: CaseLog):
    case_data = case.model_dump() 
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