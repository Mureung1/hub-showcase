# 공지 탐색 출처

## 현재 지원 출처

| 출처 ID | 이름 | 목록 URL | 상세 본문 추출 |
| --- | --- | --- | --- |
| `knu-main-notices` | 경북대학교 공지사항 | `https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/list.action?bbs_cde=1&menu_idx=67` | 지원하지 않음 |

이 출처는 공개 목록 HTML의 `title`, `url`, `publishedAt`만 읽는다. 후보 구조의 `category`, `snippet`, `deadline`은 목록에서 확인할 수 없어 `null`로 둔다. 상세 본문은 자동으로 가져오지 않으므로, 분석할 때 원문 공고를 직접 붙여넣어야 한다.

## 안전한 출처 추가 규칙

1. `server/sources/adapters/`에 출처별 어댑터를 만든다.
2. 목록 URL과 허용 호스트를 코드에 명시한다. 사용자 입력 URL을 `/api/discover`에서 가져오지 않는다.
3. 어댑터는 `id`, `title`, `url`, `publishedAt`, `category`, `snippet`, `deadline`, `sourceId`, `sourceName`, `discoveredAt` 후보 구조를 반환한다. 알 수 없는 값은 `null`로 둔다.
4. 목록 HTML 구조가 달라져 파싱할 수 없으면 빈 성공 결과로 숨기지 말고 파싱 실패 오류를 반환한다.
5. 새 어댑터에는 실제 목록의 최소 HTML fixture와 파서 테스트를 추가한다.
6. 사이트 목록 구조가 바뀌면 해당 `server/sources/adapters/<source>.js`와 fixture를 함께 수정한다. 현재 출처는 `server/sources/adapters/knuNoticesSource.js`가 담당한다.
7. 로봇 정책, 서비스 약관, 접근 제한을 확인한 공개 목록만 등록하고, 요청량을 최소화한다. 로그인, 유료벽, CAPTCHA, 개인화 페이지는 지원하지 않는다.

## API 계약

- `GET /api/sources`: 프론트엔드 선택용 공개 출처 메타데이터를 반환한다.
- `GET /api/discover?sourceId=...&keyword=...&limit=20`: 등록된 출처 하나의 후보 목록을 반환한다.

응답 후보에는 본문 원문을 포함하지 않는다. 후보의 “분석 화면으로”는 URL과 제목을 분석 입력 화면에 채우는 UI 동작이며, 자동 AI 분석을 실행하지 않는다.

## 운영 제한

- 서버는 등록된 목록 URL만 요청한다.
- 요청은 기존 서버의 공개 호스트 검사, 타임아웃, 응답 크기 제한을 사용한다.
- 최종 리다이렉트 호스트와 HTML Content-Type을 다시 검사한다.
- 결과는 출처·검색어·개수 기준으로 기본 5분 캐시한다. `DISCOVERY_CACHE_TTL_MS`는 1~10분 범위에서 조정할 수 있다.
- `/api/discover`는 IP 기준으로 짧은 시간의 반복 요청을 제한한다.
