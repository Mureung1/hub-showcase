# 대학 학식 폴백 JSON 갱신하는 법

`server/data/univ-meals.json`은 크롤링(`server/univMealAdapters/cnu.js`)이 실패했을 때만 대신
쓰인다. 크롤링이 정상 동작하면 이 파일은 실제로 노출되지 않지만, 크롤링 성공 시 서버가 이 파일을
최신 크롤링 결과로 **자동 갱신**하므로(별도 배포 없이) 아래 수동 절차는 크롤링이 오래 실패한
경우를 위한 보험이다.

## 자동 갱신되는 경우 (평소)

크롤링(`/api/univ-meal`)이 성공하면 서버가 그 결과를 파일에 그대로 저장한다 — 다음 실패 때 이것이
최신 폴백이 된다. 별도로 할 일이 없다.

## 수동으로 갱신해야 하는 경우 (크롤링이 오래 실패했을 때)

1. 제2·3·4학생회관, 생활과학대학(4개 건물 — 제1학생회관은 이 시스템에 데이터가 없어 항상
   `external`이라 갱신 대상이 아니다) 각각의 실제 운영 메뉴를
   https://mobileadmin.cnu.ac.kr/food/index.jsp 에서 확인한다.
2. `cnu.days`의 해당 날짜(`YYYYMMDD`) → `cafeterias.<cnu2|cnu3|cnu4|cnuLife>.meals.<breakfast|lunch|dinner>.<student|staff>`
   에 아래 형태로 채워 넣는다:
   ```json
   { "status": "open", "price": 6000, "note": null, "menus": [{ "name": "메뉴명", "allergyCodes": ["M6"], "estimated": true }] }
   ```
   운영하지 않는 끼니는 `{ "status": "closed", "price": null, "note": null, "menus": [] }`.
3. `cnu.updatedAt`을 오늘 날짜(`YYYY-MM-DD`)로 갱신한다 — 화면의 "○월 ○일 기준" 안내에 그대로 쓰인다.
4. 저장 후 커밋·배포.

## 스키마 참고

```
{
  cnu: {
    week: 'YYYYMMDD',        // 그 주 월요일
    updatedAt: 'YYYY-MM-DD',
    days: [
      {
        date: 'YYYYMMDD',
        cafeterias: {
          cnu1: { name, meals: { breakfast, lunch, dinner } },   // 항상 status:'external'
          cnu2: { name, meals: { breakfast, lunch, dinner } },
          cnu3: { ... }, cnu4: { ... }, cnuLife: { ... },
        }
      }, ... (보통 월~토 6일)
    ]
  }
}
```
`meals.<끼니>` = `{ student: MealSlot, staff: MealSlot }`.
`MealSlot` = `{ status: 'open'|'closed'|'suspended'|'external', price, note, menus: [{name, allergyCodes, estimated:true}] }`.
