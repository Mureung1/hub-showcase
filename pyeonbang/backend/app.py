import os
import re
import time
import uuid
import random
import datetime
from flask import Flask, request, jsonify
import sqlite3
from PIL import Image
from nutrition_parser import parse_nutrition_info_with_gemini

app = Flask(__name__)

# 이미지가 저장될 폴더 경로 설정 (backend 폴더 기준으로 상위의 images 폴더)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../images')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'pyeonbang.db')

def get_db_connection():
    db_path = app.config.get('DATABASE', DATABASE_PATH)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db_path = app.config.get('DATABASE', DATABASE_PATH)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            brand TEXT NOT NULL,
            price INTEGER NOT NULL,
            calories INTEGER NOT NULL,
            carbs INTEGER NOT NULL,
            protein INTEGER NOT NULL,
            fat INTEGER NOT NULL,
            sodium INTEGER DEFAULT 0,
            sugar INTEGER DEFAULT 0,
            score REAL NOT NULL,
            grade TEXT NOT NULL,
            grade_type TEXT NOT NULL,
            desc TEXT,
            comment TEXT NOT NULL,
            sodium_tip TEXT,
            saved_price INTEGER NOT NULL,
            saved_calories INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Ensure database table is initialized on startup
init_db()

def calculate_grade(price, protein):
    """
    3단계 가성비 검증 로직
    1단계: 건강 방어선 (단백질 10g 미만) -> 3등급 (주의)
    2단계: 지갑 방어선 (가격 6,500원 초과) -> 3등급 (지갑 경고)
    3단계: 프로틴 가성비 지수 ((단백질 / 가격) * 1000)
           >= 6.5 -> 1등급 (갓성비) (green)
           >= 5.0 -> 2등급 (보통) (yellow)
           < 5.0 -> 3등급 (주의) (red)
    """
    score = round((protein / price) * 1000, 2) if price and price > 0 else 0.0

    if protein < 10:
        return score, "3등급 (주의/간식)", "red", "단백질이 10g 미만으로 가성비 및 건강 관리에 부적합합니다."
    
    if price > 6500:
        return score, "3등급 (지갑 경고)", "red", "편의점 한 끼 지출 상한선(6,500원)을 초과한 과소비 경고 대상입니다."

    if score >= 6.5:
        return score, "1등급 (갓성비)", "green", f"1,000원당 단백질 {score}g으로 최고의 갓성비 단백질 제품입니다!"
    elif score >= 5.0:
        return score, "2등급 (보통)", "yellow", f"1,000원당 단백질 {score}g으로 적정한 영양 가성비 제품입니다."
    else:
        return score, "3등급 (주의)", "red", f"1,000원당 단백질 {score}g으로 단백질 가성비가 떨어집니다."

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

    # 1. 파일 저장 및 바이트 읽기 (동일 파일명 업로드 시 덮어써서 중복 누적 방지)
    try:
        original_filename = os.path.basename(file.filename)
        if not original_filename:
            original_filename = "upload_image.jpg"
        file_path = os.path.join(UPLOAD_FOLDER, original_filename)
        
        file_bytes = file.read()
        with open(file_path, 'wb') as f:
            f.write(file_bytes)
    except Exception as e:
        return jsonify({'status': 'fail', 'message': f'이미지 저장 실패: {str(e)}'}), 500

    # 2. 가격 입력 처리
    custom_price = request.form.get('price')
    price_val = 3000  # 기본 지정 가격
    if custom_price is not None and custom_price.strip() != '':
        try:
            custom_price_int = int(custom_price)
            if custom_price_int <= 0:
                return jsonify({'status': 'fail', 'message': '가격은 1원 이상이어야 합니다.'}), 400
            price_val = custom_price_int
        except ValueError:
            return jsonify({'status': 'fail', 'message': '유효한 숫자 가격을 입력해 주세요.'}), 400

    # 3. Gemini 1.5 Flash Vision API 영양성분 파싱
    try:
        parsed_data = parse_nutrition_info_with_gemini(file_bytes)
    except Exception as e:
        print(f"Gemini Exception: {e}")
        parsed_data = {
            "calories": 0, "carbs": 0, "protein": 0, "fat": 0, "sodium": 0, "sugar": 0,
            "is_complete": False, "missing_fields": ["error"], "warning_messages": [str(e)]
        }

    intent_tab = request.form.get('intent_tab', 'meal')
    product_name = parsed_data.get("product_name") or "촬영한 편의점 제품"
    detected_brand = parsed_data.get("brand") or "편의점"

    # 4. 파싱된 데이터로 제품 정보 구축
    data = {
        "name": product_name,
        "brand": detected_brand,
        "price": price_val,
        "kcal": parsed_data.get("calories", 0),
        "carbs": parsed_data.get("carbs", 0),
        "protein": parsed_data.get("protein", 0),
        "fat": parsed_data.get("fat", 0),
        "sodium": parsed_data.get("sodium", 0),
        "sugar": parsed_data.get("sugar", 0),
        "type": intent_tab,
        "saved_filename": original_filename
    }

    # 5. 시간대별 코멘트 생성
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

    cafe_foods = [
        {"name": "아메리카노+허니브레드 세트", "price": 6500, "calories": 550},
        {"name": "아메리카노+조각케이크 세트", "price": 7000, "calories": 480},
        {"name": "바닐라라떼+마카롱 세트", "price": 6000, "calories": 380},
        {"name": "카페라떼+크로플 세트", "price": 7500, "calories": 420}
    ]

    single_foods = [
        {"name": "분식집 라면", "price": 4500, "calories": 500},
        {"name": "김밥천국 볶음밥", "price": 6000, "calories": 650},
        {"name": "치즈라면", "price": 5000, "calories": 550},
        {"name": "백반정식", "price": 7000, "calories": 700}
    ]
    
    if intent_tab == 'snack':
        pool = cafe_foods
    elif intent_tab == 'single':
        pool = single_foods
    else: # combo
        pool = night_foods if is_night else day_foods

    valid_pool = [f for f in pool if f["price"] > data["price"]]
    if not valid_pool:
        selected = max(pool, key=lambda x: x["price"])
    else:
        selected = random.choice(valid_pool)
        
    saved_price = selected["price"] - data["price"]
    if saved_price < 0:
        saved_price = 0
    saved_calories = selected["calories"] - data["kcal"]
    if saved_calories < 0:
        saved_calories = 0
        
    if intent_tab == 'snack':
        comment = f"오늘 간식, 카페에서 **{selected['name']}**({selected['price']:,}원) 먹는 대신 편의점을 선택하셨네요! 덕분에 디저트 지출 대비 **{saved_price:,}원**을 아끼고, **{saved_calories:,}kcal**를 세이브했습니다. 지갑과 건강을 모두 생각한 영리한 선택이에요! ☕🍰"
    elif intent_tab == 'single':
        comment = f"오늘 가벼운 식사, 식당에서 **{selected['name']}**({selected['price']:,}원) 먹는 대신 편의점을 선택하셨네요! 덕분에 식당 대비 식비 **{saved_price:,}원**을 아끼고, **{saved_calories:,}kcal**를 세이브했습니다. 가볍고 현명한 한 끼 식사네요! 🍜"
    else: # combo
        if is_night:
            comment = f"이 시간에 배달 앱 켜서 **{selected['name']}**({selected['price']:,}원) 때릴까했던 무서운 유혹, 편의점 조합으로 완벽 차단! 배달 지출 대비 무려 **{saved_price:,}원**을 통장에 세이브했고, 밤늦은 시간 **{saved_calories:,}kcal**의 폭탄을 비껴갔습니다. 오늘 밤 인내심이 몸과 지갑을 구원했네요! 🏆❌"
        else:
            comment = f"오늘 식사, 뜨끈한 **{selected['name']}**({selected['price']:,}원)의 유혹 대신 편의점 조합을 선택하셨네요! 덕분에 일반 외식 대비 식비 **{saved_price:,}원**을 아끼고, **{saved_calories:,}kcal**를 철벽 방어했습니다. 가성비와 건강을 모두 잡은 멋진 선택이에요! 🎉"
        
    # 국물류 나트륨 한 줄 치트키 (식사/조합 탭일 때만 작동)
    sodium_tip = None
    if intent_tab in ['single', 'combo']:
        if data["sodium"] > 1000:
            sodium_tip = "국물을 반만 남겨도 나트륨 섭취를 최대 50% 줄일 수 있어요! 면/건더기 위주로 가볍게 드시는 것을 추천합니다. 😉"
        
    # 3단계 가성비 검증 로직으로 동적 등급 및 설명 산출
    score, grade, grade_type, desc = calculate_grade(data["price"], data["protein"])

    # 데이터베이스에 분석 결과 영구 저장
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_history (
                product_name, brand, price, calories, carbs, protein, fat, sodium, sugar,
                score, grade, grade_type, desc, comment, sodium_tip, saved_price, saved_calories
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["name"], data["brand"], data["price"], data["kcal"],
            data["carbs"], data["protein"], data["fat"], data["sodium"], data["sugar"],
            score, grade, grade_type, desc,
            comment, sodium_tip, saved_price, saved_calories
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Insert Error: {e}")

    is_complete = parsed_data.get("is_complete", False)
    error_msg = parsed_data.get("error") or (parsed_data.get("warning_messages")[0] if parsed_data.get("warning_messages") else None)

    return jsonify({
        'status': 'success' if is_complete else 'fail',
        'error': error_msg,
        'product_name': data["name"],
        'brand': data["brand"],
        'price': data["price"],
        'calories': data["kcal"],
        'carbs': data["carbs"],
        'protein': data["protein"],
        'fat': data["fat"],
        'sodium': data["sodium"],
        'sugar': data["sugar"],
        'type': data["type"],
        'score': score,
        'grade': grade,
        'grade_type': grade_type,
        'desc': desc,
        'comment': comment,
        'sodium_tip': sodium_tip,
        'saved_price': saved_price,
        'saved_calories': saved_calories,
        'is_complete': is_complete,
        'warning_messages': parsed_data.get("warning_messages", [])
    })

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM analysis_history ORDER BY created_at DESC, id DESC")
        rows = cursor.fetchall()
        conn.close()
        
        history_list = []
        for row in rows:
            history_list.append({
                'id': row['id'],
                'product_name': row['product_name'],
                'brand': row['brand'],
                'price': row['price'],
                'calories': row['calories'],
                'carbs': row['carbs'],
                'protein': row['protein'],
                'fat': row['fat'],
                'sodium': row['sodium'],
                'sugar': row['sugar'],
                'score': row['score'],
                'grade': row['grade'],
                'grade_type': row['grade_type'],
                'desc': row['desc'],
                'comment': row['comment'],
                'sodium_tip': row['sodium_tip'],
                'saved_price': row['saved_price'],
                'saved_calories': row['saved_calories'],
                'created_at': row['created_at']
            })
        return jsonify(history_list), 200
    except Exception as e:
        return jsonify({'status': 'fail', 'message': str(e)}), 500

@app.route('/api/history', methods=['POST'])
def add_history():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'fail', 'message': '요청 데이터가 유효하지 않습니다.'}), 400
            
        product_name = data.get("product_name")
        if not product_name:
            return jsonify({'status': 'fail', 'message': '제품명은 필수 항목입니다.'}), 400

        price = data.get("price")
        if price is None or not isinstance(price, (int, float)) or price <= 0:
            return jsonify({'status': 'fail', 'message': '유효한 가격(1원 이상)이 필요합니다.'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_history (
                product_name, brand, price, calories, carbs, protein, fat, sodium, sugar,
                score, grade, grade_type, desc, comment, sodium_tip, saved_price, saved_calories
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("product_name"), data.get("brand"), data.get("price"), data.get("calories"),
            data.get("carbs"), data.get("protein"), data.get("fat"), data.get("sodium", 0), data.get("sugar", 0),
            data.get("score"), data.get("grade"), data.get("grade_type"), data.get("desc"),
            data.get("comment"), data.get("sodium_tip"), data.get("saved_price"), data.get("saved_calories")
        ))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success', 'message': '분석 이력이 DB에 저장되었습니다.'}), 201
    except Exception as e:
        return jsonify({'status': 'fail', 'message': str(e)}), 500

@app.route('/api/history', methods=['DELETE'])
@app.route('/api/history/<int:history_id>', methods=['DELETE'])
def clear_history(history_id=None):
    try:
        if history_id is None:
            history_id = request.args.get('id', type=int)
        if history_id is None and request.is_json and request.get_json(silent=True):
            history_id = request.get_json(silent=True).get('id')

        conn = get_db_connection()
        cursor = conn.cursor()

        if history_id is not None:
            cursor.execute("SELECT id FROM analysis_history WHERE id = ?", (history_id,))
            row = cursor.fetchone()
            if not row:
                conn.close()
                return jsonify({'status': 'fail', 'message': f'ID {history_id}에 해당하는 이력을 찾을 수 없습니다.'}), 404

            cursor.execute("DELETE FROM analysis_history WHERE id = ?", (history_id,))
            conn.commit()
            conn.close()
            return jsonify({'status': 'success', 'message': f'ID {history_id} 분석 이력이 삭제되었습니다.'}), 200
        else:
            cursor.execute("DELETE FROM analysis_history")
            conn.commit()
            conn.close()
            return jsonify({'status': 'success', 'message': '모든 분석 이력이 초기화되었습니다.'}), 200
    except Exception as e:
        return jsonify({'status': 'fail', 'message': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_recipe():
    return jsonify({'status': 'success', 'message': 'Bypassed by automatic mode'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)