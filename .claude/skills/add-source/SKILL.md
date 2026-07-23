---
name: add-source
description: 미리캣 감시 게시판 소스를 새로 추가·검증할 때의 체크리스트. sources.py에 소스를 켜거나 새 지자체/버스조합 게시판을 붙일 때 사용 (예 "세종교통공사 소스 켜자", "대전시 공지 추가").
---

# 새 감시 소스 추가 절차

감시 소스 하나 붙이는 건 매번 같은 다단계 검증이다. 순서대로, 각 단계 **통과 확인 후** 다음으로.
`sources.py`(설정) / `scout.py`(파싱 로직) / 검증은 `scout.py` 직접 실행.

## 0) 대상 확인
- 이 게시판에 **교통 공지(우회·통제·노선변경·시간표)**가 실제로 실리는지 먼저 눈으로 확인. 일반 안내만 있으면 소스 가치 없음.
- robots.txt / 인코딩 / 정적 HTML 여부 훑기. JS로 그리는 목록(예: bis.sejong)은 requests로 못 긁으니 제외.

## 1) sources.py에 dict 추가 (일단 꺼둔 채로)
```python
{
    "id": "...",              # 짧은 식별자
    "name": "...",            # 사람이 읽을 이름
    "active": False,          # ← 검증 끝날 때까지 False
    "list_url": "...",
    "list_pattern": None,     # ← 2단계에서 채움
    "view_url": ".../{id}",   # 글번호 끼울 자리 {id}
    "note": "robots/인코딩/이 보드에 교통공지 실리는지",
}
```
- `active`는 **검증 다 끝나고 마지막에** True로.

## 2) list_pattern 정규식 맞추기 (목록에서 글번호+제목 뽑기)
- 목록 HTML을 받아 `re.findall`로 `(글번호, 제목)`이 뽑히게 정규식을 짠다.
- 버스조합 예: `r'boardSeq=(\d+)[^>]*>\s*([^<]{5,60})'` — 글번호가 쿼리스트링에 있음.
- **주의:** 소스마다 글 식별자 위치가 다르다. 세종(sctc)은 쿼리가 아니라 URL 경로(BBSW…)라 패턴이 완전히 다름.
- 검증: `fetch_list(source)`가 5~10건을 (번호, 제목)으로 정상 반환하나. 한글 안 깨지나(`apparent_encoding`).

## 3) 본문 셀렉터 확인 ⚠️ 함정
- **`scout.py`의 `fetch_body`는 지금 본문 영역을 `.sub04-05-view-wrap`로 하드코딩**하고 있다 (버스조합 전용).
- 새 소스는 본문 div class가 거의 확실히 다르다 → 그대로 두면 빈 문자열("")이 나온다.
- 해결: 소스 dict에 `body_selector` 필드를 넣고 `fetch_body`가 `source.get("body_selector", ".sub04-05-view-wrap")`처럼 소스별로 읽게 고친다. (이 리팩터가 두 번째 소스 붙일 때의 진짜 작업)
- 검증: `fetch_body(source, seq)`가 실제 본문 텍스트를 뽑나 (앞 400자 눈으로 확인).

## 4) 그래프 한 바퀴 돌려보기
- `run_scout.py`(또는 `graph.py`) 실행해서 이 소스의 글이 **수집→추출→저장**까지 도나 확인.
- 추출 결과(events)가 원문과 맞나 대충 눈으로. (정밀 검증은 평가셋 몫)

## 5) 켜고 기록
- 다 통과하면 `active: True`.
- `note`에 확인 결과 남기기 (robots 제약, 인코딩, 교통공지 밀도).
- 커밋은 `/miri-commit` — `MIRI-13: <소스명> 소스 추가·검증`.

## 수집 매너 (지키기)
하루 1회, 글 사이 `REQUEST_DELAY_SEC`(1.5초) 텀, 브라우저 UA, 이미 본 글 스킵(upsert). 저빈도 학습용 수집.
