import os
import sys
from PIL import Image

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from nutrition_parser import parse_nutrition_info_with_gemini

image_folder = './images'

if os.path.exists(image_folder):
    image_files = [f for f in os.listdir(image_folder) if f.endswith(('.png', '.jpg', '.jpeg'))]
    
    for filename in sorted(image_files):
        print(f"\n========================================")
        print(f"📄 파일명: {filename}")
        print(f"========================================")
        
        image_path = os.path.join(image_folder, filename)
        
        try:
            img = Image.open(image_path)
            parsed_result = parse_nutrition_info_with_gemini(img)
            
            print("\n[📊 Gemini 2.5 Flash 최종 파싱 결과 리포트]")
            print(f"🔥 칼로리  : {parsed_result['calories']} kcal")
            print(f"🍞 탄수화물: {parsed_result['carbs']} g")
            print(f"🥩 단백질  : {parsed_result['protein']} g")
            print(f"🧈 지방    : {parsed_result['fat']} g")
            print(f"🧂 나트륨  : {parsed_result['sodium']} mg")
            print(f"🍬 당류    : {parsed_result['sugar']} g")
            print(f"✅ 파싱 성공 여부: {parsed_result['is_complete']}")
            if parsed_result['warning_messages']:
                print(f"⚠️ 경고: {parsed_result['warning_messages']}")
                    
        except Exception as e:
            print(f"[에러 발생]: {e}")