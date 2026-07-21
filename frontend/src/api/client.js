// ============================================================================
// api/client.js — 백엔드와 통신하는 axios "공용 도구"
// ----------------------------------------------------------------------------
// [axios] HTTP 요청(GET/POST 등)을 보내는 라이브러리. 브라우저 기본 fetch보다 기본값/에러처리/
//   JSON 변환이 편해 많이 쓴다. 각 요청은 Promise(미래의 결과)를 돌려준다.
// [인스턴스를 만드는 이유] baseURL·timeout 같은 공통 설정을 한 곳에 모으면 모든 API 함수가
//   재사용해 중복이 없다. 나중에 공통 헤더나 인터셉터(로깅·인증)도 여기 한 곳에서 추가하면 된다.
// ============================================================================

import axios from 'axios';

const apiClient = axios.create({
  // baseURL: 모든 요청 주소 앞에 자동으로 붙는 접두사.
  // '/api' 는 vite dev proxy(→ http://localhost:8080)를 통해 백엔드로 전달된다.
  // 즉 apiClient.get('/parking-lots') 는 실제로 GET /api/parking-lots 요청이 된다.
  baseURL: '/api',
  timeout: 10000, // 10초 안에 응답 없으면 요청 실패로 처리(무한 대기 방지)
});

export default apiClient;
