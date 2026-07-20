# Run Report: Phase 2 공개 release smoke

## 1. 공개 경로

- Web: `https://localtwin-product.vercel.app`
- API: `https://localtwin-api.onrender.com`
- Runtime DB: 별도 production Supabase PostgreSQL

## 2. API smoke

- `/health`, `/ready`: HTTP 200
- `/api/v1/analysis/periods?category=카페`: `20251`, latest complete quarter
- 연남 카페 상권 분석: HTTP 200, flow time buckets 6개
- `연남` 검색: HTTP 200, 결과 3개
- 연남 중심 반경 300m 카페: HTTP 200
- Vercel origin CORS 허용
- Scene API: 제품 환경 HTTP 404 유지

## 3. Web smoke

- 첫 URL은 query string 없는 neutral entry다.
- API 성공 문구와 2025.1Q selector가 표시된다.
- 카페 핵심 지표 안내와 용어 details가 표시된다.
- 주변 점포 33개 중 5개와 전체보기 동선이 표시된다.
- mobile·tablet·desktop, dialog Escape·focus return, 200% zoom을 로컬 동일 build에서 확인했다.

## 4. Release 식별자

- Git branch: `develop`
- Render live commit: `adb230e`
- Vercel deployment: `dpl_CodTSVSaz75AWXtNBZYerfGHkC9E`

## 5. Security note

배포 설정 과정에서 출력된 production DB credential은 즉시 회전했다. 새 값은 저장소·문서·브라우저 bundle에 기록하지 않았고, 이전 값은 폐기했다.
