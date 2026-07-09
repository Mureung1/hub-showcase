# client/src/api

이 디렉토리는 백엔드 API 서버와의 데이터 비동기 통신을 담당하는 모듈들이 모여 있는 곳입니다.

## 역할 및 설계 방향
- `axios.ts`: 공통 `axiosInstance`를 설정하고, 서버 주소(Base URL) 및 헤더 구성을 처리합니다.
- **인증 연동 계획**: 추후 JWT가 도입되면 이 파일 내의 Axios Request Interceptor를 활성화하여 로컬스토리지에 저장된 JWT 토큰을 모든 요청의 헤더(`Authorization: Bearer <Token>`)에 자동으로 담아 전송하도록 수정합니다.
