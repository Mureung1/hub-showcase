# DEPLOY-003 첫 제품 Web 배포 Run Report

## 배포 결과

- 제품 Web 프로젝트: `localtwin-product`
- 공개 URL: `https://localtwin-product.vercel.app`
- 상태: Vercel Production `Ready`
- 현재 데이터 경로: 공개 FastAPI 미연결, canonical snapshot fallback

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
- API 미연결 상태가 정상 데이터로 위장되지 않고 snapshot 안내로 표시됨

## CORS 환경 분리

- `development/test`: `CORS_ORIGINS_LOCAL` 사용
- `staging/production`: `CORS_ORIGINS_SERVER` 사용
- production에서 빈 server origin, localhost, `127.0.0.1`, wildcard 차단
- CORS·설정 test 12개 통과

## 남은 Release Gate

- production Supabase 생성과 migration·seed
- FastAPI Render service 생성과 `DATABASE_URL` secret 설정
- SQLite 직접 분석 조회의 runtime PostgreSQL 전환
- `VITE_API_BASE_URL`을 공개 API로 설정한 Web 재배포와 smoke test
