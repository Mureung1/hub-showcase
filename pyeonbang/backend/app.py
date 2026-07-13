import os
from flask import Flask, request, jsonify

app = Flask(__name__)
# 이미지가 저장될 폴더 경로 설정 (backend 폴더 기준으로 상위의 images 폴더)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../images')

@app.route('/')
def home():
    # frontend 폴더에 있는 index.html 파일 경로 찾기
    html_path = os.path.join(os.path.dirname(__file__), '../frontend/index.html')
    # 파일을 읽어서 브라우저에 그대로 던져주기
    with open(html_path, 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/upload', methods=['POST'])
def upload_image():
    # 프론트엔드가 보낸 이미지 파일 꺼내기
    if 'image' not in request.files:
        return jsonify({'status': 'fail', 'message': '이미지 파일이 없습니다.'}), 400
        
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'status': 'fail', 'message': '선택된 파일이 없습니다.'}), 400

    if file:
        # images 폴더에 사진을 원본 이름 그대로 저장
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(file_path)
        
        # 우선은 잘 받았다는 신호만 프론트엔드로 리턴 (내일 여기에 OCR 엔진을 결합할 겁니다!)
        return jsonify({
            'status': 'success',
            'message': '서버에 사진 저장 완료!',
            'filename': file.filename
        })
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)