# pip install jinja2
import os
from jinja2 import Template

class DocumentGenerator:
    def __init__(self):
        # 1. 내용증명서 템플릿 (상대방 압박용 - 엄중하고 단호하게)
        self.content_proof_template = """[내용증명]

제목 : {{ title }}

1. 발신인
 - 성명 : {{ sender_name }}
 - 주소 : {{ sender_address }}
 - 연락처 : {{ sender_phone }}

2. 수신인
 - 성명 : {{ receiver_name }}
 - 주소 : {{ receiver_address }}

3. 사실관계 및 청구취지
{{ facts }}

4. 법적 근거
본 청구는 {{ legal_basis }}에 근거하고 있습니다.

5. 요구사항
{{ demands }}

위 사항을 {{ deadline }}까지 이행하여 주시기 바랍니다. 
만약 지정된 기한까지 이행하지 않을 경우, 본 발신인은 민형사상의 모든 법적 조치를 취할 것임을 엄중히 통고합니다."""

        # 2. 민사 소장 템플릿 (법원 제출용 - 엄격한 양식)
        self.complaint_template = """[소 장]

사 건 : {{ title }}
원 고 : {{ sender_name }}
          {{ sender_address }}
          연락처: {{ sender_phone }}
피 고 : {{ receiver_name }}
          {{ receiver_address }}

청 구 취 지
1. 피고는 원고에게 {{ demands }}
2. 소송비용은 피고가 부담한다.
3. 제1항은 가집행할 수 있다.
라는 판결을 구합니다.

청 구 원 인
1. 사실관계
{{ facts }}

2. 법적 근거
본 청구는 {{ legal_basis }}에 근거합니다.

따라서 원고는 위 청구취지와 같은 판결을 구하기 위해 본 소에 이르렀습니다.

첨 부 서 류
1. 관련 입증 자료 일체

{{ date }}
원고 : {{ sender_name }} (인)

관할 법원 귀중"""

        # 3. 변호사 상담용 브리핑 템플릿 (🚀 육하원칙 틀을 명확히 제시하도록 개선)
        self.briefing_template = """[변호사 사전 브리핑 및 사건 요약서]

작성일자 : {{ date }}
사건제목 : {{ title }}

■ 당사자 정보
 - 의뢰인(원고) : {{ sender_name }} (연락처: {{ sender_phone }})
 - 상대방(피고) : {{ receiver_name }}

■ 육하원칙 기반 핵심 사실관계
{{ facts }}

■ 의뢰인 요구사항 및 AI 쟁점 검토
{{ demands }}

■ AI 분석 변호사 상담 전략 및 필요 증거
{{ strategy_guide }}

■ AI 매핑 관련 법령 및 핵심 판례 레퍼런스
{% if related_laws %}
{% for law in related_laws %}
- {{ law.title }} (연관도: {{ law.similarity }}%)
  원문: {{ law.full_content }}

{% endfor %}
{% else %}
- 검색된 관련 법령/판례가 없습니다.
{% endif %}"""

    def _format_facts_to_5w1h(self, facts_text: str) -> str:
        """
        문자열 형태의 사실관계를 육하원칙(리스트 형태)으로 깔끔하게 정돈하는 헬퍼 함수 
        (LLM 호출 없이 파이썬 문자열 치환만 사용 = 토큰 0원)
        """
        if not facts_text or facts_text == "[기재 요망]":
            return " - 일시(When): \n - 장소(Where): \n - 대상(Who): \n - 행위(What/How): \n - 결과(Why): "
        
        # 이미 육하원칙 형태(일시:, 장소: 등)가 들어있다면 그대로 리턴
        if "일시:" in facts_text or "When:" in facts_text:
            return facts_text
            
        # 개조식(- 기호)으로 적힌 문장들을 깔끔한 불릿포인트로 정리
        lines = facts_text.split('\n')
        formatted_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if not line.startswith('-') and not line.startswith('*'):
                formatted_lines.append(f" - {line}")
            else:
                formatted_lines.append(f" {line}")
                
        # 기본 육하원칙 가이드를 덧붙여 변호사가 빈틈을 묻기 쉽게 유도
        guide_header = " [요약 내용]\n" + "\n".join(formatted_lines)
        guide_footer = "\n\n [변호사 확인 요망 사실]\n - 쟁점 발생 일시 및 정확한 장소 특정 여부\n - 주요 행위(계약/불법행위 등)의 증빙 자료 존재 여부"
        
        return guide_header + guide_footer

    def generate(self, doc_type: str, data: dict) -> str:
        if doc_type == "content_proof":
            template = Template(self.content_proof_template)
        elif doc_type == "complaint":
            template = Template(self.complaint_template)
        elif doc_type == "briefing":
            template = Template(self.briefing_template)
        else:
            return "지원하지 않는 문서 양식입니다."

        # 기본 문자열 필드 빈 값 처리
        safe_data = {k: (v if v else "[기재 요망]") for k, v in data.items() if isinstance(v, str)}
        
        # 리스트 데이터(관련 법령 등) 보존
        safe_data["related_laws"] = data.get("related_laws", [])
        safe_data["strategy_guide"] = data.get("strategy_guide", "[전략 분석 결과가 없습니다.]")
        safe_data["date"] = data.get("date", "")

        # 🚀 [브리핑용] 사실관계(facts) 육하원칙 강제 정돈 적용
        if doc_type == "briefing":
            safe_data["facts"] = self._format_facts_to_5w1h(safe_data.get("facts", ""))

            current_demands = safe_data.get("demands", "[기재 요망]")
            if current_demands == "[기재 요망]":
                current_demands = "본 사안에 대한 소송 및 법적 대응 방안 상담"
            
            ai_supplement = (
                "\n\n[💡 AI 사건 쟁점 검토 포인트]\n"
                " - 하단에 기재된 'AI 분석 변호사 상담 전략'을 참고하여 조치해 주십시오.\n"
                " - 증거 보전 절차, 가압류 신청, 내용증명 발송 등 초기 대응의 실효성 검토를 요청합니다."
            )
            safe_data["demands"] = current_demands + ai_supplement

        return template.render(**safe_data)