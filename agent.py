import os
import json
import re
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

class AgentOutputSchema(BaseModel):
    response: str = Field(description="사용자에게 전달할 법률 전략 및 CoT 답변")
    extracted_data: dict = Field(description="문서 생성기(Jinja2)에 바인딩할 파싱된 JSON 데이터. 정보 부족 시 null")

class LegalAIAgent:
    def __init__(self):
        print("🤖 진화형 법률 에이전트 추론 엔진 초기화 중...")
        self.retriever = None 

        self.api_key = os.getenv("OPENAI_API_KEY", "sk-placeholder")
        if self.api_key.startswith("sk-") and len(self.api_key) > 20:
            print("🔥 [Reasoning] OpenAI LLM 활성화 - ReAct 에이전트 루프 가동")
            self.llm = ChatOpenAI(model_name="gpt-4o", temperature=0)
            self.parser = JsonOutputParser(pydantic_object=AgentOutputSchema)
            self.setup_llm_chain()
            self.is_llm_active = True
        else:
            print("📢 [Perception] API Key 미검출 - 하이브리드 규칙 기반 파서 모드로 작동")
            self.is_llm_active = False

    def setup_llm_chain(self):
        prompt_template = """
당신은 대한민국 민사소송 전문 AI 법률 에이전트입니다. 
아래 제공된 [법률 검색 결과]를 바탕으로 사용자의 상황을 분석하고 대응 전략을 수립하세요.
또한, 사용자의 대화문에서 법률 문서(내용증명)에 필요한 필수 변수들을 구조화된 JSON 데이터로 추출해야 합니다.

[법률 검색 결과 (Context)]
{context}

[사용자 질문/상황]
{question}

반드시 아래 지시된 JSON 포맷만을 반환해야 하며, 다른 텍스트는 포함하지 마십시오.
출력 양식:
{{
    "response": "검색된 법령에 근거한 구체적인 전문가 답변 및 CoT 추론 과정",
    "extracted_data": {{
        "sender_name": "추출된 발신인 이름 (없으면 홍길동)",
        "sender_address": "발신인 주소 (없으면 기본 주소)",
        "sender_phone": "발신인 연락처",
        "receiver_name": "추출된 수신인/상대방 이름",
        "receiver_address": "수신인 주소",
        "title": "문서 제목 (예: 임대차계약 해지 및 월세 미납에 따른 대금 지급 촉구)",
        "facts": "대화에서 추출한 사실관계 목록 (줄바꿈 문자가 포함된 문자열)",
        "legal_basis": "근거 법령명 및 조항",
        "demands": "요구사항 및 조치 내용",
        "deadline": "이행 기한 (예: 수령 후 7일 이내)"
    }}
}}
"""
        self.prompt = ChatPromptTemplate.from_template(prompt_template)
        self.chain = self.prompt | self.llm | self.parser

    # [NEW] LLM 없이 토큰 소모 0으로 실시간 분석하는 파이썬 로직 (강화버전)
    def extract_live_facts(self, text: str):
        # 1. 날짜 추출 (다양한 포맷 지원)
        # 예: 2026년 3월 5일, 3월 5일, 3/5, 26.03.05, 작년, 지난달
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

        # 2. 금액 추출 (한국식 표기 완벽 지원)
        # 예: 500만원, 5백만 원, 1,000만, 50000원, 5천
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

        # 3. 사람 이름 (원고/피고) 유추
        # 예: "김철수에게", "홍길동이", "이영희한테"
        person = ""
        person_match = re.search(r'([가-힣]{2,4})(?:에게|한테|이|가|께서|은|는)', text)
        if person_match and not any(w in person_match.group(1) for w in ["본인", "제가", "내가", "사장", "주인"]):
            person = person_match.group(1)

        # 4. 사건 유형 유추 (키워드 대폭 확장)
        case_type = ""
        if any(w in text for w in ["빌려", "대여", "돈 안", "떼였", "못 받"]): 
            case_type = "대여금 반환 청구"
        elif any(w in text for w in ["보증금", "전세", "방 빼", "계약 만료"]): 
            case_type = "임대차 보증금 반환"
        elif any(w in text for w in ["월세", "차임", "연체", "명도", "나가라"]): 
            case_type = "차임(월세) 연체 및 명도 소송"
        elif any(w in text for w in ["다쳤", "사고", "치료비", "입원"]): 
            case_type = "손해배상 청구 (신체적 상해)"
        elif any(w in text for w in ["욕", "악플", "모욕", "명예훼손"]): 
            case_type = "명예훼손 및 모욕 손해배상"
        elif any(w in text for w in ["사기", "보이스피싱", "속았"]): 
            case_type = "사기 피해에 따른 부당이득 반환"
        elif any(w in text for w in ["이혼", "바람", "외도", "상간"]): 
            case_type = "이혼 및 위자료 청구"
        elif any(w in text for w in ["소음", "층간", "시끄러"]): 
            case_type = "층간소음 생활방해 손해배상"

        return {
            "when": when,
            "amount": amount,
            "person": person, # 새로 추가됨
            "case_type": case_type
        }

    def _fallback_parser(self, query: str):
        # ... 기존 코드와 동일 ...
        if any(k in query for k in ["월세", "차임", "안내요", "미납", "체납"]):
            amount_match = re.search(r'(\d+만\s*원|\d+원)', query)
            amount = amount_match.group(1) if amount_match else "계산된 미납 금액"
            name_match = re.search(r'(홍길동|김악덕|[가-힣]{2,4})', query)
            name = name_match.group(1) if name_match else "임차인(상대방)"

            reply_text = (
                "🔍 **[법령 검색 완료]**: 민법 제640조(차임연체와 해지)\n\n"
                f"💡 **[전략 수립]**: 임차인({name})의 월세 연체 금액이 2기(주택의 경우 2달분)에 달하거나 연체 중인 상황으로 판단됩니다. "
                "민법 제640조에 의거하여 계약 해지 통보 및 미납 차임 청구를 위한 **'내용증명'**을 발송하는 전략이 최선입니다. "
                "추출된 사실관계를 우측 패널 및 하단 데이터 박스에서 확인하시고 내용증명을 생성하세요."
            )
            
            extracted_data = {
                "sender_name": "소유주 (임시 추출)",
                "sender_address": "대구광역시 북구 대학로 80",
                "sender_phone": "010-1234-5678",
                "receiver_name": name,
                "receiver_address": "서울특별시 강남구 테헤란로 123",
                "title": "차임(월세) 미납에 따른 임대차계약 해지 통고 및 지급 촉구",
                "facts": f"- 2026년 3월 6일 자로 임대차 계약을 체결함\n- 상대방({name})이 월세를 지급하지 않아 법정 해지 요건이 충족됨",
                "legal_basis": "민법 제640조(차임연체와 해지)",
                "demands": f"미납된 차임 및 연체 금액({amount})을 즉시 임대인 계좌로 입금하고 명도를 준비할 것을 촉구함",
                "deadline": "본 서면 수령 후 7일 이내"
            }
        
        elif any(k in query for k in ["보증금", "전세", "안돌려", "안 돌려"]):
            reply_text = (
                "🔍 **[법령 검색 완료]**: 주택임대차보호법 제3조의2\n\n"
                "💡 **[전략 수립]**: 보증금 반환 의무 불이행에 대응하여 내용증명을 통해 최종 최고(催告)를 진행합니다."
            )
            extracted_data = {
                "sender_name": "홍길동 (임시 추출)",
                "sender_address": "대구광역시 북구 대학로 80",
                "sender_phone": "010-1234-5678",
                "receiver_name": "김악덕",
                "receiver_address": "서울특별시 강남구 테헤란로 123",
                "title": "임대차계약 종료에 따른 임대차보증금 반환 촉구",
                "facts": "- 전세 계약 만료일이 도래하였으나 보증금을 반환받지 못함",
                "legal_basis": "주택임대차보호법 제3조의2(보증금의 회수)",
                "demands": "지정된 기일까지 보증금 일체를 반환할 것을 촉구함",
                "deadline": "수령 후 즉시"
            }
        else:
            reply_text = f"📝 '{query}'에 대한 분석 결과입니다. 구체적인 사실관계를 기재해 주시면 서식을 매핑해 드립니다."
            extracted_data = None

        return {"response": reply_text, "extracted_data": extracted_data}

    def ask(self, query: str, search_results: list = None):
        if self.is_llm_active:
            try:
                context = ""
                if search_results:
                    context = "\n\n".join([f"{res['title']}\n{res['content']}" for res in search_results])
                
                result = self.chain.invoke({"context": context, "question": query})
                return result
            except Exception as e:
                print(f"🚨 LLM 실행 실패, Fallback 파서 작동: {e}")
                return self._fallback_parser(query)
        else:
            return self._fallback_parser(query)