"""추출 결과의 '모양(스키마)'. 평가셋(docs/eval-dataset)의 ground_truth 5개 필드와 1:1.

Gemini의 구조화 출력(response_schema)에 이 Pydantic 모델을 넘기면,
모델이 이 5개 필드를 가진 JSON만 내도록 강제된다.
"""

from pydantic import BaseModel, Field


class Extraction(BaseModel):
    event_name: str = Field(
        description="공지의 핵심 사건/조치 이름 (예: 갑천도시고속도로 원촌육교 전면 통제)"
    )
    location: str = Field(
        description="통제/변경이 일어나는 위치 (예: 갑천도시고속도로 원촌육교). 없으면 빈 문자열"
    )
    period: str = Field(
        description='기간. "YYYY-MM-DD ~ YYYY-MM-DD" 형식. 종료일이 없으면 "YYYY-MM-DD". 없으면 빈 문자열'
    )
    affected_lines: list[str] = Field(
        default_factory=list,
        description='영향받는 버스/지하철 노선 번호 목록 (예: ["B1"]). 없으면 빈 배열',
    )
    affected_stops: list[str] = Field(
        default_factory=list,
        description="미정차/이설되는 정류장 이름 목록. 없으면 빈 배열",
    )
