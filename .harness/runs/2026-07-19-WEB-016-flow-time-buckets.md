# Run Report: WEB-016 실제 시간 구간 정합성

## 1. 문제 재현

기존 Web은 API의 6개 구간을 14개 막대로 복제하고 index에 2를 곱해 실제 원천에 없는 시간값을
만들었다. API 응답에는 구간 이름이 없어 Web 상수와 순서가 어긋날 위험도 있었다.

## 2. API contract

`raw.flow_time_buckets`에 다음 6개 label과 nullable value를 제공한다.

```text
00:00-06:00, 06:00-11:00, 11:00-14:00,
14:00-17:00, 17:00-21:00, 21:00-24:00
```

## 3. Web 결과

- API의 6개 `label`을 축과 선택 상태에 그대로 사용한다.
- 막대는 6개만 만들며 존재하지 않는 2시간 간격 값을 보간하지 않는다.
- `null` 구간은 낮은 값처럼 보이지 않도록 비활성 `데이터 없음`으로 표시한다.
- 마지막 구간은 `21-24`이며 24시간을 넘는 label을 만들지 않는다.

## 4. 검증

- API market analysis: 6 tests passed
- API Ruff: passed
- FE full test: 20 files, 60 tests passed
- FE focused time-bucket tests: 10 tests passed
- TypeScript typecheck: passed
- Oxlint: passed
- production build: passed
- Task Packet: 52 packets passed

공개 Render와 Vercel은 두 commit을 모두 배포한 뒤 별도 smoke test한다.
