# Vercel·Render 배포 가이드

## 배포 구조

- Vercel: React/Vite 프런트엔드
- Render: Express API
- Supabase: 재료와 추천 캐시 데이터
- Gemini: Render 서버에서만 호출

## 현재 프로덕션

| 구분 | URL |
|---|---|
| 프런트엔드 | `https://todays-fridge-n091.vercel.app` |
| API 헬스 체크 | `https://todays-fridge-api-n091.onrender.com/api/health` |

### 2026-07-28 배포 검증

- Vercel 공개 URL 접속과 정적 자산 로딩 성공
- Render API를 통한 Supabase 재료 23개 조회 성공
- `소비기한부터 챙길래요` 조건으로 Gemini 추천 생성 성공
- `소고기 채소 볶음밥` 추천 결과와 레시피 상세 화면 로딩 성공
- 브라우저 콘솔 오류 없음
- 로컬 회귀 검증: 테스트 111개, lint, production build 통과

재료 등록·수정·삭제와 장애·재시도 UI의 공개 환경 검증은 배포 이슈 `#57`의
잔여 작업으로 유지한다.

비밀 키는 GitHub나 Vercel 프런트엔드에 저장하지 않는다. `SUPABASE_SECRET_KEY`와
`GEMINI_API_KEY`는 Render 환경변수에만 입력한다.

## 1. Render API 배포

저장소 루트의 `render.yaml`을 사용하는 Blueprint로 배포한다.

1. Render Dashboard에서 **New → Blueprint**를 선택한다.
2. GitHub의 `hub` 저장소를 연결한다.
3. Blueprint 파일 경로는 기본값인 `render.yaml`을 사용한다.
4. 최초 생성 화면에서 다음 비밀값을 입력한다.

| 환경변수 | 값 |
|---|---|
| `CLIENT_ORIGIN` | 최초 배포에서는 임시로 `http://localhost:5173` |
| `SUPABASE_URL` | 사용 중인 Supabase 프로젝트 URL |
| `SUPABASE_SECRET_KEY` | 서버 전용 Supabase Secret Key |
| `GEMINI_API_KEY` | Gemini API Key |

`NODE_ENV`, `LOG_LEVEL`, `GEMINI_MODEL`은 Blueprint에 안전한 기본값이 선언되어 있다.
Render가 제공하는 `PORT`는 직접 등록하지 않는다.

배포가 끝나면 아래 주소가 `200`과 JSON을 반환하는지 확인한다.

```text
https://<render-service>.onrender.com/api/health
```

## 2. Vercel 프런트엔드 배포

1. Vercel Dashboard에서 **Add New → Project**를 선택한다.
2. 같은 `hub` 저장소를 Import한다.
3. Production Branch는 `N091_박창현`으로 설정한다.
4. Root Directory는 저장소 루트인 `./`을 유지한다.
5. 저장소의 `vercel.json`이 다음 설정을 적용한다.
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Vercel 프로젝트 환경변수에 아래 값을 추가한다.

| 환경변수 | 값 |
|---|---|
| `VITE_API_BASE_URL` | `https://<render-service>.onrender.com` |
| `VITE_BASE_PATH` | `/` |

환경변수를 추가하거나 수정한 뒤에는 새 배포가 필요하다.

## 3. CORS 연결

Vercel의 Production URL이 확정되면 Render 서비스의 `CLIENT_ORIGIN`을 아래처럼 변경한다.

```text
https://<vercel-project>.vercel.app
```

저장 후 Render 서비스를 다시 배포하거나 재시작한다.

## 4. 배포 검증

다음 순서로 실제 공개 URL에서 확인한다.

1. Render `/api/health` 응답 확인
2. Vercel 페이지의 정적 자산과 화면 로딩 확인
3. 냉장고 재료 조회
4. 재료 등록·수정
5. Gemini 레시피 추천
6. 레시피 상세 확인
7. 사용 재료 차감
8. 새로고침 후 DB 수량 유지 확인

## 문제 해결

### 화면은 열리지만 API 요청이 실패함

- Vercel의 `VITE_API_BASE_URL`에 `/api`를 붙이지 않았는지 확인한다.
- 환경변수 변경 후 Vercel을 다시 배포했는지 확인한다.
- Render 서비스가 절전 상태였다면 첫 요청에 시간이 걸릴 수 있다.

### 브라우저에서 CORS 오류가 발생함

- Render의 `CLIENT_ORIGIN`이 Vercel Production URL과 정확히 같은지 확인한다.
- 마지막 `/`를 제외하고 `https://`를 포함한다.

### Render가 시작되지 않음

- 필수 환경변수 네 개가 모두 입력되었는지 확인한다.
- Start Command가 `npm start`인지 확인한다.
- Render 로그에서 `Invalid environment configuration` 항목을 확인한다.

### Vercel에서 CSS나 JS가 404임

- Vercel의 `VITE_BASE_PATH`가 `/`인지 확인한다.
- Output Directory가 `dist`인지 확인한다.

## GitHub Pages 호환

Vite의 기본 프로덕션 경로는 Vercel에 맞춰 `/`를 사용한다. 기존 GitHub Pages
워크플로는 빌드할 때만 `VITE_BASE_PATH=/hub/`를 주입하므로 Pages 배포도 유지된다.
