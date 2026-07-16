# Electronic Manager Sprite Sheet Prompt

## 목적

Windows XP 데스크톱형 전자 매니저 Lumi의 동적 상태 애니메이션을 만들기 위한 프롬프트다. React 구현은 `64x64` 고정 프레임 sprite sheet를 `steps()`로 재생하므로, 모든 프레임의 기준선과 캐릭터 중심이 흔들리지 않아야 한다.

## 공통 캐릭터 기준

- 이름: Lumi
- 형태: 현실 동물이 아닌 작은 전자 생물형 데스크톱 펫
- 색: 분홍, 크림, 연한 민트 하이라이트 중심
- 실루엣: 둥근 몸체, 작은 안테나 또는 픽셀 halo, 단순한 표정
- 금지: 실제 동물, 고양이, 강아지, 인간형, 로봇 갑옷, 텍스트, UI 프레임, 워터마크

## 애니메이션 시트 고정 규격

- 파일 1개당 상태 1개만 포함한다.
- 각 파일은 `4 frames x 1 row` sprite sheet로 만든다.
- 각 프레임 셀은 정확히 `64x64` 기준이다.
- 모든 프레임에서 Lumi의 발 또는 하단 접지선은 같은 y 좌표에 둔다.
- 모든 프레임에서 Lumi의 몸통 중심은 같은 x 좌표에 둔다.
- 머리, 안테나, halo가 프레임 밖으로 나가면 안 된다.
- 프레임마다 zoom, crop, camera angle, silhouette size가 바뀌면 안 된다.
- 움직임은 1~2px 이내의 작은 픽셀 변화로 제한한다.
- 배경은 transparent 또는 제거 가능한 단색 배경으로 생성하고, UI 텍스트는 넣지 않는다.

## 상태별 프롬프트

### `lumi-idle-sheet.png`

```text
Create a 4-frame horizontal pixel art sprite sheet of Lumi, a small pink and cream electronic lifeform desktop pet for a Windows XP inspired self-growth app. One row, four equal 64x64 frame cells, transparent background, no text. Idle waiting state: gentle breathing, tiny antenna or pixel halo barely moving, calm encouraging face. Keep the exact same character scale, same body center x coordinate, same foot baseline y coordinate, same silhouette bounding box in every frame. Movement must be subtle, 1 to 2 pixels only. Crisp pixel edges, limited warm XP palette.
```

### `lumi-focused-sheet.png`

```text
Create a 4-frame horizontal pixel art sprite sheet of Lumi in focused quest-running state. One row, four equal 64x64 frame cells, transparent background, no text. Lumi leans forward slightly with tiny concentration sparkle, but the body center, lower baseline, scale, and bounding box remain consistent across every frame. No camera movement, no zoom, no crop shift. Crisp pixel art, pink and cream body, small mint highlight, Windows XP cozy mood.
```

### `lumi-happy-sheet.png`

```text
Create a 4-frame horizontal pixel art sprite sheet of Lumi in happy completion state. One row, four equal 64x64 frame cells, transparent background, no text. Lumi smiles with a small bounce and soft star pixels near the halo. Keep the same body center x coordinate, same foot baseline y coordinate, same character height, and same frame padding across all frames. Bounce must be tiny and stable, not a jump. Crisp pixel art, warm yellow and mint accent.
```

### `lumi-recovering-sheet.png`

```text
Create a 4-frame horizontal pixel art sprite sheet of Lumi in gentle recovering and rebalancing state. One row, four equal 64x64 frame cells, transparent background, no text. Lumi is calm, patient, softly repairing or rebalancing with a small circular arrow or tiny repair sparkle. Do not make Lumi weak, sick, punished, or sad. Keep exact same center, baseline, scale, and bounding box in all frames. Subtle 1 to 2 pixel motion only.
```

### `lumi-resting-sheet.png`

```text
Create a 4-frame horizontal pixel art sprite sheet of Lumi resting at night. One row, four equal 64x64 frame cells, transparent background, no text. Lumi has sleepy calm expression with a tiny dim halo pulse. Same body center, same lower baseline, same size, same frame padding in every frame. No letters, no Z text, no speech bubble. Cozy Windows XP pixel art, soft cream and pink palette.
```

### `lumi-hover-sheet.png`

```text
Create a 4-frame horizontal pixel art sprite sheet of Lumi reacting to mouse hover attention. One row, four equal 64x64 frame cells, transparent background, no text. Lumi looks attentive with a tiny antenna wiggle and a soft highlight. The body center x coordinate, foot baseline y coordinate, scale, and silhouette bounding box must stay identical in every frame. Movement is limited to small facial, halo, or antenna pixel changes.
```

## 성장 단계 단일 이미지

- `lumi-growth-01.png`: 기본 Lumi, 64x64, transparent.
- `lumi-growth-02.png`: 약간 더 밝은 halo 또는 작은 badge, 64x64, transparent.
- `lumi-growth-03.png`: 더 선명한 glow 또는 memory charm, 64x64, transparent.
- 성장 이미지는 animation sheet가 아니며, UI에 바로 노출하기 전 manifest에만 등록한다.

## Negative Prompt

```text
realistic animal, cat, dog, monster, human, anime girl, robot armor, cyberpunk, neon, 3d render, complex details, text, labels, UI frame, speech bubble, shadow baked into background, watermark, camera zoom, inconsistent scale, inconsistent baseline, inconsistent center point, cropped antenna, different character design per frame
```

## 검수 메모

- `asset-quality-verifier` skill로 frame cell 크기, baseline, center, bbox drift를 확인한다.
- 64px 미리보기에서 실루엣이 읽혀야 한다.
- `prefers-reduced-motion`에서는 첫 프레임만으로 상태 의미가 보여야 한다.
