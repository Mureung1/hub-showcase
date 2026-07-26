# Run Report: SCENE-004 time observation overlay

## Scope

3DGS viewer에 10시·13시·15시·18시 관찰 상태를 붙였다. 이 값은 현재 공식 현장 측정값이 아닌
`fixture`임을 UI에 명시하며, 실제 사용자 촬영 E2E나 행동 데이터 수집을 주장하지 않는다.

## Verified behavior

- `sceneObservations.ts`가 시간·혼잡도·표시 위치를 data-only contract로 반환한다.
- `SceneObservationPanel`의 시간 선택은 observation layer만 갱신한다.
- `SplatViewer`는 기존 PLY를 다시 요청하지 않고 scene object 위에 observation layer를 교체한다.
- 화면을 닫을 때 observation geometry와 material을 기존 viewer cleanup과 함께 정리한다.

## Validation

```powershell
pnpm --dir product/apps/web test --run src/features/scene/SceneObservationPanel.test.tsx
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
```

2026-07-26 기준 observation panel test와 TypeScript·lint를 통과했다.

## Remaining boundary

실제 시간대 수요 데이터는 상권 분석 API의 집계와 scene 촬영 관찰을 같은 값처럼 합치지 않는다.
승인된 촬영자료를 anonymize → GPU train → viewer로 잇는 검증은 SCENE-007에서 수행한다.
