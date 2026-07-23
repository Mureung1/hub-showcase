import os
import json
import re
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

# 🚀 [개선 1] 출력 스키마 설명 구체화 (LLM이 육하원칙과 판례를 반드시 엮도록 유도)
class BriefingOutputSchema(BaseModel):
    win_probability: str = Field(description="[육하원칙] 사실관계와 [검색된 판례]를 직접 인용하여 작성한 승소율 및 리스크 분석")
    strategy_guide: str = Field(description="[검색된 법령] 조항을 근거로 변호사 미팅 전 챙겨야 할 필수 증거 및 행동 지침")
    extracted_data: dict = Field(description="발신인, 수신인, 사실관계(5W1H) 등 문서 템플릿용 파싱 데이터")

class LegalAIAgent:
    def __init__(self):
        print("🤖 진화형 법률 에이전트 추론 엔진 초기화 중...")
        self.retriever = None 

        self.api_key = os.getenv("OPENAI_API_KEY", "sk-placeholder")
        if self.api_key.startswith("sk-") and len(self.api_key) > 20:
            print("🔥 [Reasoning] OpenAI LLM 활성화 - 토큰 최적화 프롬프트 가동")
            self.llm = ChatOpenAI(model_name="gpt-4o", temperature=0.1) # 온도를 낮춰 팩트 기반(할루시네이션 방지) 유도
            self.parser = JsonOutputParser(pydantic_object=BriefingOutputSchema)
            self.setup_llm_chain()
            self.is_llm_active = True
        else:
            print("📢 [Perception] API Key 미검출 - 토큰 0원(오프라인) RAG 융합 모드로 작동")
            self.is_llm_active = False

    def setup_llm_chain(self):
        # 🚀 [개선 2] 프롬프트에 무료로 뽑아낸 '육하원칙' 변수를 추가하여 LLM의 연산 낭비 방지
        prompt_template = """당신은 대한민국 민사소송 전문 수석 변호사 AI입니다. 
당신의 목표는 의뢰인의 상황을 분석하여 가장 현실적인 법률 전략을 세우는 것입니다.

[의뢰인 사건 내용]
{question}

[무료 파서가 사전 추출한 사실관계 (육하원칙)]
{facts}

[관련 법률 및 판례 검색 결과]
{context}

출력 지침 (매우 중요):
1. win_probability: 답변 시 반드시 "[추출된 사실관계]에 따르면..." 과 같이 구체적 상황을 짚어주고, 검색된 [판례 번호나 내용]을 인용하여 리스크를 분석하세요.
2. strategy_guide: 검색된 [법령(예: 민법 제O조)]을 명시하며, 상대방의 예상 반박에 대비할 수 있는 확실한 증거 수집 전략을 조언하세요.
3. 사실관계(facts)가 부족하면 어떤 정보가 더 필요한지 안내하세요.

출력 양식:
{{
    "win_probability": "육하원칙과 판례를 융합한 승소 가능성 및 법적 진단 (3~4문장)",
    "strategy_guide": "법령에 근거한 구체적인 증거 확보 및 행동 요령 (3~4문장)",
    "extracted_data": {{
        "sender_name": "...",
        "receiver_name": "...",
        "title": "사건명 (예: 대여금 반환 청구)",
        "facts": "육하원칙에 기반한 사실관계 요약 (개조식)",
        "legal_basis": "관련 법령",
        "demands": "요구사항",
        "deadline": "기한"
    }}
}}
"""
        self.prompt = ChatPromptTemplate.from_template(prompt_template)
        self.chain = self.prompt | self.llm | self.parser

    def extract_live_facts(self, text: str):
        # 기존과 동일한 0원짜리 정규식 파서 유지
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

    def _fallback_parser(self, query: str, search_results: list = None):
        """
        🚀 [개선 3] 토큰 0원 모드에서도 로컬에서 검색된 법령/판례를 텍스트에 동적으로 융합합니다.
        이제 과금 없이도 전문가처럼 보이는 답변을 생성합니다.
        """
        facts = self.extract_live_facts(query)
        
        case_type = facts.get("case_type") or ""
        amount = facts.get("amount") or "일금 [금액 기재] 원"
        person = facts.get("person") or "수신인(상대방)"
        when = facts.get("when") or "최근"

        # 로컬 검색 결과를 동적 문자열로 조합 (0원)
        rag_add_on = ""
        if search_results:
            top_law = next((res for res in search_results if "법령" in res['title']), None)
            top_prec = next((res for res in search_results if "판례" in res['title']), None)
            
            rag_add_on += "\n\n📌 **[AI 참고 자료]**\n"
            if top_law:
                rag_add_on += f"본 사안은 {top_law['title']}의 적용을 받을 수 있습니다.\n"
            if top_prec:
                rag_add_on += f"유사한 {top_prec['title']}에 비추어 볼 때 법리적 검토가 필요합니다."

        win_prob = ""
        strategy = ""

        # 템플릿 매핑 사전 (rag_add_on을 융합)
        if "대여금" in case_type:
            win_prob = f"{when}에 발생한 대여 건의 경우, 차용증이 없더라도 이체 내역 및 대화 캡처본이 있다면 입증이 가능합니다.{rag_add_on}"
            strategy = f"상대방({person})이 '증여(그냥 준 돈)'라고 주장할 것에 대비하여 독촉 내역을 지참하십시오."
            extracted = {
                "title": "대여금 반환 촉구 및 법적 조치 예고",
                "facts": f"- {when} 경 귀하({person})에게 {amount}을 대여함\n- 변제기가 지났음에도 반환하지 않음",
                "legal_basis": "민법 제598조(소비대차) 및 제390조(채무불이행)",
                "demands": f"본 서면 수령 후 7일 이내에 {amount}을 반환할 것을 촉구함",
            }
        elif "보증금" in case_type:
            win_prob = f"계약 만료 통보 내역이 확실하다면 무난히 승소 가능합니다.{rag_add_on}"
            strategy = "내용증명 발송 후에도 반환하지 않으면, 즉시 임차권등기명령을 신청할 준비를 하십시오."
            extracted = {
                "title": "임대차계약 종료에 따른 임대차보증금 반환 촉구",
                "facts": f"- {when} 임대차 계약 만료일이 도래함\n- 현재까지 보증금 {amount}을 반환받지 못함",
                "legal_basis": "주택임대차보호법 제3조의2(보증금의 회수)",
                "demands": f"기일까지 보증금 {amount} 일체를 반환할 것을 촉구함",
            }
        elif "차임" in case_type or "명도" in case_type:
            win_prob = f"2기 이상의 차임 연체 사실만 입증되면 명도 소송에서 승소 가능합니다.{rag_add_on}"
            strategy = "점유이전금지가처분을 먼저 신청하여, 소송 중 임차인이 짐을 빼는 것을 방어해야 합니다."
            extracted = {
                "title": "차임(월세) 미납에 따른 계약 해지 통고 및 명도 촉구",
                "facts": f"- 귀하({person})는 차임을 2기 이상 연체 중임\n- 미납된 총 금액은 {amount}에 달함",
                "legal_basis": "민법 제640조(차임연체와 해지)",
                "demands": f"밀린 차임 {amount}을 즉시 입금하고 목적물을 인도할 것을 요구함",
            }
        elif "손해배상" in case_type:
            win_prob = f"진단서와 수사 결과 통지서가 있다면 민사 손해배상 청구 인용 가능성이 높습니다.{rag_add_on}"
            strategy = "치료비 영수증과 정신적 고통을 입증할 자료(정신과 진료 등)를 모아두세요."
            extracted = {
                "title": "불법행위로 인한 손해배상 청구",
                "facts": f"- {when} 경 귀하({person})의 행위로 피해가 발생함\n- 이로 인해 치료비 및 위자료가 발생하였음",
                "legal_basis": "민법 제750조(불법행위의 내용)",
                "demands": f"손해배상금 {amount}을 배상할 것을 촉구함",
            }
        else:
            win_prob = f"입력하신 정보만으로는 정확한 진단이 어렵습니다.{rag_add_on}"
            strategy = "구체적인 피해 사실(일시, 상대방 등)을 육하원칙으로 다시 적어주시면 정확한 분석이 가능합니다."
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
        # 🚀 [개선 4] LLM을 호출하기 전에 무료 파서로 육하원칙을 미리 추출합니다.
        pre_extracted_facts = self.extract_live_facts(query)
        facts_str = f"일시: {pre_extracted_facts.get('when', '미상')}\n대상: {pre_extracted_facts.get('person', '미상')}\n금액: {pre_extracted_facts.get('amount', '미상')}\n사건유형: {pre_extracted_facts.get('case_type', '미상')}"

        if self.is_llm_active:
            try:
                context = ""
                if search_results:
                    context = "\n\n".join([f"{res['title']}\n{res['content']}" for res in search_results])
                
                # LLM 프롬프트에 미리 뽑아둔 육하원칙(facts_str)을 함께 던져줌 (비용 및 연산 절약)
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