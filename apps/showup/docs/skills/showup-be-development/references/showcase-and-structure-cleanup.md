# showcase.json 관리 + 모노레포 구조 정리 패턴

> 13일차(7/27) LEAD 세션에서 학습한 showcase.json 필드 관리와 outputs/ 구조 정리 패턴.
> 15일차(7/29) 데모 영상 워크플로우 최종 업데이트.

## showcase.json

### demoVideoUrl 필드 추가 (미션 요구사항)

캠프 미션에서 데모 영상 URL을 `showcase.json`에 포함하라고 요구한다. 초기 작성 시 빈 문자열로 추가해두고, 영상 업로드 후 채운다:

```json
{
  "demoVideoUrl": ""
}
```

영상 업로드 완료 후:
```json
{
  "demoVideoUrl": "https://youtube.com/watch?v=..."
}
```

### 데모 영상 워크플로우 (15일차 최종)

1. **영상 녹화** (5분 미만):
   - 서비스 설명 + 동작 시연 + 기술적 특징 + 문제해결 과정 + Agent 활용 방식
   - 음성 또는 자막으로 내용 설명 필수
   - 배포 사이트(https://showup-project.web.app) 실제 시연
2. **업로드**: YouTube 비공개 업로드 또는 Google Drive 공유 링크
3. **showcase.json 갱신**: `hub/showcase/showcase.json`의 `demoVideoUrl` 필드에 URL 입력
4. **PR 제출**: 영상 링크 + showcase.json(demoVideoUrl 포함)을 PR에 포함

### showcase.json 위치

showcase 폴더는 **모노레포 루트** (`hub/showcase/`)에 있어야 한다. `apps/showup/`이 아님:
```
hub/
  showcase/
    showcase.json
    thumbnail.png
    screenshots/
      landing.png
      dashboard.png
      customers.png
```

### screenshots 최대 3개

showcase.json 스키마에서 screenshots 배열은 최대 3개. 랜딩, 대시보드, 고객 관리 3장을 우선.

### showcase.json 스키마 (v1) 주요 필드

```json
{
  "schemaVersion": 1,
  "githubUser": "Min0504(채민석)",
  "title": "ShowUp — 노쇼·악성 고객 이력 관리 및 위험도 경고",
  "summary": "...",
  "problem": "...",
  "targetUsers": ["..."],
  "techStack": ["React", "TypeScript", ...],
  "featureTags": ["위험도 경고", "고객 이력 관리", "가게 단위 격리"],
  "features": ["..."],
  "screenshots": ["screenshots/landing.png", ...],
  "thumbnail": "thumbnail.png",
  "demoUrl": "https://showup-project.web.app",
  "demoVideoUrl": "",
  "agent": {
    "summary": "...",
    "agentTools": [{"type": "agent", "name": "...", "purpose": "..."}],
    "workflows": [{"name": "...", "steps": [...]}]
  },
  "developmentWithAI": "..."
}
```

**주의**: techStack에 미사용 라이브러리를 넣지 마라. TanStack Query, Zustand는 사용하지 않으므로 제거됨 (14일차 GM 감사).

## outputs/ 구조 정리

### 주차별 디렉토리

발표 자료는 `outputs/weeks{N}/` 구조로 정리:
```
apps/showup/outputs/
  weeks1/         ← 1주차 (빈 디렉토리, 향후 이동용)
  weeks2/         ← 1~2주차 통합 발표 자료
    showup-week1-2-integrated-deck-v2.pptx
    showup-core-demo-deck.pptx
    showup-core-demo-script.md
    showup-week2-demo-deck.pdf
    slides/       ← 슬라이드 이미지
  weeks3/         ← 3주차 발표 자료
    showup-week3-deck.pptx
    showup-week3-deck.pdf
    slide-01.jpg ~ slide-15.jpg
    generate-deck.cjs
    *.png          ← 스크린샷 (showcase용)
```

### 파일 이동 시 git 추적

`git mv` 대신 일반 `mv` 후 `git add -A`를 하면 rename으로 인식된다:
```bash
mkdir -p outputs/weeks2/slides
mv outputs/showup-week2-demo-deck/slide-*.png outputs/weeks2/slides/
git add -A
# git status에서 R (rename)로 표시됨
```

## 모노레포 의존성 관리

### 루트 package.json vs 앱 package.json

- **앱 전용 의존성**은 앱의 `package.json`에만 넣는다 (예: `pptxgenjs` → `apps/showup/package.json`)
- **루트 package.json**에는 공통 devDependencies만 (jest, typescript, firebase-admin 등)
- 보안/FE 세션이 루트 `package.json`에 앱 전용 의존성을 잘못 추가하는 경우가 있으니 LEAD가 정기적으로 확인

### 수정 패턴

```bash
# 잘못 들어간 의존성을 루트에서 제거
# package.json의 dependencies 섹션에서 해당 항목 삭제

# 앱 package.json에 추가
# apps/showup/package.json의 dependencies에 추가

# npm install로 재설치 (workspace가 앱 디렉토리에 심볼릭 링크 생성)
npm install
```

## 루트 README.md 모노레포 구조 명시

루트 README.md에는 전체 디렉토리 트리와 워크스페이스 실행 명령어를 명시:

```markdown
# hub

N167 프로젝트 모노레포 (npm workspaces).

## 실행

npm run dev -w showup      # ShowUp 개발 서버
npm run build -w showup    # ShowUp 빌드
npm run lint -w showup      # ShowUp lint
npm run typecheck -w showup # ShowUp typecheck
```

세션별 모델 표도 루트 README에 포함하여 외부에서 한눈에 파악 가능.