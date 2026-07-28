import os
import json
import io
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv

# .env 파일 위치 명시적으로 탐색 (backend/.env 및 상위 pyeonbang/.env)
dotenv_backend = os.path.join(os.path.dirname(__file__), '.env')
dotenv_root = os.path.join(os.path.dirname(__file__), '../.env')

if os.path.exists(dotenv_backend):
    load_dotenv(dotenv_backend)
elif os.path.exists(dotenv_root):
    load_dotenv(dotenv_root)
else:
    load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def parse_nutrition_info_with_gemini(image_input):
    """
    Gemini Vision 모델을 활용해 영양성분 표 이미지를 분석하고 JSON으로 반환합니다.
    :param image_input: PIL Image 객체, 이미지 경로(str), 또는 이미지 바이트(bytes)
    """
    try:
        if not api_key:
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

        # 입력 데이터 타입별 PIL Image 변환
        if isinstance(image_input, str):
            img = Image.open(image_input)
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        else:
            img = image_input

        # Gemini 모델 설정 (무료 플랜 지원 gemini-flash-latest 우선 지정)
        candidate_models = ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash']
        response = None
        last_err = None

        prompt = """
        제공된 이미지에서 편의점 음식의 영양성분 표를 분석하여 지정된 JSON 구조로 응답해줘.

        응답 JSON 구조:
        {
            "product_name": (상품명 또는 도시락/라면 이름, 없으면 null),
            "brand": (편의점 브랜드명 예: GS25, CU, 세븐일레븐 등, 없으면 null),
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

        for m_name in candidate_models:
            try:
                model = genai.GenerativeModel(m_name)
                response = model.generate_content(
                    [prompt, img],
                    generation_config={"response_mime_type": "application/json"}
                )
                if response and response.text:
                    break
            except Exception as ex:
                last_err = ex
                continue

        if not response or not response.text:
            if last_err:
                raise last_err
            else:
                raise RuntimeError("모든 Gemini 모델 응답 생성 실패")
        
        data = json.loads(response.text.strip())
        data["is_complete"] = True
        return data

    except Exception as e:
        raw_err = str(e)
        if "429" in raw_err or "Quota exceeded" in raw_err or "quota" in raw_err.lower():
            error_summary = "API 호출 한도 초과 (429 Rate Limit Exceeded). 잠시 후 다시 시도해 주세요."
        elif "API_KEY_INVALID" in raw_err or "API key not valid" in raw_err:
            error_summary = "유효하지 않은 Gemini API 키입니다. .env 파일을 확인해 주세요."
        else:
            first_line = raw_err.split('\n')[0]
            error_summary = first_line[:150]

        print(f"[Gemini API 오류]: {error_summary}")
        return {
            "calories": 0, "carbs": 0, "protein": 0, "fat": 0, "sodium": 0, "sugar": 0,
            "is_complete": False,
            "missing_fields": ["parsing_error"],
            "error": error_summary,
            "warning_messages": [f"[Gemini API 오류]: {error_summary}"]
        }

