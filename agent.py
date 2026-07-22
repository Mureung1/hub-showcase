import os
import json
import re
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

# 🚀 [핵심] 문서 작성이 아닌 '분석'에 초점을 맞춘 새로운 스키마
class BriefingOutputSchema(BaseModel):
    win_probability: str = Field(description="판례 기반 예상 승소율 및 리스크 (예: 승소 가능성 높음, 증거 부족 시 패소 리스크 존재)")
    strategy_guide: str = Field(description="사용자가 변호사 상담 전 준비해야 할 필수 증거 및 전략 조언")
    extracted_data: dict = Field(description="발신인, 수신인, 사실관계(5W1H) 등 문서 템플릿용 파싱 데이터")

class LegalAIAgent:
    def __init__(self):
        print("🤖 진화형 법률 에이전트 추론 엔진 초기화 중...")
        self.retriever = None 

        self.api_key = os.getenv("OPENAI_API_KEY", "sk-placeholder")
        if self.api_key.startswith("sk-") and len(self.api_key) > 20:
            print("🔥 [Reasoning] OpenAI LLM 활성화 - ReAct 에이전트 루프 가동")
            self.llm = ChatOpenAI(model_name="gpt-4o", temperature=0)
            self.parser = JsonOutputParser(pydantic_object=BriefingOutputSchema)
            self.setup_llm_chain()
            self.is_llm_active = True
        else:
            print("📢 [Perception] API Key 미검출 - 하이브리드 규칙 기반 파서 모드로 작동")
            self.is_llm_active = False

    def setup_llm_chain(self):
        prompt_template = """
당신은 대한민국 민사소송 전문 수석 변호사 AI입니다. 
당신의 역할은 문서를 대신 써주는 것이 아닙니다. 
제공된 [법률/판례 검색 결과]를 분석하여 의뢰인의 [승소 가능성]을 진단하고, 
변호사 상담 시 제출할 [사실관계(5W1H) 요약 데이터]를 추출하는 것입니다.

[법률 및 판례 검색 결과]
{context}

[의뢰인 상황]
{question}

출력 양식:
{{
    "win_probability": "검색된 판례를 바탕으로 한 예상 승소 리스크 분석 (3문장 이내)",
    "strategy_guide": "변호사 미팅 전 반드시 챙겨야 할 증거 목록 및 조언",
    "extracted_data": {{
        "sender_name": "...",
        "receiver_name": "...",
        "title": "사건명 (예: 대여금 반환 청구)",
        "facts": "육하원칙(언제, 어디서, 누가, 무엇을)에 기반한 사실관계 요약 (개조식)",
        "legal_basis": "관련 법령",
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

    def _fallback_parser(self, query: str):
        """
        🚀 LLM 통신 실패 시(또는 토큰 0 모드), 하드코딩된 조건문 대신 
        extract_live_facts()에서 뽑아낸 데이터를 활용하여 '동적 템플릿'을 반환합니다.
        """
        facts = self.extract_live_facts(query)
        
        case_type = facts.get("case_type") or ""
        amount = facts.get("amount") or "일금 [금액 기재] 원"
        person = facts.get("person") or "수신인(상대방)"
        when = facts.get("when") or "최근"

        win_prob = ""
        strategy = ""

        # 템플릿 매핑 사전
        if "대여금" in case_type:
            win_prob = "차용증이 없더라도 이체 내역 및 카카오톡 대화 캡처본이 있다면 대여 사실 입증이 가능하여 승소 확률이 높습니다."
            strategy = "상대방이 '증여(그냥 준 돈)'라고 주장할 것에 대비하여, 돈을 갚으라고 독촉한 대화 내역을 반드시 지참하십시오."
            extracted = {
                "title": "대여금 반환 촉구 및 법적 조치 예고",
                "facts": f"- {when} 경 귀하({person})에게 {amount}을 대여함\n- 변제기가 지났음에도 현재까지 반환하지 않고 있음",
                "legal_basis": "민법 제598조(소비대차) 및 제390조(채무불이행)",
                "demands": f"본 서면 수령 후 7일 이내에 {amount}을 즉시 지정된 계좌로 반환할 것을 촉구함",
            }
        elif "보증금" in case_type:
            win_prob = "계약 만료 통보 내역이 확실하다면 무난히 승소 가능합니다."
            strategy = "내용증명 발송 후에도 반환하지 않으면, 즉시 임차권등기명령을 신청할 준비를 하십시오."
            extracted = {
                "title": "임대차계약 종료에 따른 임대차보증금 반환 촉구",
                "facts": f"- {when} 임대차 계약 만료일이 도래하거나 해지 조건이 충족됨\n- 현재까지 보증금 {amount}을 반환받지 못하고 있음",
                "legal_basis": "주택임대차보호법 제3조의2(보증금의 회수)",
                "demands": f"지정된 기일까지 보증금 {amount} 일체를 반환할 것을 촉구하며, 미이행 시 임차권등기명령을 신청할 것임",
            }
        elif "차임" in case_type or "명도" in case_type:
            win_prob = "2기 이상의 차임 연체 사실만 객관적으로 입증되면 명도 소송에서 100% 승소 가능합니다."
            strategy = "점유이전금지가처분을 먼저 신청하여, 소송 중 임차인이 짐을 빼고 다른 사람에게 넘기는 것을 방어해야 합니다."
            extracted = {
                "title": "차임(월세) 미납에 따른 계약 해지 통고 및 명도 촉구",
                "facts": f"- 귀하({person})는 현재 차임(월세)을 2기 이상 연체하고 있음\n- 미납된 총 금액은 {amount}에 달함",
                "legal_basis": "민법 제640조(차임연체와 해지)",
                "demands": f"밀린 차임 {amount}을 즉시 입금하고, 본 서면 수령 후 14일 이내에 목적물을 원상복구하여 인도할 것을 요구함",
            }
        elif "손해배상" in case_type and ("불법행위" in case_type or "폭행" in case_type):
            win_prob = "상해 진단서와 경찰 수사 결과 통지서가 있다면 민사 손해배상 청구 인용 가능성이 매우 높습니다."
            strategy = "치료비 영수증, 향후 치료비 추정서, 그리고 정신적 고통을 입증할 수 있는 자료(정신과 진료기록 등)를 꼼꼼히 모아두세요."
            extracted = {
                "title": "불법행위(폭행/상해 등)로 인한 손해배상 청구",
                "facts": f"- {when} 경 귀하({person})의 위법한 행위(폭행 등)로 인하여 신체적/재산적 피해가 발생함\n- 이로 인하여 치료비 및 정신적 고통(위자료)이 발생하였음",
                "legal_basis": "민법 제750조(불법행위의 내용) 및 제751조(재산 이외의 손해의 배상)",
                "demands": f"본 서면 수령 후 7일 이내에 손해배상금 {amount}을 배상할 것을 촉구하며, 미이행 시 민사소송 절차를 진행할 것임",
            }
        elif "명예훼손" in case_type or "사기" in case_type:
            win_prob = "공연성 및 허위사실 여부(명예훼손) 또는 기망의 고의(사기) 입증 여부에 따라 승패가 갈립니다."
            strategy = "게시글 캡처, 녹취록 등 증거가 인멸되기 전에 PDF로 화면 전체(URL 포함)를 캡처하여 보관하십시오."
            extracted = {
                "title": "불법행위(사기/명예훼손)에 따른 부당이득 반환 및 손해배상 청구",
                "facts": f"- {when} 경 귀하({person})의 기망/허위사실 유포 등으로 인하여 심각한 피해를 입음\n- 관련 피해 금액은 {amount}로 산정됨",
                "legal_basis": "민법 제741조(부당이득) 및 제750조(불법행위의 내용)",
                "demands": f"귀하가 취득한 부당이득 및 손해배상액 {amount}을 즉시 반환/배상할 것을 강력히 촉구함",
            }
        else:
            win_prob = "입력하신 정보만으로는 정확한 리스크 분석이 어렵습니다."
            strategy = "구체적인 피해 사실, 일시, 상대방 정보를 육하원칙으로 정리하여 변호사와 상담하시기 바랍니다."
            extracted = {
                "title": "법적 조치 예고 및 의무 이행 촉구서",
                "facts": f"- 귀하({person})와의 관계에서 {when} 경 법적 분쟁 사유가 발생함",
                "legal_basis": "관련 민법 조항",
                "demands": f"문제 상황을 신속히 해결하고 {amount} 상당의 의무를 이행할 것을 촉구함",
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