from fastapi import APIRouter
from pydantic import BaseModel

from app.services.openai_client import generate_content
from app.services.temperature_suggester import record_temperature
from app.services.keyword_picker import pick_keyword

router = APIRouter(tags=["generate"])


class GenerateRequest(BaseModel):
    complaint: str
    temperature: int
    platform: str
    weather: str | None = None
    holiday: str | None = None
    business_name: str | None = None
    business_type: str | None = None
    business_description: str | None = None


@router.post("/generate")
def generate(request: GenerateRequest):
    """하소연 → SNS 콘텐츠 생성 (GPT-4o 연동).

    온도 구간별 문체, 손님 비난 방지 가드레일, 업장 정보, 날씨/공휴일 맥락,
    큐레이션 키워드를 프롬프트에 반영함. 외부 API가 실패해도 서버가 죽지
    않도록 예외를 잡아서 안전하게 폴백함.
    """
    # 키워드 뽑기도 실패할 수 있으니 별도로 안전하게 처리 (실패해도 그냥 키워드 없이 진행)
    try:
        keyword = pick_keyword()
    except Exception as e:
        print(f"[keyword_picker 오류] {e}")
        keyword = None

    try:
        result = generate_content(
            complaint=request.complaint,
            temperature=request.temperature,
            platform=request.platform,
            weather=request.weather,
            holiday=request.holiday,
            keyword=keyword,
            business_name=request.business_name,
            business_type=request.business_type,
            business_description=request.business_description,
        )
    except Exception as e:
        return {"result": None, "error": str(e)}

    record_temperature(request.temperature)

    return {"result": result}
