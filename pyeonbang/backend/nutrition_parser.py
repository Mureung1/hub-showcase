import os
import json
import io
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def parse_nutrition_info_with_gemini(image_input):
    """
    Gemini 1.5 Flash Vision 모델을 활용해 영양성분 표 이미지를 분석하고 JSON으로 반환합니다.
    :param image_input: PIL Image 객체, 이미지 경로(str), 또는 이미지 바이트(bytes)
    """
    try:
        # 입력 데이터 타입별 PIL Image 변환
        if isinstance(image_input, str):
            img = Image.open(image_input)
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        else:
            img = image_input

        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = """
        제공된 이미지에서 편의점 음식의 영양성분 표를 분석하여 지정된 JSON 구조로 응답해줘.

        응답 JSON 구조:
        {
            "calories": (총 열량/칼로리 숫자, kcal 단위 생략, 없으면 0),
            "carbs": (탄수화물 숫자, g 단위 생략, 없으면 0),
            "protein": (단백질 숫자, g 단위 생략, 없으면 0),
            "fat": (지방 숫자, g 단위 생략, 없으면 0),
            "sodium": (나트륨 숫자, mg 단위 생략, g단위일 경우 mg으로 환산, 없으면 0),
            "sugar": (당류 숫자, g 단위 생략, 없으면 0),
            "is_complete": true,
            "missing_fields": [],
            "warning_messages": []
        }
        
        주의사항:
        - 단백질 32g이 329로 보이더라도 영양학적 상식에 맞게 32로 보정해줘.
        - % (일일 영양성분 기준치) 수치와 실제 함량(g, mg)을 혼동하지 말고 함량 수치만 정확히 추출해줘.
        """

        # 강제 JSON 응답 설정 (response_mime_type)
        response = model.generate_content(
            [prompt, img],
            generation_config={"response_mime_type": "application/json"}
        )
        
        data = json.loads(response.text.strip())
        return data

    except Exception as e:
        print(f"[Gemini API 파싱 에러]: {e}")
        return {
            "calories": 0, "carbs": 0, "protein": 0, "fat": 0, "sodium": 0, "sugar": 0,
            "is_complete": False,
            "missing_fields": ["parsing_error"],
            "warning_messages": [f"Gemini API 오류: {str(e)}"]
        }
