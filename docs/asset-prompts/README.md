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
| `01-manager-sprite/pink-animal-samesize-evolution.md` | 새 매니저 캐릭터 후보: 동일 크기 유지형 핑크 동물형 진화 |
| `01-manager-sprite/real-creature-cyber-pet-evolution.md` | 실제 신기한 생물 모티브 후보: Stage 1 작게, Stage 2~4 동일 크기형 사이버 펫 진화 |
| `01-manager-sprite/real-creature-cyber-pet-v2-prompts.md` | 실제 생물 모티브 후보 v2 재생성 프롬프트: 8종 Stage 3/4 강화, 도마뱀붙이 단순화 |
| `01-manager-sprite/planaria-stage-1-animation-sample.md` | 11종 캐릭터 애니메이션 확장을 위한 기준 샘플: 64x64 frame, anchor, playback, reduced-motion 기준 |
| `01-manager-sprite/stage-1-pet-interaction-motion-contract.md` | 펫 상호작용 motion sheet 계약: accepted Stage 2 canonical, variable frame count, playbackFrames, walk/run/jump/climbing 기준 |
| `01-manager-sprite/sea-bunny-slug-stage-2-motion-plan.md` | 꼬마비로드갯민숭달팽이 Stage 2 모션 상세 기획과 등 무늬 수정 기준 |
| `01-manager-sprite/costasiella-kuroshimae-stage-2-motion-plan.md` | Costasiella kuroshimae Stage 2 모션 상세 기획과 잎사귀 cerata 동작 기준 |
| `01-manager-sprite/fried-egg-jellyfish-stage-2-motion-plan.md` | 계란후라이 해파리 Stage 2 모션 상세 기획과 bell-pulse 이동 기준 |
| `01-manager-sprite/manager-asset-naming-convention.md` | 확정 manager runtime 폴더, candidate 폴더, review asset 명명 규칙 |

## 기간 내 승격 확장 에셋

| 문서 | 역할 |
|---|---|
| `04-rewards/reward-object-sheet.md` | 레벨업 보상 오브젝트와 테마 해금 요소 |
| `02-room-backgrounds/xp-shell-room-hybrid.md` | XP shell + pixel room 하이브리드 배경 실험 |
| `05-social-world/space-fragments.md` | 공개 퀘스트 탐색용 우주 조각 확장안 |
| `05-social-world/flower-field.md` | 공개 퀘스트 탐색용 꽃밭 확장안 |
| `06-pixel-tv/reality-pixel-tv.md` | 현실 픽셀화 TV 확장안 |
| `07-audio-visual-fx/visual-fx-sheets.md` | 캐릭터 반응, 완료, 복구, 레벨업 효과 |
| `08-interaction-objects/window-platform-ladder-tiles.md` | 창 안에서 쓰는 사다리/플랫폼 9-slice tile-repeat 에셋 |

## 보류 확장 에셋

| 문서 | 역할 |
|---|---|
| `02-room-backgrounds/lofi-cabin-room.md` | 로파이 오두막 테마 백업안 |

## 생성 후 적용 절차

1. `docs/design-system.md`와 이 README를 먼저 확인한다.
2. 목적에 맞는 하위 프롬프트 문서를 선택한다.
3. 생성 결과에서 텍스트가 들어간 이미지, 과하게 사실적인 이미지, UI와 충돌하는 이미지를 제외한다.
4. 선별한 에셋을 `public/assets/` 아래 역할별 폴더에 저장한다.
5. React 또는 `public/prototype-static.html`에서 상대 경로로 연결한다.
6. 작은 크기에서 알아볼 수 있는지 확인한다.

동적 구현이 필요한 에셋은 `docs/dynamic-asset-requirements.md`의 manifest, naming, frame 규격을 먼저 맞춘다.

플라나리아 샘플 sprite sheet를 새로 생성할 때는 `01-manager-sprite/planaria-stage-1-animation-sample.md`의 runtime playback contract를 함께 확인한다. 이 문서는 `256x64` sheet, `64x64 x 4 frames`, frame `0` reduced-motion fallback, `background-position`, 상태별 fps, 그리고 `center x`, `lower float anchor`, `top grip anchor`, full-body behind-window hiding 기준을 정의한다.

펫의 상호작용 애니메이션은 `01-manager-sprite/stage-1-pet-interaction-motion-contract.md`를 기준으로 한다. 현재 canonical 확정본은 `pink-manager`, `glass-frog`이며 둘 다 실제 기준 이미지는 Stage 2로 본다. 나머지 실제 생물 매니저는 같은 규칙으로 후보 생성 후 승격한다. 이 motion set은 `hover`를 제외하고, `idle/focused/happy/recovering/hanging/hiding/run/jump/walk/climbing`을 사용한다. 모든 frame cell은 `64x64`이지만 sheet width는 motion별 `sourceFrameCount * 64`로 달라질 수 있으며, 실제 재생 리듬은 manifest의 `playbackFrames`로 만든다.

확정 manager asset은 `01-manager-sprite/manager-asset-naming-convention.md`의 규칙을 따른다. `pink-manager`와 `glass-frog`는 현재 canonical 폴더인 `public/assets/lumi/pink-manager-stage-2/`, `public/assets/lumi/glass-frog-stage-2/`를 확정본으로 보고, 이후 다른 매니저 생성도 선택한 기준 이미지의 실제 stage를 폴더명에 반영한다.

## 캐릭터 방향 후보

현재 매니저 캐릭터는 두 갈래를 구분한다.

- 기존 Lumi: `01-manager-sprite/electronic-manager-sprite-sheet.md` 기준의 전자 생물형.
- 새 후보: `01-manager-sprite/pink-animal-samesize-evolution.md` 기준의 핑크/갈색 동물형.
- 실제 생물 모티브 후보: `01-manager-sprite/real-creature-cyber-pet-evolution.md` 기준의 생물별 사이버 펫형.

새 후보는 진화 단계가 커지는 방식이 아니다. Stage 1~4는 같은 크기와 같은 시점을 유지하고, 귀/앞발/볼털/발바닥/꼬리/작은 리본 같은 동물적 귀여움과 픽셀 품질만 점진적으로 좋아져야 한다. 전자 장식, 사이버 장식, 로봇 갑옷, 성숙한 체형 변화는 피한다.

실제 생물 모티브 후보는 Stage 1만 작게 시작하고, Stage 1에서 Stage 2로 넘어갈 때만 살짝 커진다. Stage 2, Stage 3, Stage 4는 거의 같은 크기와 같은 시점을 유지해야 하며, 각 생물의 고유 특징과 픽셀 품질, 몸에 통합된 약한 사이버 생명체 느낌만 점진적으로 강화한다.

## 동적 MVP 우선 검수 세트

처음부터 전체 에셋을 대량 생성하지 않는다. 먼저 아래 소량 PNG를 생성해 `asset-quality-verifier` skill로 검수한 뒤 같은 규칙을 나머지 상태에 확장한다.

| 우선순위 | 파일 | 검수 초점 |
|---:|---|---|
| 1 | `public/assets/lumi/lumi-idle-sheet.png` | 64x64 프레임, 동일 baseline, 동일 center, idle 의미 |
| 2 | `public/assets/lumi/lumi-focused-sheet.png` | focused 상태 의미, 프레임 간 bbox drift 없음 |
| 3 | `public/assets/icons/quest-idle.png`, `quest-hover.png`, `quest-active.png`, `quest-disabled.png` | 48x48 상태 차이, 같은 실루엣과 위치 |
| 4 | `public/assets/fx/quest-complete-sheet.png` | 투명 FX, 텍스트 없음, Lumi와 별도 레이어 |
| 5 | `public/assets/lumi/lumi-hanging-sheet.png`, `lumi-hiding-sheet.png` | 창 상호작용 모션, hanging top anchor, hiding full-body behind-window placement, 창 UI를 이미지에 굽지 않음 |
| 6 | `public/assets/lumi/planaria-stage-1/planaria-stage-1-*-sheet.png` | 11종 확장 전 샘플: 256x64 sheet, frame 0 fallback, 배치 anchor, 상태별 fps |
| 7 | `public/assets/lumi/<pet-id>-<stage-id>/<pet-id>-<stage-id>-*-sheet.png` | 펫 상호작용 motion: selected base stage 기준, variable frame sheet, playbackFrames, walk/run/jump/climbing motion |

검수 skill 위치:

- `.agents/skills/asset-quality-verifier/SKILL.md`
- `docs/codex-skills/asset-quality-verifier/SKILL.md`

## skill과의 관계

`xp-desktop-pet-ui` skill은 이 폴더만 복사한 것이 아니다. `design-system.md`, `mvp-functional-spec.md`, `user-flow-wireframes.md`의 핵심 규칙과 이 폴더의 에셋 생성 구조를 짧게 압축한 Codex 외부 실행 규칙이다.
