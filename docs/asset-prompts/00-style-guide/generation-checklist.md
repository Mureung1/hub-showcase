# Generation Checklist

## 생성 전

- 생성할 에셋이 배경인지, sprite sheet인지, object sheet인지 정한다.
- 텍스트가 필요한 정보는 이미지에서 제외하고 React UI로 처리한다.
- `transparent background`가 필요한지 명시한다.
- 같은 캐릭터/방을 이어 만들 때는 이전 결과 이미지를 reference로 넣는다.

## 생성 후

- 작은 크기에서도 실루엣이 읽히는지 확인한다.
- 이미지 안에 알 수 없는 글자나 로고가 들어갔는지 확인한다.
- 캐릭터가 현실 동물처럼 보이지 않고 전자 생물처럼 보이는지 확인한다.
- 실패/복구 관련 에셋이 사용자를 혼내는 느낌이 아닌지 확인한다.
- 최종 파일은 `src/assets/pixel/...`에 넣고, 매핑은 `src/data/assets.ts`에서 관리한다.

## 추천 1차 생성 순서

1. `02-room-backgrounds/lofi-cabin-room.md`
2. `01-manager-sprite/electronic-manager-sprite-sheet.md`
3. `03-ui-kit/webapp-ui-kit.md`
4. `04-rewards/reward-object-sheet.md`
5. `07-audio-visual-fx/visual-fx-sheets.md`
6. `06-pixel-tv/reality-pixel-tv.md`
7. `05-social-world/space-fragments.md` 또는 `flower-field.md`
