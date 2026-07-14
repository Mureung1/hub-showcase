# Task Packet: SCENE-001

## 1. Summary

```text
Task: 관평동 3D 촬영 장소 분리와 준비 UI
Backlog ID: SCENE-001
Parent Epic: EPIC-05
Type: feature
Owner: N187_정현우
Status: done
```

## 2. Goal

Gaussian Splatting 대상 장소를 대전 유성구 관평동 한 곳으로 고정하고, 상권 비교와 분리된 촬영 준비 상태를 데모에서 확인할 수 있게 한다.

## 3. Scope

포함:

```text
관평동 전용 3D 장소 진입 button
촬영 전 preparation dialog
점포 전면·보도 10~20m 범위
10:00 / 13:00 / 15:00 / 18:00 촬영 계획 선택
대상 확정·촬영 예정·3DGS 연결 상태
privacy gate와 실제 asset 미연결 상태 표시
```

제외:

```text
실제 촬영 수행
Gaussian Splatting 학습·변환
3D viewer와 실제 scene asset 연결
근거 없는 시간대 혼잡도 수치
관평동을 상권 비교군에 추가
```

## 4. Related Documents

```text
docs/features/3d-congestion-explorer.md
docs/features/person-anonymization-preprocessing.md
docs/development/tasks.md
```

## 5. Expected Changes

```text
web: 3D 장소 entry, preparation dialog, 시간 선택 state
test: 관평동 분리, 촬영 전 상태, disabled viewer CTA
docs: 대상 장소와 실제 asset 경계 명시
```

## 6. Acceptance Criteria

- [x] 상권 선택과 비교 목록에는 연남·홍대·합정만 유지된다.
- [x] 지도에서 관평동 3D 장소를 별도 화면으로 열 수 있다.
- [x] 장소는 대전 유성구 관평동 한 곳으로 표시된다.
- [x] 촬영 범위는 점포 전면·보도 10~20m로 표시된다.
- [x] 대표 촬영 계획 시간 4개를 선택할 수 있다.
- [x] 실제 3DGS asset이 없음을 명확히 표시한다.
- [x] viewer CTA는 실제 asset 연결 전 비활성화된다.
- [x] privacy gate가 화면과 문서에 표시된다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
python scripts/check_docs_html.py
```

수동 확인:

```text
desktop/mobile에서 dialog 열기·닫기
10:00 / 13:00 / 15:00 / 18:00 선택 상태
상권 selector와 비교 dialog에서 관평동 미노출
disabled viewer CTA와 privacy 설명
```

## 8. Documentation Updates

- [x] 관평동 단일 장소와 상권 비교 분리 명시
- [x] 실제 3DGS asset 미연결 상태 명시
- [x] 촬영 범위와 privacy gate 명시
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(scene): add the Gwanpyeong capture preparation flow

why:
- keep the single 3D capture site separate from market comparison

verify:
- pnpm --dir product/apps/web test
- pnpm --dir product/apps/web build
```

## 10. Self-check

- [x] 준비 UI를 실제 3D 장면처럼 주장하지 않았는가?
- [x] 촬영 계획과 실제 혼잡도 측정값을 구분했는가?
- [x] 상권 분석 주기능보다 3D 기능을 더 크게 보이게 하지 않았는가?
- [x] 개인정보 공개 전 gate를 명시했는가?
- [ ] 후속: SCENE-002 privacy sample 검증 후 실제 촬영·3DGS asset 연결을 진행한다.
