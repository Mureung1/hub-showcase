# PtoP 게임형 작업실 기술 스파이크 구현 계획

## 목표

`랜딩 → 작업실 → 캐릭터 이동 → 새 분석 PC 상호작용 → 기존 Repository 분석 UI` 흐름을 가장 작은 수직 슬라이스로 검증한다.

이번 작업은 전체 이슈 #19를 한 번에 완료하지 않는다. `workspace2` 에셋의 규격과 런타임 연결을 먼저 검증해 React와 Phaser의 생명주기, 입력, 상호작용 이벤트와 기존 분석 UI 연결을 확인한다.

## 범위

### 포함

- 기존 문서를 게임형 작업실 방향으로 갱신
- Phaser 의존성 추가
- `workspace2`의 완성형 오피스 맵과 캐릭터·Poppy 스프라이트를 연결한 전체 화면 작업실
- 방향키와 WASD 캐릭터 이동
- 벽과 책상 충돌
- 새 분석 PC 근처에서 `E` 상호작용
- Phaser 이벤트로 React Repository 입력 모달 열기
- 모달이 열리면 게임 입력 중지
- 랜딩에서 작업실로 이동하는 CTA
- 분석 결과에서 작업실로 돌아오는 경로
- 모바일에서 새 분석 버튼을 제공하는 대체 UI

### 제외

- Tiled JSON 기반의 대형 맵 제작
- 이전 분석 기록을 컴퓨터로 복원
- 작업실 상태의 DB 저장
- 라우터 도입
- 최종 Poppy NPC 대화창 개편
- 캐릭터 애니메이션 및 커스터마이징

## 파일 책임

```text
features/workspace/
├─ WorkspaceGame.tsx               # Phaser mount와 command 전달
├─ workspace.css                   # 작업실 화면 전용 스타일
├─ components/
│  └─ InteractionPrompt.tsx        # 접근 가능한 상호작용 안내
├─ game/
│  ├─ createWorkspaceGame.ts       # Phaser Game 생성·제거
│  ├─ WorkspaceScene.ts            # scene lifecycle과 조합
│  ├─ InputManager.ts              # 방향키/WASD 입력
│  └─ InteractionManager.ts        # 가까운 상호작용 대상 선택
└─ model/
   ├─ workspace.types.ts           # 이벤트와 handle 계약
   ├─ workspaceAssets.ts           # 배포 base를 반영한 runtime 에셋 경로
   └─ workspaceMap.ts              # 타일 규격, 오브젝트 좌표와 충돌 영역
```

- `WorkspaceScene`은 API와 Supabase를 호출하지 않는다.
- `WorkspacePage`만 Repository 분석 모달 상태를 가진다.
- 기존 `RepositoryAnalyzer`는 분석 기능을 계속 담당한다.
- 새 CSS는 전역 `style.css`가 아닌 `workspace.css`에 작성한다.

## 테스트 순서

1. 가장 가까운 상호작용 대상을 선택하는 실패 테스트를 작성한다.
2. `InteractionManager`를 구현해 단위 테스트를 통과시킨다.
3. Workspace 이벤트와 게임 handle 타입을 정의한다.
4. Phaser Game과 Scene을 최소 구현하고 `workspace2` runtime 에셋을 preload한다.
5. React `WorkspaceGame`과 prompt를 연결한다.
6. `WorkspacePage`에서 Repository 모달을 연결한다.
7. 랜딩, 작업실, 결과 화면 전환을 연결한다.
8. 웹 테스트, 타입 검사, 빌드를 실행한다.
9. 데스크톱과 모바일 브라우저에서 canvas, 이동, `E`, 모달을 확인한다.

## 완료 기준

- Phaser canvas가 비어 있지 않고 한 번만 생성된다.
- `wide_map.png` 작업실 배경, 캐릭터, Poppy NPC가 runtime 에셋으로 렌더링된다.
- 방향키와 WASD로 캐릭터가 이동한다.
- 캐릭터가 벽과 책상을 통과하지 않는다.
- 새 분석 PC 근처에서만 `E` 안내가 보인다.
- `E`를 누르면 Repository 입력 모달이 열린다.
- 모달 입력 중 캐릭터가 움직이지 않는다.
- 모달을 닫으면 게임 focus와 입력이 복원된다.
- 기존 분석 완료 콜백이 결과 화면으로 연결된다.
- 모바일에서 게임 조작 없이 새 분석을 시작할 수 있다.
- 테스트, 타입 검사, 빌드가 통과한다.
