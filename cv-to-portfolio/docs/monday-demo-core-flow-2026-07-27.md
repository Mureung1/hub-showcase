# 월요일 데모 핵심 흐름과 완료 기록

작성일: 2026-07-27

## 이번 데모에서 보여줄 한 가지 흐름

**QANDA Frontend Engineer에 지원하는 김지우의 CV를 Minimal Clean 포트폴리오로 만들고,
Supabase에 저장한 뒤 다시 조회한다.**

사용자는 다음 순서로 기능을 사용한다.

1. 기업·채용 공고 목록에서 `QANDA · Frontend Engineer`를 선택한다.
2. 인재상, JD 핵심 업무, 포트폴리오 강조점을 확인한다.
3. 개발자 샘플 CV를 입력하고 파싱된 이름·직함·경력 정보를 확인한다.
4. `Minimal Clean` 디자인을 선택해 포트폴리오를 생성한다.
5. 결과 화면에서 지원 목표와 생성된 HTML을 확인한다.
6. `현재 결과 저장`을 눌러 Express를 통해 Supabase에 저장한다.
7. 목록과 상세 API로 방금 저장한 결과를 다시 조회한다.

## 데이터가 흐르는 경로

```text
기업·공고 선택 + CV + 디자인
  → React state
  → POST /api/generate
  → AI 실패 시 안전한 로컬 렌더러
  → 결과 화면의 현재 결과 저장
  → POST /api/portfolios
  → Express 입력 검증·DTO 변환
  → Supabase portfolios INSERT
  → GET /api/portfolios
  → GET /api/portfolios/:id
  → React 최근 포트폴리오와 미리보기 갱신
```

생성 API가 실패해도 로컬 렌더러가 CV에 없는 경험을 추가하지 않고 JD 표식이 포함된 HTML을
완성한다. 데모의 필수 수직슬라이스는 생성된 결과를 실제 DB에 저장하고 다시 읽는 흐름이다.

## 월요일까지 끝낸 기능

| 우선순위 | 작업 | 완료 기준 | 결과 |
| --- | --- | --- | --- |
| P0 | 기업·공고 선택 | 5개 공고 중 하나를 고르고 JD 요약을 볼 수 있다 | 완료 |
| P0 | CV·디자인 기반 생성 | QANDA 지원 목표가 포함된 HTML 결과를 볼 수 있다 | 완료 |
| P0 | FE → Express → Supabase 저장 | 저장 성공 메시지와 UUID가 생성된다 | 완료 |
| P0 | Supabase 목록·상세 조회 | 새로고침 뒤에도 최신 행과 HTML을 다시 조회한다 | 완료 |
| P0 | 구버전 DB 스키마 호환 | `is_favorite`가 없어도 저장·목록·상세 조회가 동작한다 | 완료 |
| P0 | 자동 검증 | client/server test, lint, build가 통과한다 | 완료 |

## 이후로 미룬 기능

| 우선순위 | 기능 | 미룬 이유 |
| --- | --- | --- |
| P1 | 실제 AI 문장 재구성 안정화 | 현재 API 요청이 실패해 로컬 렌더러가 대신 동작한다. 모델·키·오류 응답을 별도 점검한다. |
| P1 | 즐겨찾기 실제 DB 영속화 | 원격 Supabase에 `202607230001_add_portfolio_favorite.sql` 적용이 필요하다. |
| P1 | 저장 행에 기업·공고 메타데이터 분리 저장 | 현재는 생성 HTML 안에 QANDA 문맥이 남지만 목록에서 기업별 필터는 제공하지 않는다. |
| P2 | PDF·DOCX 입력 | 핵심 마크다운 CV 흐름과 무관하므로 데모 이후로 미룬다. |
| P2 | UI 미세 조정·애니메이션 | 핵심 저장·조회 동작을 먼저 확정한다. |
| P2 | 라이브 배포·데모 영상 | 로컬 검증과 PR 이후 배포 환경을 정한다. |

## 문제를 화면·서버·DB로 나눈 결과

| 구간 | 확인 방법 | 결과 |
| --- | --- | --- |
| 화면 | 브라우저로 QANDA → 개발자 CV → Minimal Clean → 생성 실행 | 결과 화면과 JD 표식 표시 |
| 생성 서버 | `POST /api/generate` 결과 메시지 확인 | 실패, 로컬 fallback으로 완료 |
| API 서버 | `GET /api/health` | `status=ok`, AI·DB 설정 인식 |
| DB 목록 | `GET /api/portfolios?limit=3` | 최초 실패: 원격 DB에 `is_favorite` 없음 |
| 호환 수정 | PostgREST `42703`이면 구버전 컬럼으로 한 번 재요청 | 저장·목록·상세 복구 |
| DB 저장 | 결과 화면에서 저장 버튼 클릭 | `김지우 포트폴리오를 저장했습니다` 표시 |
| DB 재조회 | 브라우저 새로고침 뒤 최신 UUID 상세 조회 | HTML 10,104자, `QANDA` 포함 |

검증에 사용한 최신 저장 행:

- UUID: `d57fc0df-4b37-4b3d-8fca-c28e31641402`
- 생성 시각: `2026-07-27T09:51:39.490609+00:00`
- 이름·직함: `김지우 · Frontend Engineer`
- 상세 HTML에 `QANDA` 포함: `true`

## 자동 검증 결과

```bash
npm test
npm run lint
npm run build
```

- Client: 17개 통과
- Server: 14개 통과
- ESLint: 통과
- Vite production build: 통과
- 실제 브라우저 저장 성공: 통과
- 새로고침 후 Supabase 목록·상세 조회: 통과

## 데모 중 설명할 한 문장

“기업과 공고를 먼저 선택하면 React가 CV와 디자인을 함께 구성하고, 완성된 HTML은 Express의
검증을 거쳐 Supabase에 저장됩니다. 새로고침 뒤에도 목록과 상세 조회로 같은 결과를 다시
불러올 수 있습니다.”
