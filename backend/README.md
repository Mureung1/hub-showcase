# 하소AI 백엔드

## 폴더 구조
```
app/
  main.py           ← FastAPI 앱 진입점, CORS 설정
  routers/
    health.py       ← 서버 동작 확인용 (/health)
  services/         ← 3주차에 GPT/날씨/공휴일 호출 로직 들어갈 자리 (지금은 비어있음)
requirements.txt
.env.example         ← 이 파일 복사해서 .env 만들고 실제 키 채우기
```

## 실행 방법

### 1. 가상환경 만들기
```bash
python -m venv venv
```

### 2. 가상환경 켜기
- Mac/Linux: `source venv/bin/activate`
- Windows(PowerShell): `venv\Scripts\Activate.ps1`

### 3. 패키지 설치
```bash
pip install -r requirements.txt
```

### 4. .env 파일 만들기
```bash
cp .env.example .env
```
지금은 키 없이 비워둬도 됨 (3주차에 실제 키 넣을 예정).

### 5. 서버 실행
```bash
uvicorn app.main:app --reload
```

### 6. 확인
브라우저에서 `http://127.0.0.1:8000/health` 접속했을 때 아래처럼 뜨면 성공:
```json
{"status": "ok"}
```

자동 문서화 화면도 확인 가능: `http://127.0.0.1:8000/docs`
