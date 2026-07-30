# MVP 이후 확장 계획

## 문서 목적

이 문서는 확장 아이디어의 원천과 도입 순서를 관리한다. 아래 항목 중 일부는 2026-07-30 전 구현 계획으로 승격되었고, 나머지는 MVP가 안정된 뒤 기능별 실험과 사용자 검증을 거쳐 도입한다.

## 확장 원칙

- XP 데스크톱과 전자 생물 매니저라는 핵심 경험을 유지한다.
- 새 기능은 독립 모듈과 기능 플래그로 추가한다.
- 텍스트와 마우스 입력은 언제나 기본 수단으로 남긴다.
- 카메라, 음성, 공개 데이터는 명시적인 사용자 동의를 받는다.
- 개인 기록과 매니저 기억은 LLM 프롬프트가 아니라 앱 데이터로 관리한다.

## 기간 내 구현으로 승격된 항목

아래 항목은 7월 30일까지의 구현 계획에 포함한다. 단, visible UI에는 실제 구현된 기능만 노출한다.

| 기능 | 기간 내 구현 범위 | 먼저 필요한 기반 |
|---|---|---|
| 개인화 AI 매니저 | `managerContext`와 Quest Event 요약을 바탕으로 매니저 대사/퀘스트 추천을 개인화하는 adapter 구조와 rule fallback | Quest Event 저장, ManagerContext, prompt/fallback 분리 |
| 하루의 흐름을 WEB에 반영 | 시간대와 퀘스트 상태에 따라 배경, 루미 idle, 작업표시줄/창 테마가 바뀌는 web theme state | theme manifest, wallpaper assets, CSS 변수 |
| blink focus scene | 하루 시작/종료 또는 전환 시 1인칭 눈 깜빡임처럼 화면이 감겼다 열리고 매니저에게 초점이 맞거나 흐려지는 transition | overlay FX, reduced-motion fallback, day flow state |
| 캐릭터 상호작용 오브젝트 | 사다리/평지/창탈출 같은 화면 오브젝트와 루미 이동 상태를 prototype으로 검증 | draggable/resizable object model, anchor/collision rules, character locomotion states |
| 현실 픽셀화 TV | 로컬 이미지 또는 웹캠 프레임을 canvas에서 픽셀화해 TV 오브젝트 안에 표시, 프레임 저장 금지 | TV frame asset, canvas pixelizer, permission UI |
| Single-plane Pepper projection mode | Pixel TV 아이콘을 우클릭해 속성에서 변환하면 투명판 반사용 단일면 projection 앱 모드로 전환 | projection layout, transform icon state, black background, glow sprite |
| 공개 퀘스트 탐색 | `visibility=anonymous_public` Quest Event를 읽어 별/꽃/조각 형태로 탐색하는 read-only 화면 | visibility 필드, 공개 카드 UI, 신고/차단 전 출시 제한 |
| 웹캠 손 제스처 탐색 | 공개 탐색 화면의 선택/이동을 손 제스처로 보조하는 실험, 마우스/터치 fallback 필수 | MediaPipe 실험, camera consent, gesture adapter |
| 캐릭터 애니메이션 | 루미 상태별 sprite sheet와 hover/reaction animation 적용 | sprite sheet, animation metadata |
| 외적 성장 | 레벨/보상에 따라 루미 accessory 또는 성장 단계가 바뀌는 표현 | manager level, reward inventory, growth sprite variants |
| Stage 회귀 엔드 컨텐츠 | Stage 1~4 중 해금한 모습으로 자유롭게 회귀/장착할 수 있는 장기 보상 | growth archive, unlocked stages, appearance setting |
| 퀘스트 능력치 | 퀘스트 타입별로 성실성, 끈기, 창의성, 지식, 힘, 민첩함, 체력, 매력 같은 능력치가 증가 | stat taxonomy, event metadata, reward UI |
| 데스크톱 배경 테마 | 해금된 wallpaper theme 선택/적용 | theme manifest, wallpaper preview |
| 창 테마 | 제목 표시줄/창 프레임/taskbar skin 선택/적용 | CSS variable skin, preview asset |
| 기억 조각 | 완료/복구 Quest Event가 collectible fragment로 기록 노트/월드에 표시 | event id, memory fragment asset |
| 사운드 | 완료/복구/레벨업 효과음과 전자 매니저별 cyber-purr 기본 음성을 muted 기본값과 함께 제공 | audio files, mute setting, voice/persona mapping, reduced motion/audio preference |

## 1. 개인화 AI 매니저

### 목표

매니저가 사용자의 목표, 선호 진행 강도, 성공 기록, 실패 이유와 가능한 시간대를 바탕으로 다음 퀘스트를 제안하고 문장을 개인화한다.

### 설계

- `ManagerMemory`: 사용자 목표, 선호 난이도, 반복 실패 이유, 반응 선호 저장
- `QuestAgent`: 목표를 일일 퀘스트로 분해
- `RebalancingAgent`: 수행 이력에 따라 분량과 보상 조정
- `LLMAgentAdapter`: OpenAI API, 서버 모델, 브라우저 모델을 교체 가능한 형태로 연결
- LLM에는 필요한 요약 정보만 전달하고 전체 활동 기록을 무제한 전송하지 않는다.

### 도입 순서

1. 현재 규칙 기반 결과와 LLM 결과를 비교한다.
2. 퀘스트 문장화와 매니저 대사부터 LLM에 맡긴다.
3. 안정성이 확인된 뒤 퀘스트 분해와 리밸런싱에 적용한다.

### Persona와 선택지

- 각 전자 매니저의 Persona는 LLM이 매번 즉흥 생성하기보다, `personaId`, 말투, 금지 표현, 선호 퀘스트 스타일, 기본 음성 톤을 데이터로 고정하고 LLM은 그 범위 안에서 문장화한다.
- MVP에서는 사용자가 모든 성격 문장을 직접 입력하지 않게 하고, 제한된 선택지를 제공한다.
- 직접 선택: 사용자가 성격/말투/응원 방식/소리 선호를 고른다.
- 간접 선택: 사용자의 완료/실패/복구 기록과 선택 반응으로 매니저가 선호를 조정한다.
- 모델은 작은 추천/대사 생성에는 비용 효율 모델을 기본으로 쓰고, 복잡한 계획 분해나 긴 기억 요약에는 더 강한 reasoning 모델을 옵션으로 둔다.

## 2. 하루의 흐름이 반영되는 픽셀 월드

사용자의 실제 시간과 퀘스트 상태를 XP 바탕화면 및 매니저 공간에 반영한다.

- 아침: 밝은 창밖, 오늘의 퀘스트 제안
- 낮: 책상 작업 모드, 진행 중 퀘스트 표현
- 저녁: 완료 결과와 EXP 반영
- 밤: 회고, 복구 퀘스트, 수면 모션
- 실패 시 공간을 벌처럼 어둡게 만들지 않고 매니저가 기다리는 상태로 전환

초기에는 React와 CSS 상태 클래스로 구현하고, 상호작용이 복잡해질 때 PixiJS 또는 Canvas 렌더러를 검토한다.

## 3. 현실 픽셀화 TV

웹캠, 이미지 또는 짧은 영상을 낮은 해상도와 제한 팔레트로 변환해 방 안의 TV 화면에서 재생한다. 현실과 전자 생물의 공간이 연결된 느낌을 만드는 기능이다.

- `<canvas>`에서 축소 후 nearest-neighbor 확대
- 색상 수를 줄여 픽셀 팔레트 적용
- 기본값은 로컬 실시간 렌더링이며 프레임을 저장하지 않음
- 웹캠은 HTTPS 또는 localhost에서 사용자 권한을 받은 뒤 사용
- 카메라가 없거나 거부된 경우 업로드 이미지와 기본 영상을 제공

### Single-plane Pepper projection mode

Pixel TV 확장의 다른 모드로, 4면 피라미드가 아니라 한 방향 관람용 Pepper's Ghost 연출을 지원한다.

- 사용자는 바탕화면의 TV 아이콘을 우클릭한다.
- `속성` 창에서 `변환`을 누르면 TV 아이콘이 projection 앱과 연결된 아이콘 상태로 바뀐다.
- 연결된 아이콘을 실행하면 전체 화면 또는 전용 창이 검은 배경 projection mode로 전환된다.
- 태블릿 위에 영상을 띄우고 45도 투명판/아크릴/필름을 덧댄 용기나 무대 앞에서 보면 루미가 떠 있는 것처럼 보인다.
- 4면용 영상처럼 상하좌우 4분할하지 않고, 단일 시점 Lumi sprite/video를 밝은 glow와 검은 배경으로 출력한다.
- 실제 구현 전까지 visible UI에는 `변환` 메뉴를 노출하지 않는다.

Implementation notes:

- `pixel-tv` desktop icon은 기본 TV 상태와 projection-connected 상태를 구분한다.
- 변환은 irreversible permanent change가 아니라 mode binding 또는 shortcut state로 취급한다.
- Projection mode는 앱 UI를 숨기고, 종료/밝기/음소거 같은 최소 제어만 제공한다.
- `prefers-reduced-motion`에서는 깜빡임이나 강한 blur 대신 정적 fade를 사용한다.
- 화면 밝기 안내, 어두운 공간 안내, 투명판 45도 배치 안내는 문서/설정 도움말에 두고 메인 UI를 복잡하게 만들지 않는다.

## 4. 음성 입력

목표 입력, 퀘스트 완료 기록, 실패 이유 입력을 음성으로 보조한다.

- `VoiceInputAdapter`로 브라우저 Web Speech API와 서버 STT를 분리
- 인식 결과를 곧바로 저장하지 않고 사용자가 텍스트를 확인한 뒤 확정
- 브라우저 지원 차이에 대비해 텍스트 입력을 항상 유지

## 5. 다른 사용자의 공개 퀘스트 탐색

사용자가 직접 공개한 퀘스트 조각을 탐색하며 다른 사람의 작은 노력을 발견하는 기능이다.

### 후보 A: 우주 조각

전자 생물과 목표 조각 세계관에 잘 맞고, 떠다니는 오브젝트를 탐색하는 경험을 만들기 좋다.

### 후보 B: 우주 꽃밭

완료한 퀘스트가 꽃으로 남아 경쟁보다 축적과 회복의 인상을 준다.

### 공개 정책

- 기본값은 `private`
- 공개 범위: `private`, `anonymous_public`, `friends_only`
- 사용자가 선택한 퀘스트만 공개
- 공유 기능을 끄면 다른 사람의 퀘스트 탐색도 비활성화하는 상호 참여 방식 검토
- 신고, 차단, 개인정보 필터링이 준비되기 전에는 공개 기능을 출시하지 않음

## 6. 웹캠 손 제스처 탐색

우주 또는 꽃밭 화면에서 손을 움직여 이동하고, 손을 내밀어 오브젝트를 선택하며, 움켜쥐어 내용을 확인한다.

- MediaPipe Hand Landmarker 사용 검토
- 영상 처리는 Web Worker 또는 낮은 프레임 레이트로 분리
- 마우스와 터치를 기본 조작으로 제공
- 카메라 권한 거부, 손 인식 실패, 저사양 기기 상황을 별도 처리

## 7. 보상 확장

EXP와 레벨 외에도 사용자의 시간이 공간에 남는 보상을 중심으로 설계한다.

- 방 오브젝트: 램프, 식물, 책, TV, 벽지
- 상호작용 오브젝트: 사다리, 평지, 창 밖 이동 경로
- 데스크톱 배경 테마: XP 초원, 새벽 하늘, 노을, 별밤, 픽셀 방 등 레벨별 해금
- 창 테마: 제목 표시줄, 창 프레임, 버튼, 작업표시줄 색과 질감을 하나의 스킨 세트로 해금
- 테마 장착: 해금한 배경과 창 스킨을 사용자가 설정 창에서 자유롭게 조합하거나 프리셋으로 적용
- 매니저 행동: 작업 모드, 기다림, 응원, 수면 모션
- 매니저 행동 오브젝트: 사다리 오르기, 평지 점프, 창 가장자리 붙잡기, 창 밖 산책
- 엔드 컨텐츠: Stage 1~4 중 해금한 외형으로 회귀하거나 장착
- 능력치 성장: 퀘스트 성격에 따라 성실성, 끈기, 창의성, 지식, 힘, 민첩함, 체력, 매력 등 증가
- 기억 조각: 완료 퀘스트가 별, 꽃, 사진 또는 스티커로 저장
- 사운드: 로파이 BGM, 환경음, 완료 효과음, 전자/사이버틱한 기본 고롱고롱 음성
- 일기 카드: 하루의 완료와 복구 기록을 픽셀 카드로 보관
- 회복 보상: 복구 퀘스트 성공 시 작은 불빛, 씨앗, 수리 부품 지급
- 시즌 배지: 시험 기간, 운동 주간, 포트폴리오 주간

보상은 사용자를 불안하게 만드는 연속 접속 패널티나 매니저 쇠약과 연결하지 않는다.

### 테마 보상 설계 원칙

- 테마는 레벨 또는 누적 퀘스트 완료 수로 해금하되, 이미 얻은 테마는 실패해도 회수하지 않는다.
- 배경과 창 테마는 능력치에 영향을 주지 않는 꾸미기 보상으로 둔다.
- 기본 XP 테마는 항상 사용할 수 있게 유지한다.
- 테마 데이터는 `themeId`, `name`, `unlockCondition`, `wallpaper`, `windowSkin`, `taskbarSkin`으로 분리해 새 테마를 코드 수정 없이 추가할 수 있게 설계한다.
- MVP에서는 테마 시스템을 구현하지 않고, 추후 `ThemeRepository`와 설정 창을 추가한다.

## 8. 그래픽 및 에셋 파이프라인

- UI 텍스트와 조작 버튼은 React로 구현한다.
- 매니저, 배경, 가구와 보상은 PNG 또는 WebP 에셋으로 관리한다.
- 스프라이트에는 `image-rendering: pixelated`를 적용한다.
- 에셋 경로와 상태 매핑은 별도 데이터 파일로 분리한다.
- 생성 프롬프트는 `asset-prompts/`에서 관리한다.
- 시간대, 매니저 상태, 방 테마와 보상 아이템을 조합해 렌더링한다.
- blink focus scene은 CSS overlay와 blur/opacity/mask animation으로 시작하고, reduced-motion에서는 정적 fade로 대체한다.
- 사다리/평지/창탈출은 처음부터 물리 엔진을 도입하지 않고, object rect와 anchor point 기반의 2D 상태 머신으로 검증한다.
- 사다리는 창 오브젝트처럼 상하 resize를 허용하고, 루미가 올라가는 중 resize되면 progress ratio를 유지해 위치를 재계산한다.
- 평지는 좌우 resize만 허용하고, 루미가 근처에 있으면 jump/land 또는 ladder transfer 상태로 이동한다.
- 창탈출은 XP window 밖 별도 overlay layer에서 루미가 이동하는 prototype으로 검증한다.

## 9. Unity WebGL과 TouchDesigner 평가

### Unity WebGL

3D 공간이나 복잡한 게임 상호작용이 핵심이 될 때 별도 실험으로 고려한다. React 페이지 안에 임베드할 수 있지만 빌드 용량, 로딩 시간, 모바일 성능, React 상태 동기화 비용이 크므로 현재 XP형 2D MVP에는 과하다.

### TouchDesigner

전시형 실시간 영상, 카메라 기반 비주얼, 설치 작품에는 강하지만 일반 웹 제품의 배포와 유지보수에는 적합하지 않다. 웹앱 본체가 아니라 전시용 시각 실험 또는 영상 소스 제작 도구로 한정한다.

### 현재 권장안

React 기반 UI를 유지하고, 픽셀 월드는 CSS/Canvas에서 시작한다. 복잡한 2D 렌더링은 PixiJS, 손 인식은 MediaPipe로 독립 실험한다.

## 권장 우선순위

| 단계 | 기능 | 도입 조건 |
|---:|---|---|
| 1 | 테마/보상 manifest와 sprite metadata | React 상태와 asset 경로 분리 |
| 2 | 시간대별 web theme + blink focus scene + 캐릭터 애니메이션 | 기본 XP shell 안정화 |
| 3 | 캐릭터 상호작용 오브젝트: 사다리/평지/창탈출 prototype | sprite anchor와 window/object rect 모델 |
| 4 | 기억 조각, 외적 성장, Stage 회귀 | Quest Event 저장/조회 안정화 |
| 5 | 퀘스트 능력치와 보상 연결 | stat taxonomy와 event metadata |
| 6 | AI 매니저 문장화, Persona, 제한 선택지 | ManagerContext와 fallback 검증 |
| 7 | 현실 픽셀화 TV + Single-plane Pepper projection mode | 카메라 권한, 개인정보 UX, projection layout 설계 |
| 8 | 익명 공개 퀘스트 탐색 | 공개 범위, 신고/차단 정책 준비 |
| 9 | 손 제스처 탐색 | 기본 마우스/터치 탐색 완성 |
| 10 | Unity/TouchDesigner 실험 | 웹 기술만으로 목표 달성이 어려울 때 |

## 현재 MVP와의 경계

기간 내 계획에 포함하지만 아직 구현 완료로 보지 않는 항목:

- 실제 LLM API
- 웹캠과 손 제스처
- 현실 픽셀화 TV
- 공개 퀘스트 및 소셜 기능
- PixiJS, Unity WebGL, TouchDesigner
- 완성형 픽셀 월드

현재 MVP는 `프로필 입력 -> 퀘스트 생성/수정/수락 -> QuestRunner.exe -> 완료/실패 -> 성장/복구 -> 기록` 흐름에 집중한다.


