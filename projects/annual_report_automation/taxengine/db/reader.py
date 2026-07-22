"""SQLite → 엔진 입력 리더. taxengine.loader.로드()의 역방향(DB 버전).

`taxengine.db.migrate`가 CSV를 DB로 옮기는 쪽이라면, 이 모듈은 그 반대 방향이다:
사업연도id 하나를 받아 `pipeline.실행_데이터()`가 기대하는 것과 정확히 같은 모양의
딕셔너리로 돌려준다(notes/DB-스키마-설계.md §1의 설계 의도 — 엔진은 입력이 CSV에서
왔는지 DB에서 왔는지 몰라도 된다). bp(basis point)·0/1 같은 DB 전용 정수 인코딩은
여기서 전부 원래 단위(퍼센트·bool)로 풀어서 돌려준다 — 그래야 loader.자산행()/차량행()·
domain/company.py 등 기존 코드를 손대지 않고 그대로 재사용할 수 있다.
"""

from __future__ import annotations

from decimal import Decimal

from taxengine.db.conn import 연결


def _회사(conn: 연결, 사업연도id: int) -> dict:
    row = conn.execute(
        """SELECT 사업연도개시일, 사업연도종료일, 중소기업, 부동산임대업주업, 상시근로자수,
                  지배주주지분율_bp, 기납부세액, 이월결손금, 공제감면세액, 가산세, 기부금한도초과,
                  수입금액, 기업업무추진비_증빙불비금액
           FROM 사업연도 WHERE id = ?""",
        (사업연도id,),
    ).fetchone()
    if row is None:
        raise ValueError(f"사업연도id {사업연도id}를 찾을 수 없음")
    (개시일, 종료일, 중소기업, 부동산임대업주업, 상시근로자수, 지분율_bp,
     기납부세액, 이월결손금, 공제감면세액, 가산세, 기부금한도초과,
     수입금액, 추진비증빙불비) = row
    return {
        "사업연도개시일": 개시일, "사업연도종료일": 종료일,
        "중소기업": bool(중소기업), "부동산임대업주업": bool(부동산임대업주업),
        "상시근로자수": 상시근로자수,
        "지배주주지분율": (Decimal(지분율_bp) / 100) if 지분율_bp is not None else None,
        "기납부세액": 기납부세액, "이월결손금": 이월결손금,
        "공제감면세액": 공제감면세액, "가산세": 가산세, "기부금한도초과": 기부금한도초과,
        "수입금액": 수입금액,  # NULL 허용 — company.csv와 동일하게 "추진비 한도 자동계산 생략" 신호
        "기업업무추진비_증빙불비금액": 추진비증빙불비,
    }


def _재무제표(conn: 연결, 테이블: str, 사업연도id: int, *, 선택: bool) -> list[dict] | None:
    rows = conn.execute(
        # 테이블은 로드()가 넘기는 내부 리터럴 2종뿐(사용자 입력 아님) — f-string이어도 안전
        f"SELECT 계정, 구분, 금액 FROM {테이블} WHERE 사업연도id = ? ORDER BY 정렬순서, id",
        (사업연도id,),
    ).fetchall()
    if not rows and 선택:  # balance_sheet.csv가 아예 없는 것과 같은 상태 — opt()의 None과 동일하게
        return None
    return [{"계정": 계정, "구분": 구분, "금액": 금액} for 계정, 구분, 금액 in rows]


def _자산대장(conn: 연결, 사업연도id: int) -> list[dict]:
    rows = conn.execute(
        """SELECT 명, 구분, 취득일, 취득가, 기초누계, 회사계상액, 방법, 내용연수,
                  전기이월부인액, 업무용승용차
           FROM 자산 WHERE 사업연도id = ? ORDER BY id""",
        (사업연도id,),
    ).fetchall()
    return [
        {
            "명": 명, "구분": 구분, "취득일": 취득일, "취득가": 취득가,
            "기초누계": 기초누계, "회사계상액": 회사계상액, "방법": 방법,
            "내용연수": 내용연수, "전기이월부인액": 전기이월부인액,
            "업무용승용차": bool(업무용승용차),
        }
        for 명, 구분, 취득일, 취득가, 기초누계, 회사계상액, 방법, 내용연수, 전기이월부인액, 업무용승용차
        in rows
    ]


def _차량대장(conn: 연결, 사업연도id: int) -> list[dict]:
    rows = conn.execute(
        """SELECT 명, 감가상각비, 기타관련비용, 전용보험가입, 운행기록부작성, 업무사용비율_bp
           FROM 차량 WHERE 사업연도id = ? ORDER BY id""",
        (사업연도id,),
    ).fetchall()
    return [
        {
            "명": 명, "감가상각비": 감가상각비, "기타관련비용": 기타관련비용,
            "전용보험가입": bool(전용보험가입), "운행기록부작성": bool(운행기록부작성),
            "업무사용비율": (Decimal(bp) / 100) if bp is not None else None,
        }
        for 명, 감가상각비, 기타관련비용, 전용보험가입, 운행기록부작성, bp in rows
    ]


def _조정(conn: 연결, 사업연도id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT 과목, 구분, 금액, 소득처분, 근거 FROM 세무조정 WHERE 사업연도id = ? ORDER BY id",
        (사업연도id,),
    ).fetchall()
    return [
        {"과목": 과목, "구분": 구분, "금액": 금액, "소득처분": 소득처분, "근거": 근거}
        for 과목, 구분, 금액, 소득처분, 근거 in rows
    ]


def _정답지(conn: 연결, 사업연도id: int) -> dict | None:
    row = conn.execute(
        """SELECT 각사업연도소득, 과세표준, 산출세액, 차감납부세액, 지방소득세
           FROM 정답지 WHERE 사업연도id = ?""",
        (사업연도id,),
    ).fetchone()
    if row is None:
        return None
    각사업연도소득, 과세표준, 산출세액, 차감납부세액, 지방소득세 = row
    return {
        "각사업연도소득": 각사업연도소득, "과세표준": 과세표준, "산출세액": 산출세액,
        "차감납부세액": 차감납부세액, "지방소득세": 지방소득세,
    }


def 회사_프로필(conn: 연결, 회사id: int) -> dict | None:
    """회사의 "거의 고정" 프로필 + 지배주주 명단. 없으면 None. bp는 퍼센트로 풀어 돌려준다."""
    row = conn.execute(
        "SELECT id, 회사명, 설립연도, 중소기업, 부동산임대업주업, 상시근로자수 FROM 회사 WHERE id = ?",
        (회사id,),
    ).fetchone()
    if row is None:
        return None
    주주들 = conn.execute(
        "SELECT 명, 지분율_bp FROM 지배주주 WHERE 회사id = ? ORDER BY 정렬순서, id",
        (회사id,),
    ).fetchall()
    return {
        "id": row[0], "회사명": row[1], "설립연도": row[2],
        "중소기업": bool(row[3]), "부동산임대업주업": bool(row[4]), "상시근로자수": row[5],
        "지배주주목록": [
            {"명": 명, "지분율": float(Decimal(bp) / 100)} for 명, bp in 주주들
        ],
    }


def 로드(conn: 연결, 사업연도id: int) -> dict:
    """사업연도id 하나를 taxengine.loader.로드()와 같은 모양의 딕셔너리로 읽어온다."""
    return {
        "회사": _회사(conn, 사업연도id),
        "손익계산서": _재무제표(conn, "손익계산서항목", 사업연도id, 선택=False),
        "재무상태표": _재무제표(conn, "재무상태표항목", 사업연도id, 선택=True),
        "자산대장": _자산대장(conn, 사업연도id),
        "차량대장": _차량대장(conn, 사업연도id),
        "조정": _조정(conn, 사업연도id),
        "정답": _정답지(conn, 사업연도id),
    }
