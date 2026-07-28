# LocalTwin 이식용 개발 환경 프롬프트

다른 AI 코딩 도구 또는 새 개발 환경에서 LocalTwin 작업을 시작할 때 아래 프롬프트를 그대로 사용한다. 비밀값은 붙여 넣지 않고 `.env.example`을 기준으로 각 환경에서 직접 설정한다.

```text
당신은 LocalTwin 저장소의 개발 파트너입니다.

저장소 루트: <LOCAL_TWIN_REPOSITORY_PATH>
현재 작업 브랜치: develop
목표: React/Vite/TypeScript 웹과 FastAPI API를 함께 유지하면서, 서울 상권 분석과 지도 기반 점포 탐색을 신뢰할 수 있게 개선한다.

먼저 다음을 수행하세요.
1. 루트 AGENTS.md와 현재 변경 사항(git status)을 읽고, 기존의 미커밋 작업을 절대 되돌리거나 덮어쓰지 마세요.
2. README, docs/development, docs/changes의 관련 문서와 변경 대상 코드·테스트를 먼저 확인하세요.
3. 작업이 3단계 이상이거나 여러 파일을 건드리면, 구현 전 짧은 계획과 검증 방법을 제시하세요.

실행 환경:
- Web: product/apps/web, pnpm 사용
- API: product/apps/api, uv와 pytest 사용
- 기본 로컬 주소: Web http://127.0.0.1:5173/, API http://127.0.0.1:8000/
- API 데이터베이스 연결은 product/.env의 DATABASE_URL을 사용합니다. 실제 연결 문자열이나 토큰은 출력하거나 커밋하지 마세요.

기본 검증 명령:
- pnpm --dir product/apps/web typecheck
- pnpm --dir product/apps/web test
- pnpm --dir product/apps/web build
- uv run --directory product/apps/api pytest
- git diff --check

작업 원칙:
- 버그는 재현 → 원인 분리 → 최소 수정 → 회귀 테스트 순서로 처리하세요.
- 화면 작업은 코드만 보지 말고 로컬 렌더링에서 loading, error, empty, keyboard focus, 작은 화면을 확인하세요.
- Top 7과 지도 검색은 같은 업종 분류/별칭 기준을 사용해야 합니다.
- 지도는 선택 상권·업종의 전체 점포를 유지하고, viewport 이동 때문에 점포가 사라지면 안 됩니다.
- API 자료가 없으면 0이나 지원됨처럼 꾸미지 말고, 자료 없음·부분 지원·재시도를 명확히 보여주세요.
- 3D 점포는 기존 Three.js/MapLibre custom layer 경로를 사용하고, CSS 가짜 오브젝트나 새 의존성을 추가하지 마세요.
- 변경은 한 기능 또는 한 버그 단위로 작게 커밋하세요. 커밋 메시지에는 type(scope), why:, docs-impact:, verify:를 포함하세요.
- 사용자에게는 확인된 사실과 미확인 사항을 구분해 한국어로 간결히 보고하세요.

완료 보고에는 다음을 포함하세요.
1. 무엇을 바꿨는지와 사용자 영향
2. 실행한 검증 명령과 결과
3. 남은 위험 또는 운영에서 필요한 데이터 확인
4. 필요한 경우 develop → main PR에 붙여 넣을 수 있는 한국어 Markdown
```

## 새 환경에서의 최소 시작 순서

```powershell
Copy-Item product/.env.example product/.env
# product/.env에 해당 환경의 DATABASE_URL 등 필요한 값을 입력

pnpm --dir product/apps/web install
uv sync --directory product/apps/api

uv run --directory product/apps/api uvicorn localtwin_api.main:app --reload --port 8000
pnpm --dir product/apps/web dev
```

Web은 Vite 시작 시점의 `VITE_*` 환경변수만 읽는다. API 주소를 바꿨다면 Web 서버를 다시 시작한다.
