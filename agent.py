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

#load_dotenv()#이거 활성화하면 open ai api

class BriefingOutputSchema(BaseModel):
    win_probability: str = Field(description="[💡핵심 쟁점], [⚖️판례 대입], [📊예상 승소율(%)], [⚠️리스크 및 방어] 4가지 섹션으로 구성된 마크다운 형식의 상세 분석 리포트")
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
        prompt_template = """대한민국 10년 차 수석 민사 변호사로서 아래 사건을 분석하세요.

[사건 내용] {question}
[추출 사실] {facts}
[관련 법률/판례] {context}

출력 지침:
1. win_probability (승소 리포트): 아래 4가지 항목을 반드시 포함하여 마크다운으로 상세하고 날카롭게 작성하세요. 서론이나 인사말은 생략합니다.
   - 💡 핵심 쟁점: 본 사건의 승패를 가르는 가장 중요한 법적 요인
   - ⚖️ 판례/법리 대입: [관련 법률/판례]를 의뢰인의 현재 상황에 구체적으로 대입한 결과
   - 📊 예상 승소율: 객관적인 승소 가능성(%) 및 산정 근거
   - ⚠️ 리스크 및 방어: 패소할 수 있는 치명적 변수와 이를 뒤집기 위한 방어 논리
2. strategy_guide (액션 플랜): 당장 해야 할 행동을 명확한 배열 형태로 제공 (추상적 조언 절대 배제)

출력 JSON 형식:
{{
    "win_probability": "위 지침에 따른 4단 구조의 상세 리포트",
    "strategy_guide": ["카톡으로 대여금 반환 명시하여 답장 유도", "이체 내역 PDF 발급"],
    "extracted_data": {{
        "sender_name": "발신인",
        "receiver_name": "수신인",
        "title": "사건명 (예: 대여금 반환 청구)",
        "facts": "육하원칙 요약",
        "legal_basis": "민법 조항 등",
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

        # 🚀 [대폭 개선] 키워드 기반 사건 유형 분류망 확장
        case_type = "기타 손해배상 및 부당이득 반환"
        if any(w in text for w in ["빌려", "대여", "돈 안", "떼였", "못 받", "차용", "갚", "이자"]): 
            case_type = "대여금 반환 청구"
        elif any(w in text for w in ["보증금", "전세", "방 빼", "계약 만료", "안 돌려", "집주인", "임대차"]): 
            case_type = "임대차 보증금 반환"
        elif any(w in text for w in ["월세", "차임", "연체", "명도", "나가라", "미납", "세입자", "비워"]): 
            case_type = "차임(월세) 연체 및 명도 소송"
        elif any(w in text for w in ["다쳤", "사고", "치료비", "입원", "폭행", "상해", "때렸", "맞았", "교통사고", "합의금"]): 
            case_type = "손해배상 청구 (불법행위/신체상해)"
        elif any(w in text for w in ["욕", "악플", "모욕", "명예훼손", "허위사실", "소문", "댓글", "게시판"]): 
            case_type = "명예훼손 및 모욕 위자료 청구"
        elif any(w in text for w in ["사기", "보이스피싱", "속았", "먹튀", "환불", "중고나라", "당근", "사기꾼"]): 
            case_type = "사기 피해에 따른 부당이득 반환 및 손해배상"
        elif any(w in text for w in ["이혼", "바람", "외도", "상간", "양육비", "재산분할", "불륜"]): 
            case_type = "이혼 및 위자료 청구"
        elif any(w in text for w in ["소음", "층간", "시끄러", "발망치", "윗집", "아랫집", "누수", "물새"]): 
            case_type = "이웃분쟁 (층간소음/누수) 손해배상"
        elif any(w in text for w in ["임금", "퇴직금", "월급", "수당", "노동청", "해고", "알바", "사장님"]): 
            case_type = "임금 및 퇴직금 체불 진정"

        return {
            "when": when,
            "amount": amount,
            "person": person,
            "case_type": case_type
        }

    def get_institutions(self, query: str):
        region = "대구"
        regions = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "수원", "창원", "청주", "전주", "제주"]
        for r in regions:
            if r in query:
                region = r
                break

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
                    results1 = list(ddgs.text(f"대한법률구조공단 {region}지부 전화번호", max_results=1))
                    if results1:
                        snippet1 = results1[0].get('body', '')
                        phones1 = re.findall(r'\d{2,3}-\d{3,4}-\d{4}', snippet1)
                        if phones1:
                            institutions[0]["phone"] = phones1[0]
                        institutions[0]["search_info"] = (snippet1[:60] + "..")

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
        case_type = facts.get("case_type") or "기타 사건"
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

        win_prob = f"**{case_type}** 사안으로 판단됩니다.\n\n정확한 쟁점 파악을 위해서는 관련 증거자료 수집이 필수적입니다.{rag_add_on}"
        strategy = [
            "구체적인 피해 사실(일시, 장소, 상대방 등)을 다시 적어보기",
            "상대방의 인적 사항(이름, 연락처, 주소지) 파악하기",
            "통화녹음, 카카오톡 캡처본 등 객관적 증거 확보하기"
        ]
        extracted = {
            "title": f"{case_type} 및 법적 조치 예고",
            "facts": f"- 귀하({person})와의 관계에서 {when} 경 분쟁이 발생함\n- 관련된 사항에 대해 명확한 책임을 요구함",
            "legal_basis": "관련 법률 검토 및 판례 대입 필요",
            "demands": f"본 서면 수령 후 즉시 연락을 취하고 {amount} 상당의 조치를 이행할 것",
        }

        extracted_data = {
            "sender_name": "발신인 (본인)",
            "sender_address": "발신인 주소지 기재",
            "sender_phone": "010-XXXX-XXXX",
            "receiver_name": person,
            "receiver_address": "수신인 주소지 기재",
            "deadline": "본 서면 수령 후 7일 이내"
        }
        extracted_data.update(extracted)

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
                    context_full_str = "\n\n".join([f"{res['title']}\n{res['content']}" for res in search_results])
                    context = context_full_str[:1500] 
                
                result = self.chain.invoke({
                    "context": context, 
                    "facts": facts_str,
                    "question": query
                })
                return result
            except Exception as e:
                print(f"🚨 LLM 실행 실패, Fallback 파서 작동: {e}")
                return self._fallback_parser(query, search_results)
        else:
            return self._fallback_parser(query, search_results)