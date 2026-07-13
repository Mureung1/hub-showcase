import easyocr
import os

# 1. 한글(ko)과 영어(en) 모델로 리더기 초기화 (CPU 강제 구동 설정)
print("OCR 모델을 로드하고 있습니다...")
reader = easyocr.Reader(['ko', 'en'], gpu=False)

# 2. 이미지 폴더 경로 설정
image_folder = './images'

if not os.path.exists(image_folder):
    print(f"'{image_folder}' 폴더를 찾을 수 없습니다. 폴더를 생성하고 이미지를 넣어주세요.")
else:
    # 3. 폴더 내 이미지 파일들 스캔
    image_files = [f for f in os.listdir(image_folder) if f.endswith(('.png', '.jpg', '.jpeg'))]
    
    print(f"총 {len(image_files)}개의 이미지를 발견했습니다. 분석을 시작합니다.\n")

    for filename in sorted(image_files):
        print(f"========================================")
        print(f"📄 파일명: {filename}")
        print(f"========================================")
        
        image_path = os.path.join(image_folder, filename)
        
        # OCR 실행
        results = reader.readtext(image_path)
        
        # 결과가 없을 경우 예외 처리
        if not results:
            print("[텍스트를 인식하지 못했습니다.]")
        
        # 인식된 텍스트와 신뢰도(Confidence) 출력
        for bbox, text, confidence in results:
            print(f"[{confidence:.2f}] {text}")
        print("\n")