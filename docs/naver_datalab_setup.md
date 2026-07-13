# 네이버 데이터랩 API 연동 가이드

ShortsGen에서 실제 트렌드 검색량 데이터를 받아오려면 네이버 데이터랩 API 키가 필요합니다. 이 가이드에 따라 발급받고 설정하면 됩니다.

---

## 📝 1단계: 네이버 개발자센터 가입

1. [네이버 개발자센터](https://developers.naver.com)에 접속합니다.
2. 상단 **"로그인"** 클릭 (또는 "회원가입" 후 로그인).
3. 네이버 계정으로 로그인합니다.

---

## 🔑 2단계: 애플리케이션 등록

1. 로그인 후, 상단 메뉴에서 **"Application"** → **"Create App"** (또는 한국어로는 **"애플리케이션"** → **"새 애플리케이션"**)을 선택합니다.
2. 다음 정보를 입력합니다:
   - **Application Name**: `ShortsGen` (또는 원하는 이름)
   - **Description**: `소상공인 AI 숏폼 콘텐츠 대시보드 - 트렌드 분석용`
   - **Use API**: 체크박스에서 **"데이터랩(Data Lab) - 검색어 트렌드"** 또는 **"Search Datalab"** 선택
   - **Environment**: `Production` 또는 `Development` 선택 (테스트라면 Development)

3. **"Create"** 또는 **"등록"** 클릭합니다.

---

## 🔐 3단계: Client ID/Secret 발급

1. 애플리케이션 등록이 완료되면 대시보드로 이동합니다.
2. 방금 만든 애플리케이션 이름을 클릭해 상세 페이지로 들어갑니다.
3. 페이지 하단에서 다음 두 항목을 찾습니다:
   - **Client ID**
   - **Client Secret**

4. 두 항목을 복사하여 안전한 장소에 메모해둡니다 (**Secret은 노출되지 않도록 주의!**).

---

## ⚙️ 4단계: `.env` 파일에 설정

1. 프로젝트의 `backend/` 디렉토리에서 `.env` 파일을 엽니다 (없으면 생성).
   ```bash
   cd backend
   nano .env   # 또는 텍스트 에디터로 열기
   ```

2. 다음 두 줄을 추가합니다 (복사한 값으로 대체):
   ```
   NAVER_CLIENT_ID=your-client-id-here
   NAVER_CLIENT_SECRET=your-client-secret-here
   ```

3. 파일을 저장합니다 (`Ctrl+S` 또는 `Cmd+S`).

### 예시:
```env
# Server Configuration
PORT=5000

# Naver DataLab API
NAVER_CLIENT_ID=abc123def456ghi789
NAVER_CLIENT_SECRET=jkl123mno456pqr789
```

---

## ✅ 5단계: 백엔드 재시작

1. 터미널에서 백엔드 서버를 재시작합니다:
   ```bash
   npm start
   ```

2. 로그를 확인합니다:
   ```
   [ShortsGen Backend] Server running on http://localhost:5000
   ```

3. 트렌드 API 호출을 테스트합니다:
   ```bash
   curl "http://localhost:5000/api/trends?category=카페"
   ```

   - **API 키가 설정됨**: 실제 네이버 검색량 데이터 반환 (JSON 형태)
   - **API 키가 미설정**: seed 데이터 반환 + 경고 로그 출력

---

## 🧪 테스트

### 백엔드에서 직접 테스트
```bash
# 카페 트렌드 조회
curl "http://localhost:5000/api/trends?category=카페"

# 음식점 트렌드 조회
curl "http://localhost:5000/api/trends?category=음식점"
```

### 브라우저에서 테스트
1. Dashboard 화면 접속: `http://localhost:5173/dashboard`
2. 가게 정보를 카페로 저장 (Setup 화면 이용)
3. Dashboard의 "오늘의 트렌드" 섹션에서 실제 데이터가 표시되는지 확인

---

## 🔍 트러블슈팅

### "트렌드 데이터가 없습니다" 메시지
- **원인**: API 키가 설정되지 않았거나 잘못 입력됨
- **해결**: `.env` 파일의 `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` 재확인 후 서버 재시작

### 네이버 API 호출 실패 (401/403 에러)
- **원인**: Client ID/Secret이 잘못되거나 API 사용량 초과
- **해결**: 
  1. [개발자센터](https://developers.naver.com)에서 키 재확인
  2. 네이버 공지사항에서 서비스 상태 확인

### 응답이 빈 배열인 경우
- **원인**: 해당 카테고리에 대한 데이터가 아직 DB에 없음 (API는 호출되었지만 결과가 없음)
- **해결**: 시간을 두고 다시 시도하거나, 네이버 API 로그 확인

---

## 📚 참고 자료

- [네이버 개발자센터](https://developers.naver.com)
- [데이터랩(Data Lab) API 문서](https://developers.naver.com/docs/datalab/overview/)
- [ShortsGen README](../README.md)
