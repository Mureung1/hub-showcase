from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["generate"])


class GenerateRequest(BaseModel):
    complaint: str
    temperature: int
    platform: str
    business_name: str | None = None
    business_type: str | None = None
    business_description: str | None = None


@router.post("/generate")
def generate_content(request: GenerateRequest):
    """하소연 → SNS 콘텐츠 생성.

    TODO: 지금은 더미 응답. 나중에 GPT-4o 호출로 교체 예정.
    온도 구간별 프롬프트 템플릿(0~30/31~79/80~100) + 손님 비난 방지 가드레일을
    이 함수 안에서 구성해서 OpenAI API에 넘길 예정.
    """
    if request.temperature <= 30:
        result = (
            "비 내리는 오후, 텅 빈 홀을 바라보며 조용히 앉아있습니다.\n\n"
            "준비한 재료들이 저를 말없이 바라보는 것 같아 마음이 먹먹해지네요."
        )
    elif request.temperature >= 80:
        result = (
            "비가 억수로 쏟아지는데 주문 제로 실화냐구요 ㅋㅋㅋ\n\n"
            "저희 재료들이 저한테 '사장님... 우리 이제 어떡해요?' 하고 쳐다보는 눈빛 ㅠㅠ"
        )
    else:
        result = "오늘도 이런저런 일이 있었지만, 그래도 하루를 잘 마무리했습니다."

    return {"result": result}
