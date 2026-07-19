# DEPLOY-003 첫 제품 Web 배포 Run Report

## 배포 결과

- 제품 Web 프로젝트: `localtwin-product`
- 공개 URL: `https://localtwin-product.vercel.app`
- 상태: Vercel Production `Ready`
- Web API 경로: `https://localtwin-api.onrender.com`
- 현재 데이터 경로: Vercel Web -> Render FastAPI -> production Supabase PostgreSQL

## 경계 검증

- `/`: HTTP 200
- `/data/processed/localtwin.db`: HTTP 404
- `/apps/api/src/localtwin_api/main.py`: HTTP 404
- `/.env`: HTTP 404
- `/.harness/tasks/ANALYSIS-006-peer-ranking.md`: HTTP 404

## 브라우저 Smoke

- `LocalTwin` title과 상권 분석 workspace 렌더링
- 지도, 점포 marker, 3D asset과 분석 panel 렌더링
- Docs 링크가 독립 문서 Vercel 프로젝트를 가리킴
- production Web bundle에 Render API URL이 포함됨
- API 데이터 조회 실패가 정상 데이터로 위장되지 않고 오류·재시도로 표시됨
- Demo snapshot은 명시적인 `VITE_DEMO_MODE=true`에서만 사용됨

## Render API Smoke

- `GET /health`: HTTP 200, `{"status":"ok"}`
- 제품 Web origin의 CORS preflight: HTTP 200
- `Access-Control-Allow-Origin`: `https://localtwin-product.vercel.app`
- 제품 환경 Scene API: HTTP 404
- `/ready`: HTTP 200
- 완결 분기 API: `20251`, `latest_complete_quarter`
- 상권 분석 API: HTTP 200, 실제 6개 유동인구 시간 구간
- 검색 API: HTTP 200, `연남` 3개 결과 확인
- 반경 300m 카페 조회: HTTP 200

## CORS 환경 분리

- `development/test`: `CORS_ORIGINS_LOCAL` 사용
- `staging/production`: `CORS_ORIGINS_SERVER` 사용
- production에서 빈 server origin, localhost, `127.0.0.1`, wildcard 차단
- CORS·설정 test 12개 통과

## 2026-07-19 Release 갱신

- Render commit: `adb230e`, 상태 `live`
- Vercel deployment: `dpl_CodTSVSaz75AWXtNBZYerfGHkC9E`, production alias 갱신
- 공개 Web에서 실제 API 결과, 2025.1Q selector, 업종별 핵심 지표, 주변 점포 33개 중 5개 표시 확인
- public origin CORS: `https://localtwin-product.vercel.app`
- 제품 환경 Scene API는 계속 HTTP 404로 차단
- 배포 중 browser output에 노출된 production DB credential은 즉시 회전하고 Render와 local production env를 동기화했다. 이전 credential은 폐기됐다.
