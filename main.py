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

# 🚀 [핵심 수정 1] 프론트엔드에서 넘어오는 case_type을 받을 수 있도록 스키마 수정
class ChatRequest(BaseModel):
    query: str
    case_type: str = "" # 기본값을 빈 문자열로 두어 에러 방지

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
        
        # 🚀 [핵심 수정 2] 프론트에서 받은 사건유형을 쿼리 앞에 붙여서 '강화된 쿼리'를 만듭니다.
        # 예: "대여금 반환 청구 김철수에게 50만원을 작년에 빌려줬는데 안갚아요"
        enhanced_search_query = f"{case_type} {query}" if case_type else query
        
        print(f"\n{'-'*50}")
        print(f"🚀 [{datetime.now().strftime('%H:%M:%S')}] 새로운 요청 도착: '{query}'")
        print(f"💡 [강화된 검색 쿼리]: '{enhanced_search_query}'")
        print(f"{'-'*50}")
        
        print("🔍 1. 로컬 벡터 DB(법령/판례) 검색 시작...")
        if ai_agent.retriever:
            # 벡터 DB 검색에는 반드시 '강화된 쿼리'를 던져줍니다.
            searched_context = ai_agent.retriever.search(enhanced_search_query)
            print(f"✅ 검색 완료: 총 {len(searched_context)}건의 관련 레퍼런스를 찾았습니다.")
            
        print("🧠 2. AI 에이전트 추론 및 데이터 추출 시작...")
        # LLM(에이전트)에게 대답을 시킬 때는 사용자의 원래 자연스러운 'query'만 넘겨줍니다.
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

# ... 하단 문서 생성(generate-document) 및 피드백 로직은 기존과 완전히 동일하게 유지 ...

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