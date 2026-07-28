import os
import sys
import time
from PIL import Image

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from nutrition_parser import parse_nutrition_info_with_gemini

# [초보자 멘토링 주석]
# 이 스크립트는 images 폴더에 있는 영양성분표 사진을 읽어
# Gemini 2.0 Flash AI Vision API로 영양성분 데이터(칼로리, 단백질, 나트륨 등)를 추출하는 테스트 도구입니다.

image_folder = './images'

def run_ocr_test(target_file=None):
    if not os.path.exists(image_folder):
        print(f"❌ '{image_folder}' 폴더가 존재하지 않습니다.")
        return

    if target_file:
        image_files = [target_file]
    else:
        # 특정 파일 지정이 없으면 test2.jpg 등 1~2개 대표 파일만 기본 테스트 (Rate Limit 방지)
        all_files = [f for f in os.listdir(image_folder) if f.endswith(('.png', '.jpg', '.jpeg'))]
        if len(sys.argv) > 1 and sys.argv[1] == '--all':
            image_files = sorted(all_files)
        else:
            image_files = [f for f in sorted(all_files) if f.startswith('test')]
            if not image_files and all_files:
                image_files = [all_files[0]]

    print(f"🔍 총 {len(image_files)}개 이미지 파싱 테스트 시작...\n")

    for idx, filename in enumerate(image_files):
        print(f"========================================")
        print(f"📄 [{idx+1}/{len(image_files)}] 파일명: {filename}")
        print(f"========================================")
        
        image_path = os.path.join(image_folder, filename)
        if not os.path.exists(image_path):
            print(f"❌ 파일을 찾을 수 없습니다: {image_path}")
            continue

        try:
            img = Image.open(image_path)
            parsed_result = parse_nutrition_info_with_gemini(img)
            
            print("[📊 Gemini 2.0 Flash 최종 파싱 결과 리포트]")
            print(f"🔥 칼로리  : {parsed_result.get('calories', 0)} kcal")
            print(f"🍞 탄수화물: {parsed_result.get('carbs', 0)} g")
            print(f"🥩 단백질  : {parsed_result.get('protein', 0)} g")
            print(f"🧈 지방    : {parsed_result.get('fat', 0)} g")
            print(f"🧂 나트륨  : {parsed_result.get('sodium', 0)} mg")
            print(f"🍬 당류    : {parsed_result.get('sugar', 0)} g")
            print(f"✅ 성공 여부: {parsed_result.get('is_complete', False)}")
            if parsed_result.get('warning_messages'):
                print(f"⚠️ 경고 메세지: {parsed_result['warning_messages']}")
                    
        except Exception as e:
            print(f"❌ [처리 에러]: {e}")

        # 여러 파일 연속 파싱 시 Gemini Free Tier 429 Rate Limit 방지를 위해 3초 대기
        if len(image_files) > 1 and idx < len(image_files) - 1:
            time.sleep(3)

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '--all' else None
    run_ocr_test(target)