from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import json
import uuid
from datetime import datetime
from pydantic import BaseModel

from doc_generator import DocumentGenerator
from agent import LegalAIAgent

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

# 폴더 및 객체 초기화
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
doc_gen = DocumentGenerator()
ai_agent = LegalAIAgent()

class ChatRequest(BaseModel):
    query: str

class DocumentRequest(BaseModel):
    doc_type: str # "content_proof" 또는 "complaint" 선택
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

# [NEW] Phase 3 피드백 데이터 모델
class FeedbackRequest(BaseModel):
    query: str
    extracted_data: dict
    rating: int # 1 ~ 5 점
    user_comment: str

@app.post("/api/ask")
async def ask_agent(request: ChatRequest):
    try:
        query = request.query
        searched_laws = []
        if ai_agent.retriever:
            docs = ai_agent.retriever.invoke(query)
            for doc in docs:
                searched_laws.append({
                    "title": f"{doc.metadata.get('law_name', '법령')} 제{doc.metadata.get('article_no', '0')}조",
                    "content": doc.page_content
                })
        
        agent_result = ai_agent.ask(query)
        
        return {
            "status": "success",
            "response": agent_result.get("response"),
            "extracted_data": agent_result.get("extracted_data"),
            "related_laws": searched_laws
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-document")
async def generate_document(request: DocumentRequest):
    try:
        doc_data = request.model_dump()
        
        # doc_type에 따른 템플릿 파일 분기 바인딩
        template_file = "cert_of_contents.txt" if doc_data["doc_type"] == "content_proof" else "complaint.txt"
        
        # doc_generator의 로직을 활용하되 파일 분기
        try:
            template = doc_gen.env.get_template(template_file)
            doc_data['date'] = datetime.now().strftime("%Y년 %m월 %d일")
            rendered_document = template.render(doc_data)
            
            filename = f"{'내용증명' if doc_data['doc_type'] == 'content_proof' else '소장'}_{doc_data['receiver_name']}_{datetime.now().strftime('%Y%m%d%H%M')}.txt"
            filepath = os.path.join(doc_gen.output_dir, filename)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(rendered_document)
                
            return {"status": "success", "document_content": rendered_document}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"템플릿 렌더링 실패: {e}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- [Phase 3] 로그 저장소 설정 ---
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
CASES_FILE = os.path.join(LOG_DIR, "cases_log.json")

# --- 데이터 스키마 정의 ---
class CaseLog(BaseModel):
    query: str
    extracted_data: dict
    doc_type: str
    document_content: str

class FeedbackData(BaseModel):
    case_id: str
    rating: int
    comment: str

# --- API 엔드포인트 ---
@app.post("/api/cases")
async def save_case(case: CaseLog):
    """문서 생성이 완료되면 새로운 사건으로 로그에 저장합니다."""
    case_data = case.model_dump() # Pydantic v2 방식 (v1인 경우 case.dict())
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
    """저장된 모든 사건 히스토리를 반환합니다."""
    if os.path.exists(CASES_FILE):
        with open(CASES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.post("/api/feedback")
async def update_feedback(feedback: FeedbackData):
    """기존 사건에 사용자의 평가와 코멘트를 업데이트합니다."""
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