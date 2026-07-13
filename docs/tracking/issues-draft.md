# 이슈 초안 (GitHub 수동 등록용)

> [주간 계획](./weekly-plan.md)의 작업을 이슈 단위로 나눈 초안. 각 항목의 **제목**과 **본문**을 GitHub → New Issue에 그대로 붙여넣고, **라벨**을 지정한다.
> 순서(①~⑦)대로 진행. 모두 이번 주 핵심 경로라 우선순위는 `P0`.

## 라벨 체계 (먼저 생성 권장)
- **priority**: `P0`(핵심 경로) · `P1`(부가)
- **area**: `area:pipeline` · `area:frontend` · `area:ci`
- **type**: `type:feat` · `type:chore`

---

## ① `Feat(collect): arXiv 수집 스크립트`
**Labels**: `P0` `area:pipeline` `type:feat`
```
## 무엇을
- scripts/collect.py 작성
- arXiv API로 cs.CL·cs.AI·cs.LG 최근 논문 N편 수집
- LLM 관련 키워드로 필터링
- 메타데이터 파싱: 제목·저자·날짜·초록·arXiv 링크
- 중복 논문 제거

## 완료 기준 (DoD)
- [ ] 로컬 실행 시 논문 목록이 리스트/객체로 정상 출력된다
- [ ] 각 항목에 제목·저자·날짜·초록·링크가 채워진다

## 순서/우선순위
- 순서 1 · P0 (파이프라인 시작점)
```

## ② `Chore(env): Gemini API 키 발급 + .env 설정`
**Labels**: `P0` `area:pipeline` `type:chore`
```
## 무엇을
- Google Gemini API 키 발급
- .env에 키 저장 (.gitignore 포함 확인)
- requirements에 google-generativeai 반영/설치

## 완료 기준 (DoD)
- [ ] 최소 호출 예제로 키 연동이 확인된다
- [ ] .env가 git에 추적되지 않는다

## 순서/우선순위
- 순서 2 · P0 (요약 전 준비)
```

## ③ `Feat(summarize): Gemini 한국어 구조화 요약`
**Labels**: `P0` `area:pipeline` `type:feat`
```
## 무엇을
- scripts/summarize.py 작성
- Gemini Flash로 한국어 요약: 핵심 기여 / 방법 / 결과 + 배경 설명 + 한줄 요약
- 제목 한글 번역
- 에러/재시도(백오프) 처리

## 완료 기준 (DoD)
- [ ] 논문 1편 입력 → 구조화 요약 dict 반환
- [ ] 무료 티어 한도를 고려한 반복 호출 처리

## 순서/우선순위
- 순서 3 · P0
```

## ④ `Feat(pipeline): JSON 스키마·저장 + 통합(main.py)`
**Labels**: `P0` `area:pipeline` `type:feat`
```
## 무엇을
- scripts/main.py: 수집 → 요약 → data/YYYY-MM-DD.json 저장
- 출력 JSON 스키마 확정 (현 목 데이터 data/2026-07-09.json과 호환)
- 중요도 값 부여(단순 규칙: 최신순/키워드 가중치)

## 완료 기준 (DoD)
- [ ] python scripts/main.py 1회 실행 → 오늘자 JSON 생성
- [ ] 스키마에 제목(영/한)·저자·날짜·태그·중요도·요약·초록·링크 포함

## 순서/우선순위
- 순서 4 · P0
```

## ⑤ `Feat(frontend): 실데이터 연동 + F3/F4 점검`
**Labels**: `P0` `area:frontend` `type:feat`
```
## 무엇을
- web/app.js가 실제 생성 JSON을 읽도록 경로·스키마 정합
- F3 논문 상세·F4 북마크 동작 점검·보완
- 로컬 미리보기: 저장소 루트에서 python -m http.server 8000 → http://localhost:8000/web/
  (../data/ 상대경로 때문에 cd web 금지)

## 완료 기준 (DoD)
- [ ] 실데이터로 피드가 렌더된다
- [ ] 상세 보기·북마크가 정상 동작한다

## 순서/우선순위
- 순서 5 · P0
```

## ⑥ `Ci(actions): 파이프라인 cron 워크플로`
**Labels**: `P0` `area:ci` `type:chore`
```
## 무엇을
- .github/workflows/ 에 cron 워크플로 작성
- 매일 파이프라인 실행(수집→요약) → 생성 JSON 자동 커밋
- API 키를 GitHub Secrets로 주입

## 완료 기준 (DoD)
- [ ] workflow_dispatch 수동 실행이 끝까지 성공
- [ ] 생성된 JSON이 저장소에 커밋된다

## 순서/우선순위
- 순서 6 · P0
```

## ⑦ `Ci(pages): GitHub Pages 배포`
**Labels**: `P0` `area:ci` `type:chore`
```
## 무엇을
- GitHub Pages 활성화(배포 브랜치·경로 설정)
- 실데이터 브리핑이 웹에서 서빙되도록 경로 확인

## 완료 기준 (DoD)
- [ ] Pages URL에서 실데이터 '오늘의 브리핑'이 렌더된다

## 순서/우선순위
- 순서 7 · P0
```

---

## 등록 체크리스트
- [ ] 라벨 7종 생성
- [ ] 이슈 ①~⑦ 등록 (제목+본문+라벨)
- [ ] (선택) Projects 보드에 배치 (To do / In progress / Done)
- [ ] README에 이슈/보드 링크 추가
