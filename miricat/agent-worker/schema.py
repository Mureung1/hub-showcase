"""추출 결과의 '모양(스키마)'. 평가셋(docs/eval-dataset)의 ground_truth 5개 필드와 1:1.

Gemini의 구조화 출력(response_schema)에 이 Pydantic 모델을 넘기면,
모델이 이 5개 필드를 가진 JSON만 내도록 강제된다.
"""

from pydantic import BaseModel, Field


class Event(BaseModel):
    """공지 안의 사건 하나.(한 공지에 여러 개일 수 있음)"""
    event_name: str = Field(description="사건/조치 이름 (예: B1노선 전면 통제)")
    location: str = Field(description="통제/변경 위치, 없으면 빈 문자열")
    period: str = Field(description='기간 "YYYY-MM-DD ~ YYYY-MM-DD" 형식, 없으면 빈 문자열')
    affected_lines: list[str] = Field(description="영향 받는 노선 번호들")
    affected_stops: list[str] = Field(description="영향 받는(미정차/이설) 정류장 이름들")
    
class Extraction(BaseModel):
    events: list[Event] = Field(default_factory=list, description="공지에서 찾은 사건들. 없으면 빈 배열")