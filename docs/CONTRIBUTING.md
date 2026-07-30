# CONTRIBUTING.md

> IRIS 프로젝트의 Git/GitHub 작업 규칙을 정리한 문서입니다.

---

# Branch Policy

- `work`: 기능 개발과 검증 브랜치
- `deploy`: 실제 배포 기준 브랜치

일반 작업은 `work`에서 진행한다.
GitHub Actions workflow처럼 배포 브랜치에만 필요한 변경은 `deploy`에서 관리한다.

배포 흐름:

```text
work에서 작업, 검증, push
  -> deploy로 이동
  -> work 내용을 deploy에 merge
  -> deploy push
  -> GitHub Actions CI/CD 실행
  -> EC2에서 deploy 브랜치 기준으로 Docker Compose 재배포
```

---

# Commit Convention

커밋 메시지는 `type: 한국어 요약` 형식을 사용한다.

- `feat`: 사용자 기능, API, 봇 동작, UI 동작 추가 또는 변경
- `fix`: 버그 수정
- `docs`: 문서만 변경
- `style`: 동작 변경 없는 CSS, 포맷, UI 스타일 조정
- `refactor`: 동작 변경 없는 코드 구조 개선
- `test`: 테스트 추가 또는 수정
- `chore`: 의존성, 스크립트, 설정, 빌드 작업

커밋 전에는 `git status --short`로 변경 파일을 확인하고 기능 단위로 나눈다.

문서 파일만 포함된 커밋은 반드시 `docs:`를 사용한다.
`docs/`만 변경된 커밋에 `feat:`를 사용하지 않는다.

예시:

```text
feat: 디스코드 구독과 키워드 알림 UX 구현
docs: MVP 알림 흐름 문서 최신화
fix: 키워드 삭제 확인 버튼 동작 수정
chore: 백엔드 스케줄러 의존성 추가
```

---

# Pull Request

PR은 작업 단위가 설명 가능하도록 작성한다.

권장 PR 본문 구조:

```md
## 주요 작업 리스트

## 내가 설명할 수 있는 부분

## 아직 이해 못 한 부분

## 새로 알게 된 것
```

`주요 작업 리스트`는 큰 기능 아래에 세부 작업을 묶어 작성한다.
나머지 섹션은 문장형으로 작성해 작업 과정에서 설명 가능한 주제를 정리한다.

Fork 저장소에서 원본 저장소로 PR을 열었다면, PR의 source branch에 다시 push할 때 기존 PR이 자동으로 업데이트된다.

---

# Pre-commit Check

커밋 전에는 변경 범위에 맞는 검증을 수행한다.

- Backend 코드 변경: `npm run type-check`, `npm run lint`, 필요한 경우 `npm run build`
- Frontend 코드 변경: `npm run lint`, `npm run build`
- 문서/JSON 변경: `git diff --check`, JSON 파일은 파싱 확인
- 배포 관련 변경: [DEPLOYMENT.md](./DEPLOYMENT.md)와 [QA.md](./QA.md)의 운영 검증 항목 확인

실제로 수행하지 못한 검증은 PR 또는 작업 기록에 남긴다.
