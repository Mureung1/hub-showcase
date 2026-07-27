import os

from openai import OpenAI


def build_image_prompt(complaint: str) -> str:
    """하소연 내용을 바탕으로 이미지 생성용 프롬프트 구성."""
    return (
        "소상공인 사장님의 하루를 담은, 감성적이고 예술적인 일러스트. "
        "사진이 아니라 부드러운 색감의 그림체로. 텍스트나 글자는 넣지 마. "
        f"다음 상황의 감정선을 시각적으로 표현해줘: {complaint}"
    )


def generate_image(complaint: str) -> dict:
    """GPT Image 1.5로 이미지 생성, base64 인코딩된 데이터를 반환.

    비용을 아끼기 위해 quality는 low로 고정 (장당 약 $0.009 수준).
    """
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    prompt = build_image_prompt(complaint)

    response = client.images.generate(
        model="gpt-image-1.5",
        prompt=prompt,
        size="1024x1024",
        quality="low",
        n=1,
    )

    image_base64 = response.data[0].b64_json
    return {
        "image_base64": image_base64,
        "caption": "오늘의 하소연을 담은 이미지",
    }
