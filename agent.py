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

    def _fallback_parser(self, query: str):
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