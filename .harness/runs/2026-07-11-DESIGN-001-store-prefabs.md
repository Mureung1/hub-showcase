# Run Report: DESIGN-001 storefront prefabs

## Summary

```text
Task: DESIGN-001
Status: passed
Date: 2026-07-11
```

## Scope

```text
실제 점포 좌표 위 marker를 상세 low-poly storefront로 개선했다.
지붕, facade, 측면, 창문, 문, 간판, 차양, 화분과 그림자를 구성했다.
카페·음식점·베이커리·편의점 palette와 선택·hover·focus 상태를 분리했다.
수천 개 배경 건물은 가벼운 MapLibre extrusion을 유지했다.
```

## Verification

```powershell
pnpm --dir apps/web test
pnpm --dir apps/web lint
pnpm --dir apps/web build
python scripts/check_task_packet.py --root .
```

Result:

```text
Front tests: 4 passed.
Oxlint and TypeScript/Vite build passed.
Task packet check passed.
```

Browser result:

```text
1440×980: 네 업종의 roof/awning/sign palette와 선택 상태 확인
390×844: map controls와 분석 sheet를 가리지 않고 선택 prefab 표시 확인
console에는 기존 favicon.ico 404 외 runtime error 없음
```

## Notes

```text
좌표와 점포명은 지도 data지만 prefab 외관은 업종 식별용 표현이다.
실제 매장 외관과 같다는 의미로 사용하지 않는다.
```

## Follow-up

```text
실제 촬영 texture나 개별 건물 mesh는 별도 data와 성능 검증 후 연결한다.
```
