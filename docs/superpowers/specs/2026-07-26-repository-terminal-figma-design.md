# Repository 분석 터미널 Figma 디자인 설계

## 목표

작업실에서 PC를 사용했을 때 기존 웹 페이지형 분석 화면 대신 Figma `1:2`의 게임 대화창형 Repository 분석 UI를 보여준다. 사용자는 작업실 배경을 유지한 채 Poppy의 안내, GitHub Repository 입력, 분석 시작과 취소를 한 화면에서 수행한다.

## 범위

- `RepositoryTerminal`의 모달 외형과 배치 교체
- Figma의 다크 게임 터미널, Poppy 영역, 입력 레이블, 버튼 계층 적용
- 기존 `RepositoryAnalyzer`의 Repository 검증, GitHub ID, 분석 API, 회고 작성, 저장, 결과 확인 로직 재사용
- 로딩·오류·분석 완료 상태를 새 UI 안에서 읽기 쉽게 표시
- Escape, backdrop click, 키보드 focus와 작업실 입력 중지 흐름 유지

## 제외 범위

- Repository 분석 API와 Supabase 스키마 변경
- Phaser Scene 또는 작업실 맵 변경
- Figma 원격 이미지 URL의 영구 저장
- 새 UI 라이브러리 추가

## 설계

### 책임 분리

`RepositoryTerminal`은 viewport overlay, dialog shell, Poppy 안내, 닫기와 포커스를 담당한다. `RepositoryAnalyzer`는 입력값과 분석 상태를 관리한다. Figma 화면 전용 시각 요소는 `RepositoryTerminal` 가까이에 작은 컴포넌트로 분리하고 API 호출 책임은 갖지 않는다.

### 시각 구조

```text
작업실 Canvas
└── 전체 화면 dark overlay
    └── RepositoryTerminal dialog
        ├── 상단 PtoP / 닫기
        ├── Poppy portrait
        ├── 질문: Repository를 분석해볼까?
        ├── Git Repository URL 입력
        ├── GitHub ID 입력
        ├── 분석 시작 / 취소
        └── 분석 중·오류·완료·회고 UI
```

Figma의 어두운 네이비 배경과 밝은 민트 주요 버튼을 적용하되, 프로젝트의 Pretendard와 접근성 기준을 유지한다. 입력창과 대화창은 고정 폭을 사용하고 작은 화면에서는 세로 배치로 전환한다.

### 상호작용

- 모달이 열리면 Phaser 입력을 비활성화한다.
- 최초 focus는 닫기 버튼 또는 Repository URL 입력으로 이동한다.
- `Escape`와 backdrop click은 기존 닫기 정책을 유지한다.
- 분석 중에는 분석 시작 버튼을 비활성화하고 상태 문구를 표시한다.
- API 실패 시 모달을 닫지 않고 오류와 재시도 가능한 입력 상태를 유지한다.
- 분석 완료 후 사용자가 회고를 마치고 `결과 확인하기`를 눌러야 결과 페이지로 이동한다.

### 에셋

Figma MCP 원격 에셋은 만료될 수 있으므로 사용하지 않는다. Poppy는 기존 `apps/web/public/assets/PtoP_LogoImage.png`를 사용한다. CSS `object-contain`과 고정 컨테이너로 원본 비율을 보존한다.

## 검증 기준

- 작업실 PC 접근 시 Figma 형태의 분석 창이 열린다.
- Repository URL과 GitHub ID 입력이 기존 API 요청 payload로 전달된다.
- 분석 시작·로딩·오류·완료 상태가 새 레이아웃 안에서 표시된다.
- 닫기 또는 Escape 후 작업실 캐릭터 이동이 복원된다.
- 모바일 폭에서 입력과 버튼이 겹치지 않는다.
- `npm run typecheck:web`, `npm run test:web`, `npm run build:web`, `git diff --check`가 통과한다.
