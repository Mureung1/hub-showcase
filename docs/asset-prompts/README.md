# Asset Prompts

이 폴더는 XP 데스크톱형 전자 매니저 서비스에 필요한 픽셀 에셋을 생성하기 위한 프롬프트 모음이다.

이 문서들은 `docs/design-system.md`에서 파생된다. `design-system.md`가 색, 창, 여백, UI 원칙을 정하는 원천 문서라면, `asset-prompts/`는 그 규칙을 이미지 생성 프롬프트로 바꾼 작업 지시서다.

## 관계

```text
docs/design-references/concept.png
  -> docs/design-system.md
  -> docs/asset-prompts/
  -> 생성·선별된 이미지
  -> public/assets/
  -> 화면 적용
```

`asset-prompts`는 화면에 직접 적용되는 에셋 폴더가 아니다. 생성된 결과물을 선별해 `public/assets/`에 넣고, React 또는 정적 HTML에서 해당 경로를 연결해야 화면에 보인다.

## 공통 기준

- Windows XP 데스크톱 감성: 파란 하늘, 초록 초원, 베이지 창, 파란 제목 표시줄
- 전자 생물 매니저는 현실 동물이 아니라 작은 데스크톱 펫처럼 보이게 한다.
- UI 텍스트와 버튼은 이미지 안에 굽지 않고 HTML/React에서 렌더링한다.
- 배경, 매니저, 아이콘, 보상 오브젝트, 효과는 분리 가능한 PNG/WebP 에셋으로 만든다.
- 워터마크, 서명, 가짜 UI 텍스트, 과한 네온, 사이버펑크, 사실적 동물 표현은 피한다.

## MVP 우선 에셋

| 문서 | 역할 |
|---|---|
| `02-room-backgrounds/xp-desktop-wallpaper.md` | XP 데스크톱 배경 |
| `01-manager-sprite/electronic-manager-sprite-sheet.md` | 전자 생물 매니저 스프라이트 |
| `03-ui-kit/xp-desktop-icon-kit.md` | 바탕화면 아이콘 |
| `07-audio-visual-fx/visual-fx-sheets.md` | 완료/복구/반응 효과 |

## MVP 이후 확장 에셋

| 문서 | 역할 |
|---|---|
| `04-rewards/reward-object-sheet.md` | 레벨업 보상 오브젝트와 테마 해금 요소 |
| `02-room-backgrounds/xp-shell-room-hybrid.md` | XP shell + pixel room 하이브리드 배경 실험 |
| `02-room-backgrounds/lofi-cabin-room.md` | 로파이 오두막 테마 백업안 |
| `05-social-world/space-fragments.md` | 공개 퀘스트 탐색용 우주 조각 확장안 |
| `05-social-world/flower-field.md` | 공개 퀘스트 탐색용 꽃밭 확장안 |
| `06-pixel-tv/reality-pixel-tv.md` | 현실 픽셀화 TV 확장안 |

## 생성 후 적용 절차

1. `docs/design-system.md`와 이 README를 먼저 확인한다.
2. 목적에 맞는 하위 프롬프트 문서를 선택한다.
3. 생성 결과에서 텍스트가 들어간 이미지, 과하게 사실적인 이미지, UI와 충돌하는 이미지를 제외한다.
4. 선별한 에셋을 `public/assets/` 아래 역할별 폴더에 저장한다.
5. React 또는 `public/prototype-static.html`에서 상대 경로로 연결한다.
6. 작은 크기에서 알아볼 수 있는지 확인한다.

## skill과의 관계

`xp-desktop-pet-ui` skill은 이 폴더만 복사한 것이 아니다. `design-system.md`, `mvp-functional-spec.md`, `user-flow-wireframes.md`의 핵심 규칙과 이 폴더의 에셋 생성 구조를 짧게 압축한 Codex 외부 실행 규칙이다.
