from fastapi import APIRouter
from pydantic import BaseModel

from app.services.openai_client import generate_content
from app.services.temperature_suggester import record_temperature

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

    온도 구간별 문체, 손님 비난 방지 가드레일, 업장 정보, 날씨/공휴일 맥락을
    프롬프트에 반영함. 외부 API가 실패해도 서버가 죽지 않도록 예외를 잡아서
    안전하게 폴백함.
    """
    try:
        result = generate_content(
            complaint=request.complaint,
            temperature=request.temperature,
            platform=request.platform,
            weather=request.weather,
            holiday=request.holiday,
            business_name=request.business_name,
            business_type=request.business_type,
            business_description=request.business_description,
        )
    except Exception as e:
        return {"result": None, "error": str(e)}

    # 온도 자동 제안의 반복 회피 로직이 참고할 수 있도록 실제 사용된 온도를 기록
    record_temperature(request.temperature)

    return {"result": result}
