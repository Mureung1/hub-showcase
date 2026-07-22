"""계산스냅샷 라이터 — pipeline.실행_데이터() 결과를 DB에 append-only로 저장한다.

설계 근거: notes/DB-스키마-설계.md §6.1. UPDATE로 덮어쓰지 않는다 — 입력이 바뀔 때마다
새 스냅샷 행을 추가해 "그 시점 입력값으로 계산된 세액"이라는 감사 이력을 남긴다. 별지3
핵심값은 조회 편의를 위해 컬럼으로도 뽑아두고, pipeline 반환값 전체는 원본_json으로
통째 보존한다(§6.1의 "JSON은 감사용 원문, 정규화 컬럼은 조회용 캐시" 이중 저장).
"""

import json
from decimal import Decimal

from taxengine.db.conn import 삽입후id, 연결
from taxengine.money import 원


def _json_안전(obj):
    """Decimal 등 json이 모르는 타입 → 문자열. 감사용 원문이라 반올림 없이 그대로 남긴다."""
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"JSON으로 못 바꾸는 타입: {type(obj)}")


def _정답대조(r: dict, 정답: dict | None) -> tuple[int | None, int | None]:
    """cli/reproduce.py의 정답지 대조 로직과 같은 기준(일치 항목 수 / 대조 대상 수)."""
    if not 정답:
        return None, None
    rows = [
        (r["각사업연도소득"], 정답.get("각사업연도소득")),
        (r["과세표준"], 정답.get("과세표준")),
        (r["산출세액"], 정답.get("산출세액")),
        (r["차감납부세액"], 정답.get("차감납부세액")),
        (r["지방소득세"]["산출세액"], 정답.get("지방소득세")),
    ]
    rows = [(엔진, 실제) for 엔진, 실제 in rows if 실제 is not None]
    if not rows:
        return 0, 0
    일치 = sum(1 for 엔진, 실제 in rows if 원(엔진) == 원(실제))
    return 일치, len(rows)


def 저장(
    conn: 연결, 사업연도id: int, out: dict,
    *, 엔진버전: str | None = None, 입력해시: str | None = None,
) -> int:
    """pipeline.실행_데이터()의 반환값을 계산스냅샷 1행으로 저장하고 새 id를 돌려준다.

    커밋은 호출자 책임이다(taxengine.db.migrate의 삽입 함수들과 같은 관례).
    """
    r = out["r"]
    최저한세 = r["최저한세"]
    일치, 전체 = _정답대조(r, out.get("정답"))

    return 삽입후id(
        conn,
        """INSERT INTO 계산스냅샷 (
            사업연도id, 엔진버전, 입력해시,
            당기순이익, 가산조정, 차감조정, 각사업연도소득, 이월결손금공제, 과세표준, 산출세액,
            최저한세적용여부, 최저한세, 최저한세배제액, 공제감면세액_신청액, 공제감면세액_적용후,
            가산세, 기납부세액, 차감납부세액, 지방소득세_산출세액, 총납부세액,
            정답대조_일치항목수, 정답대조_전체항목수, 원본결과_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            사업연도id, 엔진버전, 입력해시,
            int(out["v"]["당기순이익"]), int(out["가산조정"]), int(out["차감조정"]),
            int(r["각사업연도소득"]), int(r["이월결손금공제"]), int(r["과세표준"]), int(r["산출세액"]),
            1 if 최저한세["적용"] else 0, int(최저한세["최저한세"]), int(최저한세["배제액"]),
            int(r["공제감면세액_신청액"]), int(r["공제감면세액"]),
            int(r["가산세"]), int(r["기납부세액"]), int(r["차감납부세액"]),
            int(r["지방소득세"]["산출세액"]), int(r["총납부세액"]),
            일치, 전체,
            json.dumps(out, ensure_ascii=False, default=_json_안전),
        ),
    )
