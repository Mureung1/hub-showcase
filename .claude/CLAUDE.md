# CLAUDE.md

이 파일은 Claude Code가 이 저장소(hub)에서 개발할 때 따르는 지침이다.
프로젝트 배경·기획은 여기 담지 않고 [docs/](../docs/)로 링크한다.

## 프로젝트 개요

**hub** — 최신 AI(LLM) 논문을 매일 자동 수집·요약해, 연구자·개발자가 5분 안에 오늘의 동향을 파악하게 해주는 **정적 웹 서비스**.
- 문제 정의·기획: [docs/plan.md](../docs/plan.md), [docs/spec/mvp-plan.md](../docs/spec/mvp-plan.md)
- 전체 소개: [README.md](../README.md)

## 기술 스택

- **프론트엔드**: 순수 정적(바닐라 HTML/CSS/JS, 빌드 없음). 생성된 JSON을 fetch해 렌더.
  - 향후 검색·트렌드 등으로 복잡해지면 **Vite + React**로 전환 예정.
- **백엔드(데이터 파이프라인)**: Python 3.11, 패키지 관리 `pip`.
  - 수집: `arxiv` / `feedparser`, 요약: Gemini Flash(무료 티어).
- **배포**: GitHub Actions(cron)로 파이프라인 실행 → 결과 커밋 → GitHub Pages 정적 서빙. **서버 0대.**

## 디렉토리 구조

```
hub/
├── scripts/    # Python 수집·요약 파이프라인
├── web/        # 정적 프론트 (HTML/CSS/JS)
├── data/       # 생성된 JSON (파이프라인 산출물)
├── docs/       # 기획·명세 문서 (정본)
└── .github/    # GitHub Actions 워크플로
```

새 파일은 역할에 맞는 폴더에 만든다. (수집·요약 코드 → `scripts/`, 화면 → `web/`)

## 개발 명령어

```bash
# 데이터 파이프라인 실행 (arXiv 수집 → LLM 요약 → data/*.json 생성)
python scripts/main.py

# 프론트 로컬 미리보기 (저장소 루트에서 실행 → /web/ 로 접속)
python -m http.server 8000   # → http://localhost:8000/web/

# 테스트
pytest
```

## 코드 컨벤션

- **주석·docstring은 한국어**로 작성.
- **PEP8** 준수, **타입힌트** 사용.
- 포맷터/린터는 **ruff / black 권장**(강제는 아님). 커밋 전 정리 권장.
- 함수·변수는 명확한 이름으로. 매직넘버 지양.

## 비밀·외부 API 규칙

- **API 키를 코드에 하드코딩하지 않는다. (절대 금지)**
- 로컬은 `.env`(반드시 `.gitignore`에 포함), CI는 **GitHub Secrets**로 주입.
- `.env`·키 파일을 커밋/푸시하지 않는다.
- **Gemini / arXiv 무료 티어 호출 한도**를 고려한다(과도한 반복 호출 주의, 재시도·백오프 처리).

## Git 워크플로 & 커밋 컨벤션

- **커밋·푸시는 사용자가 요청할 때만** 수행한다. (임의로 커밋하지 않음)
- 개발은 `work` 브랜치에서, 안정되면 `main`에 병합.
- 커밋 메시지 끝에 다음 트레일러를 붙인다:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### 커밋 타입
`Feat`(기능) · `Build`(빌드) · `Chore`(자잘한 수정) · `Ci`(CI 설정) · `Docs`(문서) · `Form`(형식·정렬·주석) · `Style`(스타일·포맷) · `Test`(테스트) · `Release`(릴리즈) · `Init`(첫 커밋)

### 커밋 구조
```
<type>(<scope>): <subject>   -- 제목
                             -- 공백 라인
<body>                       -- 본문
                             -- 공백 라인
<footer>                     -- 꼬리말
```

## 문서 관리

- **repo `docs/` = 정본(canonical).** Claude가 참조·수정하는 기준 문서.
- **Wiki = 사람용 시각 요약본.** repo 복사본이 아니라 다이어그램·요약 중심(별도 관리).
- 와이어프레임(HTML)은 repo에 두고, 실물은 **GitHub Pages**로 확인:
  https://leekwanhak.github.io/hub/docs/spec/wireframes/s1-wireframe.html

## 참고 문서

| 문서 | 내용 |
|------|------|
| [docs/plan.md](../docs/plan.md) | 전체 기획서 |
| [docs/user-scenarios.md](../docs/user-scenarios.md) | 사용자 시나리오 4종 |
| [docs/spec/mvp-plan.md](../docs/spec/mvp-plan.md) | MVP 기획 (문제정의→흐름→기능→화면) |
| [docs/spec/checklist.md](../docs/spec/checklist.md) | 작업 분해 체크리스트 |
| [docs/agent-workflow/planning-methodology.md](../docs/agent-workflow/planning-methodology.md) | 기획 방법론 (agent 활용 프로세스) |
| [docs/claude-code-notes/claude-md-loading-locations.md](../docs/claude-code-notes/claude-md-loading-locations.md) | Claude Code 노트 (CLAUDE.md 로딩 위치) |
