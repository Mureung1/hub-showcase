# pip install jinja2
import os
from jinja2 import Template

class DocumentGenerator:
    def __init__(self):
        # 내용증명 템플릿 (하드코딩된 양식에 {{변수}} 만 뚫어놓음)
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
        
        # 변호사 제출용 브리핑 페이퍼 템플릿
        self.briefing_template = """
[변호사 상담용 사건 브리핑 페이퍼]

▶ 사건 개요 (Title) : {{ title }}

▶ 당사자 정보
- 의뢰인 : {{ sender_name }}
- 상대방 : {{ receiver_name }}

▶ 핵심 사실관계 (5W1H 요약)
{{ facts }}

▶ 의뢰인 최종 목표
{{ demands }}
"""

    def generate(self, doc_type: str, data: dict) -> str:
        if doc_type == "content_proof":
            template = Template(self.content_proof_template)
        elif doc_type == "briefing":
            template = Template(self.briefing_template)
        else:
            return "지원하지 않는 문서 양식입니다."

        # 빈 값이면 기본 텍스트 삽입
        safe_data = {k: (v if v else "[기재 요망]") for k, v in data.items()}
        return template.render(**safe_data)
    