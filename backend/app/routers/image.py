from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["image"])


class GenerateImageRequest(BaseModel):
    complaint: str


@router.post("/generate-image")
def generate_image(request: GenerateImageRequest):
    """하소연 내용을 바탕으로 이미지 생성.

    TODO: 지금은 더미 응답. 나중에 GPT Image 1.5 호출로 교체 예정.
    """
    return {
        "image_url": None,
        "caption": "비 오는 날, 텅 빈 홀의 창밖을 바라보는 사장님",
    }
