# Run Report: UX-002 패널·점포 목록·행동 용어 정합성

## 1. 실행 범위

- LNB·RNB visibility와 선택 상태 분리
- 주변 점포 목록의 같은 업종 기준 통일
- 5개 요약과 전체보기 동선
- Header·지도 행동 버튼 용어 정리

## 2. 변경 결과

- 패널 X는 패널만 닫고, 지도 toolbar에서 다시 열 수 있다.
- RNB의 `점포 선택 해제`는 패널 닫기와 별도 동작이다.
- 주변 점포는 선택 업종과 일치하는 목록만 사용하며 `전체 N개 / 현재 M개`를 표시한다.
- Header의 가짜 사용자 avatar와 동작하지 않는 기간 dropdown을 제거했다.
- `지도에서 위치 선택`과 `이 위치에서 분석`으로 단계별 행동을 구분했다.

## 3. 자동 검증

- FE full test: 20 files, 59 tests passed
- App focused test after list regression addition: 10 tests passed
- TypeScript typecheck: passed
- Oxlint: passed
- production build: passed
- Task Packet: 51 packets passed
- `git diff --check`: passed

Vite는 기존 MapLibre·Three·Spark 대형 chunk warning을 계속 출력했다. 기능 실패는 아니며 GitHub
#55의 lazy-load 작업에서 다룬다.

## 4. 브라우저 검증

- local browser에서 LNB·RNB 닫기 버튼과 재열기 버튼이 각각 1개인지 확인했다.
- 닫은 직후 재열기 버튼으로 keyboard focus가 돌아오는 것을 확인했다.
- 두 패널을 다시 열었을 때 상권 선택과 분석 결과가 복원되는 것을 확인했다.
- 주변 점포 7개 fixture에서 처음 5개, 전체보기 뒤 7개가 표시되는 회귀 test를 추가했다.
- mobile 전용 drawer 검증은 GitHub #53의 범위로 유지한다.

## 5. 남은 범위

- mobile 전용 drawer 구조는 GitHub #53에서 진행한다.
- 기간 선택은 GitHub #50에서 진행한다.
