import os
import json
import re
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# 🚀 랭체인 우회: duckduckgo_search 라이브러리 직접 임포트
try:
    from duckduckgo_search import DDGS
    ddg_available = True
    print("🌐 [Web Search] DuckDuckGo 검색 엔진 연동 성공!")
except ImportError:
    ddg_available = False
    print("⚠️ duckduckgo_search 모듈이 임포트되지 않았습니다. 'pip install duckduckgo-search'를 실행하세요.")

load_dotenv()  #이거 활성화 해야 open ai api호출

class BriefingOutputSchema(BaseModel):
    win_probability: str = Field(description="마크다운 리스트와 굵은 글씨를 활용하여 작성한 상세한 승소 가능성 및 법적 쟁점 분석")
    strategy_guide: list = Field(description="프론트엔드 체크리스트용. '지금 당장 해야 할 일'을 단계별로 쪼갠 문자열 배열(List)")
    extracted_data: dict = Field(description="발신인, 수신인, 사실관계(5W1H) 등 문서 템플릿용 파싱 데이터")

class LegalAIAgent:
    def __init__(self):
        print("🤖 진화형 법률 에이전트 추론 엔진 초기화 중...")
        self.retriever = None 

        self.api_key = os.getenv("OPENAI_API_KEY", "sk-placeholder")
        if self.api_key.startswith("sk-") and len(self.api_key) > 20:
            print("🔥 [Reasoning] OpenAI LLM 활성화 - 토큰 최적화 프롬프트 가동")
            self.llm = ChatOpenAI(model_name="gpt-4o", temperature=0.3) 
            self.parser = JsonOutputParser(pydantic_object=BriefingOutputSchema)
            self.setup_llm_chain()
            self.is_llm_active = True
        else:
            print("📢 [Perception] API Key 미검출 - 토큰 0원(오프라인) RAG 융합 모드로 작동")
            self.is_llm_active = False

    def setup_llm_chain(self):
        prompt_template = """당신은 대한민국 10년 차 수석 민사 변호사 AI입니다. 
당신의 목표는 의뢰인의 억울한 상황에 공감하면서도, 가장 날카롭고 현실적인 법률 전략을 제시하는 것입니다.

[의뢰인 사건 내용]
{question}

[무료 파서가 사전 추출한 사실관계 (육하원칙)]
{facts}

[관련 법률 및 판례 검색 결과]
{context}

출력 지침 (매우 중요):
1. 공감과 전문성: 의뢰인의 답답한 마음에 공감하는 따뜻한 어조를 유지하되, 법적 진단은 객관적이고 단호하게 하세요.
2. win_probability (리스크 분석): 
   - 단순히 판례를 나열하지 마세요. 
   - "의뢰인의 현재 사실관계"를 "검색된 판례의 기준"에 대입하여 논리적으로 분석하세요.
   - 글머리 기호(-)와 굵은 글씨(**)를 적극 활용하여 가독성을 높이세요.
3. strategy_guide (액션 플랜): 
   - 추상적인 조언은 금지입니다. 
   - 반드시 사용자가 즉시 실천할 수 있는 행동 지침을 짧은 문장들의 '배열(List)'로 출력하세요.

출력 양식 (반드시 아래 JSON 키를 준수할 것):
{{
    "win_probability": "(마크다운 형식) 구체적 쟁점 분석 및 승소 가능성 진단",
    "strategy_guide": [
        "상대방에게 '언제까지 돈을 갚을 거냐'고 묻는 카톡 보내기",
        "관련 계좌 이체 내역 PDF로 다운로드 받기"
    ],
    "extracted_data": {{
        "sender_name": "...",
        "receiver_name": "...",
        "title": "사건명 (예: 대여금 반환 청구)",
        "facts": "육하원칙에 기반한 사실관계 요약 (개조식)",
        "legal_basis": "관련 법령 (예: 민법 제598조)",
        "demands": "요구사항",
        "deadline": "기한"
    }}
}}
"""
        self.prompt = ChatPromptTemplate.from_template(prompt_template)
        self.chain = self.prompt | self.llm | self.parser

    def extract_live_facts(self, text: str):
        when = ""
        date_patterns = [
            r'(?:20\d{2}[년\.\-\/]\s*)?\d{1,2}[월\.\-\/]\s*\d{1,2}일?', 
            r'어제|오늘|내일|작년|올해|내년|지난\s*달|이번\s*달'
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                when = match.group(0)
                break

        amount = ""
        amount_patterns = [
            r'(\d+(?:,\d{3})*(?:만\s*원|원|만))',
            r'([일이삼사오육칠팔구십백천]+만\s*원)',
            r'(\d+[백천]만\s*원?)'
        ]
        for pattern in amount_patterns:
            match = re.search(pattern, text)
            if match:
                amount = match.group(0)
                break

        person = ""
        person_match = re.search(r'([가-힣]{2,4})(?:에게|한테|이|가|께서|은|는)', text)
        if person_match and not any(w in person_match.group(1) for w in ["본인", "제가", "내가", "사장", "주인"]):
            person = person_match.group(1)

        case_type = ""
        if any(w in text for w in ["빌려", "대여", "돈 안", "떼였", "못 받", "차용"]): 
            case_type = "대여금 반환 청구"
        elif any(w in text for w in ["보증금", "전세", "방 빼", "계약 만료", "안 돌려"]): 
            case_type = "임대차 보증금 반환"
        elif any(w in text for w in ["월세", "차임", "연체", "명도", "나가라", "미납"]): 
            case_type = "차임(월세) 연체 및 명도 소송"
        elif any(w in text for w in ["다쳤", "사고", "치료비", "입원", "폭행", "상해", "때렸", "맞았"]): 
            case_type = "손해배상 청구 (불법행위/신체상해)"
        elif any(w in text for w in ["욕", "악플", "모욕", "명예훼손", "허위사실", "소문"]): 
            case_type = "명예훼손 및 모욕 위자료 청구"
        elif any(w in text for w in ["사기", "보이스피싱", "속았", "먹튀", "환불"]): 
            case_type = "사기 피해에 따른 부당이득 반환 및 손해배상"
        elif any(w in text for w in ["이혼", "바람", "외도", "상간", "양육비"]): 
            case_type = "이혼 및 위자료 청구"
        elif any(w in text for w in ["소음", "층간", "시끄러"]): 
            case_type = "층간소음 생활방해 손해배상"

        return {
            "when": when,
            "amount": amount,
            "person": person,
            "case_type": case_type
        }

    # 🚀 웹 검색 기반 위치 및 연락처 추출 로직 (직접 호출 방식)
    def get_institutions(self, query: str):
        region = "대구" # 기본 관할지
        regions = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "수원", "창원", "청주", "전주", "제주"]
        for r in regions:
            if r in query:
                region = r
                break

        # 기본 기관 템플릿
        institutions = [
            {
                "name": f"대한법률구조공단 {region}지부",
                "type": "무료 법률상담 및 소송지원",
                "phone": "국번없이 132",
                "search_info": ""
            },
            {
                "name": f"{region}지방법원 종합민원실",
                "type": "소장 접수 및 절차 안내",
                "phone": "대한민국 법원 대표전화 02-3480-1100",
                "search_info": ""
            }
        ]

        if ddg_available:
            try:
                with DDGS() as ddgs:
                    # 1. 구조공단 검색
                    results1 = list(ddgs.text(f"대한법률구조공단 {region}지부 전화번호", max_results=1))
                    if results1:
                        snippet1 = results1[0].get('body', '')
                        phones1 = re.findall(r'\d{2,3}-\d{3,4}-\d{4}', snippet1)
                        if phones1:
                            institutions[0]["phone"] = phones1[0]
                        institutions[0]["search_info"] = (snippet1[:60] + "..")

                    # 2. 지방법원 검색
                    results2 = list(ddgs.text(f"{region}지방법원 종합민원실 전화번호", max_results=1))
                    if results2:
                        snippet2 = results2[0].get('body', '')
                        phones2 = re.findall(r'\d{2,3}-\d{3,4}-\d{4}', snippet2)
                        if phones2:
                            institutions[1]["phone"] = phones2[0]
                        institutions[1]["search_info"] = (snippet2[:60] + "..")
            except Exception as e:
                print(f"웹 검색 중 오류 발생: {e}")

        return institutions

    def _fallback_parser(self, query: str, search_results: list = None):
        facts = self.extract_live_facts(query)
        
        case_type = facts.get("case_type") or ""
        amount = facts.get("amount") or "일금 [금액 기재] 원"
        person = facts.get("person") or "수신인(상대방)"
        when = facts.get("when") or "최근"

        rag_add_on = ""
        if search_results:
            top_law = next((res for res in search_results if "법령" in res['title']), None)
            top_prec = next((res for res in search_results if "판례" in res['title']), None)
            
            rag_add_on += "\n\n📌 **[AI 참고 자료]**\n"
            if top_law:
                rag_add_on += f"- 적용 가능 법령: {top_law['title']}\n"
            if top_prec:
                rag_add_on += f"- 유사 판례 기준: {top_prec['title']}"

        win_prob = ""
        strategy = []

        if "대여금" in case_type:
            win_prob = f"**{when}**에 발생한 대여 건의 경우, 차용증이 없더라도 **이체 내역 및 대화 캡처본**이 있다면 입증이 가능합니다.{rag_add_on}"
            strategy = [
                f"상대방({person})에게 빌려준 돈임을 명시하여 카톡을 보내고 답장 유도하기",
                "이체 내역을 은행 어플에서 PDF로 발급받기",
                "내용증명을 발송하여 심리적 압박 및 법적 기한 확정하기"
            ]
            extracted = {
                "title": "대여금 반환 촉구 및 법적 조치 예고",
                "facts": f"- {when} 경 귀하({person})에게 {amount}을 대여함\n- 변제기가 지났음에도 반환하지 않음",
                "legal_basis": "민법 제598조(소비대차) 및 제390조(채무불이행)",
                "demands": f"본 서면 수령 후 7일 이내에 {amount}을 반환할 것을 촉구함",
            }
        elif "보증금" in case_type:
            win_prob = f"계약 만료 통보 내역이 확실하다면 무난히 승소 가능합니다.{rag_add_on}"
            strategy = [
                "문자나 통화 녹음으로 계약 해지 통보 내역 증빙 확보하기",
                "임차권등기명령 신청에 필요한 3가지 필수 서류 준비하기",
                "관할 법원에 임차권등기명령 신청 접수하기"
            ]
            extracted = {
                "title": "임대차계약 종료에 따른 임대차보증금 반환 촉구",
                "facts": f"- {when} 임대차 계약 만료일이 도래함\n- 현재까지 보증금 {amount}을 반환받지 못함",
                "legal_basis": "주택임대차보호법 제3조의2(보증금의 회수)",
                "demands": f"기일까지 보증금 {amount} 일체를 반환할 것을 촉구함",
            }
        elif "차임" in case_type or "명도" in case_type:
            win_prob = f"2기 이상의 차임 연체 사실만 입증되면 명도 소송에서 승소 가능합니다.{rag_add_on}"
            strategy = [
                "점유이전금지가처분을 법원에 가장 먼저 신청하여 방어선 구축하기",
                "미납된 차임(월세) 연체 내역 통장 사본 정리하기",
                "내용증명 발송으로 임대차 계약 해지를 명확히 통보하기"
            ]
            extracted = {
                "title": "차임(월세) 미납에 따른 계약 해지 통고 및 명도 촉구",
                "facts": f"- 귀하({person})는 차임을 2기 이상 연체 중임\n- 미납된 총 금액은 {amount}에 달함",
                "legal_basis": "민법 제640조(차임연체와 해지)",
                "demands": f"밀린 차임 {amount}을 즉시 입금하고 목적물을 인도할 것을 요구함",
            }
        else:
            win_prob = f"입력하신 정보만으로는 정확한 진단이 어렵습니다.{rag_add_on}"
            strategy = [
                "구체적인 피해 사실(일시, 상대방 등)을 육하원칙으로 다시 적어 질문하기",
                "상대방의 이름, 연락처, 주소지 등 인적 사항 파악하기",
                "가지고 있는 증거(카톡, 녹취록 등)를 날짜별로 정리하기"
            ]
            extracted = {
                "title": "법적 조치 예고 및 의무 이행 촉구서",
                "facts": f"- 귀하({person})와의 관계에서 {when} 경 법적 분쟁 사유가 발생함",
                "legal_basis": "관련 법률 및 판례 검토 요망",
                "demands": f"신속히 사안을 해결하고 {amount} 상당의 조치를 취할 것을 요구함",
            }

        if extracted:
            extracted_data = {
                "sender_name": "발신인 (본인)",
                "sender_address": "발신인 주소지 기재",
                "sender_phone": "010-XXXX-XXXX",
                "receiver_name": person,
                "receiver_address": "수신인 주소지 기재",
                "deadline": "본 서면 수령 후 7일 이내"
            }
            extracted_data.update(extracted)
        else:
            extracted_data = None

        return {
            "win_probability": win_prob,
            "strategy_guide": strategy,
            "extracted_data": extracted_data
        }

    def ask(self, query: str, search_results: list = None):
        pre_extracted_facts = self.extract_live_facts(query)
        facts_str = f"일시: {pre_extracted_facts.get('when', '미상')}\n대상: {pre_extracted_facts.get('person', '미상')}\n금액: {pre_extracted_facts.get('amount', '미상')}\n사건유형: {pre_extracted_facts.get('case_type', '미상')}"

        if self.is_llm_active:
            try:
                context = ""
                if search_results:
                    context = "\n\n".join([f"{res['title']}\n{res['content']}" for res in search_results])
                
                result = self.chain.invoke({
                    "context": context, 
                    "facts": facts_str,
                    "question": query
                })
                return result
            except Exception as e:
                print(f"🚨 LLM 실행 실패, Fallback(0원) 파서 작동: {e}")
                return self._fallback_parser(query, search_results)
        else:
            return self._fallback_parser(query, search_results)