from fastapi import APIRouter
from pydantic import BaseModel

from app.services.image_client import generate_image

router = APIRouter(tags=["image"])


class GenerateImageRequest(BaseModel):
    complaint: str


@router.post("/generate-image")
def generate_image_endpoint(request: GenerateImageRequest):
    """하소연 내용을 바탕으로 GPT Image 1.5로 이미지 생성.

    외부 API가 실패해도 서버가 죽지 않도록 예외를 잡아서 안전하게 폴백함.
    """
    try:
        return generate_image(request.complaint)
    except Exception as e:
        return {"image_base64": None, "caption": None, "error": str(e)}
