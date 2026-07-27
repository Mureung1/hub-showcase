# main.py 전체 코드
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
# 아래 모듈들이 main.py와 같은 폴더에 있다고 가정합니다.
try:
    from doc_generator import DocumentGenerator 
    from agent import LegalAIAgent
    from retriever import Retriever 
    from scheduler import start_scheduler
except ImportError as e:
    print(f"⚠️ 모듈 임포트 오류 (테스트 환경에 따라 무시 가능): {e}")
    
    # 🚀 [수정됨] 문법 에러가 발생하지 않도록 정석적인 들여쓰기로 변경했습니다.
    class DocumentGenerator: 
        def generate(self, t, d): 
            return f"별표 배경 {t} 초안"
            
    class LegalAIAgent: 
        def __init__(self): 
            self.is_llm_active = False
            self.retriever = None
            
        def extract_live_facts(self, q): 
            return {"case_type": "더미 사건"}
            
        def ask(self, q, c): 
            return {"response": "더미 답변", "extracted_data": {}}
            
    class Retriever: 
        def search(self, q): 
            return []
            
    def start_scheduler(): 
        pass

# ==============================================================================
# 상대 경로 설정 및 네트워크 자동화 로직
# ==============================================================================

# 1. 경로 설정 (절대 경로 제거, 상대 경로 기반 탐색)
# 현재 main.py가 있는 폴더
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 

# main.py와 같은 위치에 .env 생성 (백엔드용 설정이 필요하다면)
BACKEND_ENV_PATH = os.path.join(BASE_DIR, ".env")

# main.py 기준 상대 경로로 frontend 폴더 탐색
# 구조: project_root/ -> main.py, frontend/
REACT_DIR = os.path.join(BASE_DIR, "frontend")
REACT_ENV_PATH = os.path.join(REACT_DIR, ".env")

# 데이터 저장 폴더 (기존 유지, 상대 경로화)
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
CASES_FILE = os.path.join(LOG_DIR, "cases_log.json")
WEIGHTS_FILE = os.path.join(LOG_DIR, "feedback_weights.json")

def get_current_ip():
    """현재 컴퓨터의 와이파이/랜카드 실제 내부 IP를 가져옵니다."""
    try:
        # 외부 DNS에 임시 연결하여 외부로 나가는 IP 감지 (실제 연결 안 함)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # 실패 시 localhost 반환
        return "127.0.0.1"

def update_react_env(ip, port=8000):
    """
    React 폴더의 .env 파일을 찾아 자동으로 수정합니다.
    다른 컴퓨터나 네트워크로 이동해도 이 함수가 자동으로 주소를 맞춰줍니다.
    """
    api_url = f"http://{ip}:{port}"
    
    print("\n" + "="*60)
    print(f"📡 [Network] 환경 변화 감지. 현재 IP: {ip}")
    
    # 1. React frontend 폴더 존재 확인
    if not os.path.exists(REACT_DIR):
        print(f"❌ [Error] React 폴더를 찾을 수 없습니다: {REACT_DIR}")
        print("   구조를 확인하세요: project_root/ -> main.py, frontend/")
        print("   자동 IP 싱크를 건너뜁니다.")
        print("="*60 + "\n")
        return

    # 2. .env 파일 생성 또는 덮어쓰기
    try:
        with open(REACT_ENV_PATH, "w", encoding="utf-8") as f:
            f.write(f"REACT_APP_API_URL={api_url}\n")
        print(f"✅ [System] React .env 자동 업데이트 완료: {api_url}")
        print(f"👉 [Action] 이제 React 터미널에서 'npm start'를 하세요.")
    except Exception as e:
        print(f"❌ [Error] .env 파일 쓰기 실패: {e}")
        
    print("="*60 + "\n")

# ==============================================================================

app = FastAPI(
    title="Civil Litigation AI Agent API",
    description="진화형 법률 AI 에이전트 통합 API 서버 (상대경로/자동IP 적용)",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # 카페 등 mobile 접속 테스트를 위해 와일드카드 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 인스턴스 생성 (상대 경로 적용된 변수 사용)
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

# --- Pydantic 모델 및 로직 ---

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

# --- API 엔드포인트 ---

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

# --- 실행부 (가장 중요) ---

if __name__ == "__main__": 
    # 1. 실행 전 네트워크 환경 분석 및 React 자동 설정
    current_ip = get_current_ip()
    update_react_env(current_ip)
    
    # 2. 서버 구동 정보 출력
    print("\n" + "="*60)
    print("🚀 [System] FastAPI 법률 AI 에이전트 서버 가동!")
    if hasattr(ai_agent, 'is_llm_active') and ai_agent.is_llm_active:
        print("🟢 [Status] OpenAI API Key 활성화 모드")
    else:
        print("⚪ [Status] 오프라인 테스트 모드 (LLM 불가능)")
    
    print(f"🔗 [Local Connection] http://127.0.0.1:8000")
    print(f"📡 [External/Mobile] http://{current_ip}:8000")
    print("="*60 + "\n")
    
    # 3. uvicorn 실행: host를 0.0.0.0으로 해야 외부(카페 와이파이 등)에서 접속 가능
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)