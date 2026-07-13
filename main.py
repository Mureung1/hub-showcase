from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import json
from datetime import datetime

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

# ====== [NEW] Phase 3: 피드백 로그 시스템 구축 (Success-Log JSON 매핑) ======
@app.post("/api/feedback")
async def save_feedback(request: FeedbackRequest):
    try:
        log_data = request.model_dump()
        log_data["timestamp"] = datetime.now().isoformat()
        
        log_file_path = os.path.join(LOG_DIR, "success_logs.json")
        
        # 기존 로그 읽기 및 추가
        existing_logs = []
        if os.path.exists(log_file_path):
            with open(log_file_path, "r", encoding="utf-8") as f:
                try:
                    existing_logs = json.load(f)
                except json.JSONDecodeError:
                    existing_logs = []
                    
        existing_logs.append(log_data)
        
        # 파일 저장
        with open(log_file_path, "w", encoding="utf-8") as f:
            json.dump(existing_logs, f, ensure_ascii=False, indent=4)
            
        print(f"✨ [Success-Log] 피드백 데이터가 누적되었습니다. (총 {len(existing_logs)}건)")
        return {"status": "success", "message": "피드백이 성공적으로 기록되었습니다. 에이전트 진화에 활용됩니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)