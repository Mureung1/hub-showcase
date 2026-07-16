# DEPLOY-003 첫 제품 Web 배포 Run Report

## 배포 결과

- 제품 Web 프로젝트: `localtwin-product`
- 공개 URL: `https://localtwin-product.vercel.app`
- 상태: Vercel Production `Ready`
- Web API 경로: `https://localtwin-api.onrender.com`
- 현재 데이터 경로: 공개 FastAPI 연결 완료, production DB 미구성으로 canonical snapshot fallback

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
- API 데이터 조회 실패가 정상 데이터로 위장되지 않고 snapshot 안내로 표시됨

## Render API Smoke

- `GET /health`: HTTP 200, `{"status":"ok"}`
- 제품 Web origin의 CORS preflight: HTTP 200
- `Access-Control-Allow-Origin`: `https://localtwin-product.vercel.app`
- 제품 환경 Scene API: HTTP 404
- 검색 API: production `DATABASE_URL` 미구성으로 HTTP 503

## CORS 환경 분리

- `development/test`: `CORS_ORIGINS_LOCAL` 사용
- `staging/production`: `CORS_ORIGINS_SERVER` 사용
- production에서 빈 server origin, localhost, `127.0.0.1`, wildcard 차단
- CORS·설정 test 12개 통과

## 남은 Release Gate

- production Supabase 생성과 migration·seed
- Render service에 production `DATABASE_URL` secret 설정
- SQLite 직접 분석 조회의 runtime PostgreSQL 전환
- 실제 검색·상권 분석 FE-BE smoke test
