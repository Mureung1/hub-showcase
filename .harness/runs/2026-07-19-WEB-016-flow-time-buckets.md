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

진행 중. API contract commit 뒤 Web 그래프를 6개 구간으로 교체한다.

## 4. 검증

진행 중.
