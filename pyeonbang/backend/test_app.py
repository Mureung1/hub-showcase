import os
import unittest
import sqlite3
import io
import json
from app import app, UPLOAD_FOLDER

class PyeonbangTestCase(unittest.TestCase):
    def setUp(self):
        # Flask 테스트 모드 설정
        app.config['TESTING'] = True
        self.app = app.test_client()
        
        # 테스트용 임시 데이터베이스 경로 설정
        self.db_path = os.path.join(os.path.dirname(__file__), 'test_pyeonbang.db')
        app.config['DATABASE'] = self.db_path
        
        # 테스트 실행 전 DB 초기화 및 테이블 생성
        self.init_db()

    def tearDown(self):
        # 테스트 완료 후 DB 파일 제거
        if os.path.exists(self.db_path):
            try:
                os.remove(self.db_path)
            except PermissionError:
                pass

    def init_db(self):
        # 테스트용 DB에 테이블을 생성합니다. (app.py에 들어갈 스키마와 동일)
        conn = sqlite3.connect(self.db_path)
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

    def test_home_page(self):
        """메인 페이지 로딩 테스트"""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_upload_image_and_save_to_db(self):
        """이미지 업로드 및 DB 저장 테스트"""
        # test1.jpg 가짜 파일을 전송 (파일명으로 Mock 매핑 발생)
        data = {
            'image': (io.BytesIO(b"dummy image bytes"), 'test1.jpg'),
            'price': '1800',
            'intent_tab': 'combo'
        }
        
        response = self.app.post('/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 200)
        
        result = json.loads(response.data)
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['product_name'], '오모리 김치찌개라면')
        self.assertEqual(result['brand'], 'GS25')
        
        # DB에 저장되었는지 확인
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM analysis_history WHERE product_name = '오모리 김치찌개라면'")
        row = cursor.fetchone()
        conn.close()
        
        self.assertIsNotNone(row)
        # DB 컬럼 값 검증 (예: 가격이 1800으로 잘 들어갔는지)
        self.assertEqual(row[3], 1800)  # price 컬럼 인덱스 3

    def test_get_history_from_db(self):
        """DB에 저장된 히스토리 조회 API 테스트"""
        # DB에 미리 테스트 데이터 2건 적재
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_history (product_name, brand, price, calories, carbs, protein, fat, score, grade, grade_type, comment, saved_price, saved_calories)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('테스트제품1', 'CU', 2000, 150, 10, 15, 3, 7.5, '1등급', 'green', '좋은 선택입니다.', 5000, 800))
        
        cursor.execute("""
            INSERT INTO analysis_history (product_name, brand, price, calories, carbs, protein, fat, score, grade, grade_type, comment, saved_price, saved_calories)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('테스트제품2', 'GS25', 3000, 200, 20, 10, 5, 3.3, '2등급', 'yellow', '보통입니다.', 4000, 600))
        conn.commit()
        conn.close()
        
        # GET /api/history 호출
        response = self.app.get('/api/history')
        self.assertEqual(response.status_code, 200)
        
        history = json.loads(response.data)
        self.assertEqual(len(history), 2)
        # 최신 등록순으로 정렬되었는지 확인
        self.assertEqual(history[0]['product_name'], '테스트제품2')
        self.assertEqual(history[1]['product_name'], '테스트제품1')

    def test_add_history_direct(self):
        """POST /api/history 직접 데이터 추가 API 테스트"""
        payload = {
            'product_name': '조합 제품 테스트',
            'brand': '조합 상품',
            'price': 4000,
            'calories': 500,
            'carbs': 50,
            'protein': 25,
            'fat': 10,
            'score': 6.25,
            'grade': '2등급 (보통)',
            'grade_type': 'yellow',
            'comment': '조합 저장 테스트 코멘트',
            'saved_price': 2500,
            'saved_calories': 400
        }
        
        response = self.app.post(
            '/api/history',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        
        # DB에 정상 저장되었는지 확인
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM analysis_history WHERE product_name = '조합 제품 테스트'")
        row = cursor.fetchone()
        conn.close()
        
        self.assertIsNotNone(row)
        self.assertEqual(row[1], '조합 제품 테스트')
        self.assertEqual(row[10], 6.25) # score 컬럼 인덱스 10

    def test_clear_history(self):
        """DELETE /api/history 전체 삭제 API 테스트"""
        # 먼저 데이터 1건 삽입
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_history (product_name, brand, price, calories, carbs, protein, fat, score, grade, grade_type, comment, saved_price, saved_calories)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('삭제테스트', 'CU', 1000, 100, 10, 10, 10, 10.0, '1등급', 'green', '설명', 1000, 100))
        conn.commit()
        conn.close()
        
        # DELETE 호출
        response = self.app.delete('/api/history')
        self.assertEqual(response.status_code, 200)
        
        # 조회해서 비어있는지 확인
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM analysis_history")
        count = cursor.fetchone()[0]
        conn.close()
        self.assertEqual(count, 0)

    def test_delete_specific_history(self):
        """DELETE /api/history/<id> 또는 /api/history?id=<id> 특정 항목 삭제 API 테스트"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_history (product_name, brand, price, calories, carbs, protein, fat, score, grade, grade_type, comment, saved_price, saved_calories)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('아이템1', 'CU', 1000, 100, 10, 10, 10, 10.0, '1등급', 'green', '설명', 1000, 100))
        item_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # 특정 ID 삭제 호출
        response = self.app.delete(f'/api/history/{item_id}')
        self.assertEqual(response.status_code, 200)

        # DB에서 해당 ID 조회해서 삭제되었는지 확인
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM analysis_history WHERE id = ?", (item_id,))
        count = cursor.fetchone()[0]
        conn.close()
        self.assertEqual(count, 0)

    def test_upload_invalid_price(self):
        """잘못된 가격 입력 시 400 에러 반환 검증 테스트"""
        data1 = {
            'image': (io.BytesIO(b"dummy image bytes"), 'test1.jpg'),
            'price': '-500',
            'intent_tab': 'combo'
        }
        response = self.app.post('/upload', data=data1, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 400)
        result = json.loads(response.data)
        self.assertEqual(result['status'], 'fail')

        data2 = {
            'image': (io.BytesIO(b"dummy image bytes"), 'test1.jpg'),
            'price': 'abc',
            'intent_tab': 'combo'
        }
        response = self.app.post('/upload', data=data2, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 400)

    def test_add_history_invalid_payload(self):
        """유효하지 않은 히스토리 저장 요청 시 400 에러 반환 검증 테스트"""
        payload = {'product_name': '', 'price': 1000}
        response = self.app.post('/api/history', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)

        payload = {'product_name': '테스트', 'price': 0}
        response = self.app.post('/api/history', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
