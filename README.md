# 탑히어(가명) — 대학교 주변 자취 지역 추천 서비스

## 문서

- [기획서](docs/wiki/기획서.md)
- [Wiki](https://github.com/culyrh/hub/wiki/%ED%83%91%ED%9E%88%EC%96%B4(%EA%B0%80%EB%AA%85)-%E2%80%94-%EB%8C%80%ED%95%99%EA%B5%90-%EC%A3%BC%EB%B3%80-%EC%9E%90%EC%B7%A8-%EC%A7%80%EC%97%AD-%EC%B6%94%EC%B2%9C-%EC%84%9C%EB%B9%84%EC%8A%A4)
- [개발 환경 구성 (CLAUDE.md)](CLAUDE.md)
- [개발 Task 백로그](docs/wiki/backlog.md)

## 코드 컨벤션

- 컴포넌트: `PascalCase` (파일명도 컴포넌트명과 동일하게)
- 함수·변수: `camelCase`
- 폴더명: `kebab-case`
- 들여쓰기: 2칸
- 백엔드 라우트 경로: `/api/v1/리소스명` (복수형, kebab-case)

## 브랜치 전략

- `main`: 항상 배포 가능한 상태만 유지, 직접 커밋 금지
- 작업 브랜치: `작업-요약` (예: `region-score-api`, `map-marker-offset`)

## 커밋 컨벤션

| type | 용도 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 (기획서, README, 주석 등) |
| `style` | 코드 포맷팅 등 로직 변화 없는 수정 |
| `refactor` | 동작 변화 없는 코드 구조 개선 |
| `test` | 테스트 코드 추가/수정 |
| `chore` | 빌드, 설정, 패키지 등 잡무성 변경 |

- 제목은 50자 이내, 끝에 마침표를 붙이지 않는다.
- 무엇을 했는지보다 왜 했는지가 필요한 경우, 한 줄 띄우고 본문에 이유를 적는다.
- 예시: `feat: 지역 점수화 API 응답에 breakdown 필드 추가`

## PR 규칙

- 타이틀: `[루카스아이디_실명] - 작업을 한 문장으로 요약` (예: `[N100_윤솔빈] 지역 점수화 API 개발`)
- 본문은 [PR 템플릿](.github/pull_request_template.md)의 항목(주요 작업 리스트, 내가 설명할 수 있는 부분, 아직 이해 못 한 부분, 새로 알게 된 것)을 모두 채운다.
- 관련 라벨을 하나 이상 선택한다.