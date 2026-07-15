import os
import re
import time
import uuid
import random
import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

# 이미지가 저장될 폴더 경로 설정 (backend 폴더 기준으로 상위의 images 폴더)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../images')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def home():
    # frontend 폴더에 있는 index.html 파일 경로 찾기
    html_path = os.path.join(os.path.dirname(__file__), '../frontend/index.html')
    with open(html_path, 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'status': 'fail', 'message': '이미지 파일이 없습니다.'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'status': 'fail', 'message': '선택된 파일이 없습니다.'}), 400

    filename = file.filename.lower()
    
    # 파일명 판별을 통한 Mock 데이터 매핑
    if 'test1' in filename:
        mock_data = {
            "name": "오모리 김치찌개라면",
            "brand": "GS25",
            "price": 1800,
            "kcal": 485,
            "carbs": 69,
            "protein": 8,
            "fat": 20,
            "rating": "2등급 (보통)",
            "grade_type": "yellow",
            "desc": "1,000원당 단백질 함량이 보통인 일반 라면류 제품입니다."
        }
    elif 'test3' in filename:
        mock_data = {
            "name": "혜자로운 집밥 제육볶음",
            "brand": "GS25",
            "price": 4500,
            "kcal": 723,
            "carbs": 97,
            "protein": 28,
            "fat": 25,
            "rating": "1등급 (갓성비)",
            "grade_type": "green",
            "desc": "1,000원당 단백질 함량이 5.0g 이상으로 가격대비 훌륭한 영양 조합입니다."
        }
    elif 'test4' in filename:
        mock_data = {
            "name": "연세우유 말차생크림빵",
            "brand": "CU",
            "price": 3400,
            "kcal": 467,
            "carbs": 58,
            "protein": 9,
            "fat": 22,
            "rating": "2등급 (보통)",
            "grade_type": "yellow",
            "desc": "1,000원당 단백질 함량이 보통이며, 포화지방과 당류 비율이 높습니다."
        }
    elif 'test5' in filename:
        mock_data = {
            "name": "초코별",
            "brand": "세븐일레븐",
            "price": 1000,
            "kcal": 320,
            "carbs": 43,
            "protein": 3,
            "fat": 15,
            "rating": "3등급 (주의/간식)",
            "grade_type": "red",
            "desc": "단백질이 10g 미만인 일반 가공 스낵류로 가성비 및 건강 관리에 부적합합니다."
        }
    else:
        # 기본값: test2 (득템 닭가슴살 블랙페퍼)
        mock_data = {
            "name": "득템 닭가슴살 블랙페퍼",
            "brand": "CU",
            "price": 1900,
            "kcal": 115,
            "carbs": 1,
            "protein": 23,
            "fat": 2,
            "rating": "1등급 (갓성비)",
            "grade_type": "green",
            "desc": "1,000원당 단백질 함량이 6.5g 이상인 최고의 갓성비 단백질 제품입니다!"
        }

    # 파일 저장 (프론트엔드 미리보기용)
    try:
        original_filename = file.filename
        if original_filename.lower() in ['test1.jpg', 'test2.jpg', 'test3.jpg', 'test4.jpg', 'test5.jpg']:
            unique_filename = original_filename
        else:
            ext = os.path.splitext(original_filename)[1]
            unique_filename = f"{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
            
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        mock_data["saved_filename"] = unique_filename
    except Exception as e:
        mock_data["saved_filename"] = file.filename

    # 시간대별 코멘트 생성
    now = datetime.datetime.now()
    current_minutes = now.hour * 60 + now.minute
    start_night = 21 * 60 + 30
    end_night = 4 * 60 + 30
    is_night = (start_night <= current_minutes or current_minutes <= end_night)
    
    day_foods = [
        {"name": "돈까스 세트", "price": 11000, "calories": 950},
        {"name": "뚝배기 제육볶음", "price": 9500, "calories": 850},
        {"name": "중국집 짜장면", "price": 7500, "calories": 800},
        {"name": "미소라멘", "price": 10000, "calories": 750}
    ]
    
    night_foods = [
        {"name": "치킨+콜라 세트", "price": 24000, "calories": 2200},
        {"name": "엽기떡볶이+모둠튀김", "price": 19000, "calories": 1600},
        {"name": "로제 마라탕", "price": 15000, "calories": 1200},
        {"name": "직화 불족발", "price": 32000, "calories": 2500}
    ]
    
    pool = night_foods if is_night else day_foods
    valid_pool = [f for f in pool if f["price"] > mock_data["price"]]
    if not valid_pool:
        selected = max(pool, key=lambda x: x["price"])
    else:
        selected = random.choice(valid_pool)
        
    saved_price = selected["price"] - mock_data["price"]
    saved_calories = selected["calories"] - mock_data["kcal"]
    if saved_calories < 0:
        saved_calories = 0
        
    if is_night:
        comment = f"이 시간에 배달 앱 켜서 **{selected['name']}**({selected['price']:,}원) 때릴까 했던 무서운 유혹, 편의점에서 완벽 차단! 배달 지출 대비 무려 **{saved_price:,}원**을 통장에 세이브했고, 밤늦은 시간 **{saved_calories:,}kcal**의 폭탄을 비껴갔습니다. 오늘 밤 인내심이 몸과 지갑을 구원했네요! 🏆❌"
    else:
        comment = f"오늘 식사, 뜨끈한 **{selected['name']}**({selected['price']:,}원)의 유혹 대신 편의점을 선택하셨네요! 덕분에 일반 외식 대비 식비 **{saved_price:,}원**을 아끼고, **{saved_calories:,}kcal**를 철벽 방어했습니다. 가성비와 건강을 모두 잡은 멋진 선택이에요! 🎉"
        
    # 국물류 나트륨 한 줄 치트키
    sodium_tip = None
    soup_keywords = ['라면', '컵라면', '국물', '탕', '찌개', '짬뽕', '우동', '똠양꿍']
    if any(k in mock_data["name"] for k in soup_keywords):
        sodium_tip = "국물을 반만 남겨도 나트륨 섭취를 최대 50% 줄일 수 있어요! 면 위주로 가볍게 드시는 것을 추천합니다. 😉"
        
    # 가성비 공식에 따른 스코어 계산
    score = (mock_data["protein"] / mock_data["price"]) * 1000
    score = round(score, 2)

    return jsonify({
        'status': 'success',
        'product_name': mock_data["name"],
        'brand': mock_data["brand"],
        'price': mock_data["price"],
        'calories': mock_data["kcal"],
        'carbs': mock_data["carbs"],
        'protein': mock_data["protein"],
        'fat': mock_data["fat"],
        'score': score,
        'grade': mock_data["rating"],
        'grade_type': mock_data["grade_type"],
        'desc': mock_data["desc"],
        'comment': comment,
        'sodium_tip': sodium_tip,
        'saved_price': saved_price,
        'saved_calories': saved_calories
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_recipe():
    # 이 엔드포인트는 더 이상 사용되지 않지만 하위 호환성을 위해 유지
    return jsonify({'status': 'success', 'message': 'Bypassed by automatic mode'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)