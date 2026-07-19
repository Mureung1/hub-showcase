# 컴포넌트 연습용 빈칸 자료

오늘 만든 컴포넌트를 스스로 다시 만들어 보는 반복 연습 자료입니다.
답지는 완성된 실제 파일이고, 여기 있는 파일은 핵심 부분을 `/* TODO: ___ */` 빈칸으로 뚫어둔 버전입니다.

## 사용법

1. 연습할 실제 파일을 잠깐 빈칸 버전으로 바꿉니다.
   ```
   # 예: SummaryCard 연습
   cp docs/practice/SummaryCard.빈칸.jsx client/src/components/SummaryCard.jsx
   ```
2. 에디터에서 빈칸(`/* TODO: ___ */`)을 직접 채웁니다. 각 빈칸 옆에 힌트 주석이 있습니다.
3. `npm run dev`로 화면이 전과 똑같이 동작하는지 확인합니다.
4. 답지(완성본)와 비교합니다. 원래대로 되돌리려면:
   ```
   git checkout -- client/src/components/SummaryCard.jsx
   ```
5. 며칠 뒤에 다시 반복하면 손에 익습니다.

## 순서 (쉬운 것부터)

| 회차 | 파일 | 연습 포인트 |
| --- | --- | --- |
| 1회차 | [SummaryCard.빈칸.jsx](SummaryCard.빈칸.jsx) | props 구조분해, value/onChange 연결 (빈칸 적음) |
| 2회차 | [RecordCard.빈칸.jsx](RecordCard.빈칸.jsx) | import, 클릭 이벤트를 부모로 올리기, 데이터 표시 (빈칸 많음) |
| 3회차 | [RecordDetail연결.빈칸.md](RecordDetail연결.빈칸.md) | App.jsx에 state 추가, 화면 전환 연결 |

## 답지 위치

- `client/src/components/SummaryCard.jsx`
- `client/src/components/RecordCard.jsx`
- `client/src/pages/RecordDetail.jsx` + `client/src/App.jsx`
