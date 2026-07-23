# pip install jinja2
import os
from jinja2 import Template

class DocumentGenerator:
    def __init__(self):
        # 1. 내용증명서 템플릿 (상대방 압박용 - 엄중하고 단호하게)
        self.content_proof_template = """
[내용증명]

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
만약 지정된 기한까지 이행하지 않을 경우, 본 발신인은 민형사상의 모든 법적 조치를 취할 것임을 엄중히 통고합니다.
"""

        # 2. 민사 소장 템플릿 (법원 제출용 - 엄격한 양식)
        self.complaint_template = """
[소 장]

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

관할 법원 귀중
"""

        # 3. 변호사 상담용 브리핑 템플릿 (AI 분석 결과 + 판례 포함)
        self.briefing_template = """
[변호사 사전 브리핑 및 사건 요약서]

작성일자 : {{ date }}
사건제목 : {{ title }}

■ 당사자 정보
 - 의뢰인(원고) : {{ sender_name }} (연락처: {{ sender_phone }})
 - 상대방(피고) : {{ receiver_name }}

■ 사건 타임라인 및 핵심 사실관계
{{ facts }}

■ 의뢰인 최종 요구사항
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
{% endif %}
"""

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
        
        # 리스트 데이터(관련 법령 등)는 그대로 보존하여 주입
        safe_data["related_laws"] = data.get("related_laws", [])
        safe_data["strategy_guide"] = data.get("strategy_guide", "[전략 분석 결과가 없습니다.]")
        safe_data["date"] = data.get("date", "")

        return template.render(**safe_data)