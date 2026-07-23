# 배포 계획

## 현재 상태

GitHub Pages는 React 정적 파일을 정상적으로 제공하지만 Express API를 실행하지 않는다. 배포된 프런트엔드가 `/api/ingredients`와 `/api/recommendations`를 같은 도메인으로 호출해 `404`를 받으므로 핵심 기능을 사용할 수 없다.

현재 우선순위는 추천 기능의 품질 개선이다. 백엔드 배포는 품질 기준과 회귀 테스트를 정리한 후 별도 작업으로 진행한다.

## 목표

배포 환경에서 다음 기능이 로컬과 동일하게 동작해야 한다.

- 재료 목록 조회·등록·수정·삭제
- Supabase 재료 기반 Gemini 추천
- 추천 정책 검증과 캐시
- 오류 응답과 재시도 UI
- Gemini 및 Supabase 비밀키의 서버 전용 보관

## 후보 구조

### 정적 프런트 + 관리형 Express 서버

- GitHub Pages와 현재 Express 코드를 유지한다.
- Render 같은 관리형 Web Service에 API 서버를 배포한다.
- 기존 코드 변경이 가장 적지만 무료 서비스는 절전과 콜드 스타트가 발생할 수 있다.

### GitHub Pages + Supabase Edge Functions

- 기존 Supabase 프로젝트 안에서 API와 Gemini 호출을 실행한다.
- 별도 서버 업체는 필요 없지만 Express 서비스를 Edge Function으로 이전해야 한다.

### 프런트와 백엔드 통합 호스팅

- 정적 프런트와 API를 하나의 배포 플랫폼으로 옮긴다.
- 배포 단위는 단순해지지만 현재 GitHub Pages 워크플로와 서버 구성을 함께 변경해야 한다.

## 이미 준비된 호환 계층

- 로컬 개발에서는 `VITE_API_BASE_URL`을 비워 두고 Vite의 `/api` 프록시를 사용한다.
- 배포 시 `VITE_API_BASE_URL`에 선택한 백엔드의 HTTPS 주소를 넣을 수 있다.
- Express 서버는 관리형 호스팅에서 사용할 수 있도록 `0.0.0.0`에 바인딩한다.

이 준비는 특정 호스팅을 활성화하지 않으며 기존 GitHub Pages 빌드에도 영향을 주지 않는다.

## 실행 단계

1. 추천 품질 기준과 회귀 테스트를 완료한다.
2. 예상 트래픽, 무료 플랜 제약, 운영 복잡도를 비교해 백엔드 플랫폼을 선택한다.
3. 선택한 플랫폼에 API 서버 또는 Edge Function을 배포한다.
4. 서버에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`를 비밀값으로 등록한다.
5. GitHub Pages 빌드에 `VITE_API_BASE_URL`을 주입한다.
6. 공개 URL에서 재료 CRUD와 실제 Gemini 추천을 통합 검증한다.
7. 헬스 체크, 로그, 호출 제한과 장애 알림을 설정한다.

## 완료 기준

- 공개 페이지에서 초기 재료 조회가 성공한다.
- 재료 CRUD가 Supabase에 반영된다.
- 추천 API가 레시피 3개를 반환한다.
- API 키와 Supabase Secret Key가 프런트 번들에 포함되지 않는다.
- 허용한 프런트 Origin만 CORS를 통과한다.
- 서버 장애 시 기존 오류 UI와 재시도가 동작한다.
- 배포 후 헬스 체크와 통합 검증 결과가 기록된다.
