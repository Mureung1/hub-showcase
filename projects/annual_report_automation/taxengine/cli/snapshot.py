"""DB 기반 세무조정 계산 + 계산스냅샷 저장 CLI.

    python -m taxengine.cli.snapshot --db PATH --fiscal-year-id N [--engine-version STR]

taxengine.cli.migrate로 이관해 둔 사업연도를 DB에서 읽어(taxengine.db.reader) 계산하고
(pipeline.실행_데이터), 결과를 계산스냅샷 1행으로 append한다(taxengine.db.snapshot) —
CSV 경로의 `python -m taxengine.cli.reproduce`와 같은 계산을 DB 입력으로 하는 버전이다.
"""

import sys
from pathlib import Path

from taxengine.db.migrate import db_열기
from taxengine.db.reader import 로드
from taxengine.db.snapshot import 저장
from taxengine.pipeline import 실행_데이터


def won(n) -> str:
    return f"{int(n):,}"


def run(db_path: str, 사업연도id: int, 엔진버전: str | None) -> int:
    conn = db_열기(Path(db_path))
    try:
        data = 로드(conn, 사업연도id)
        out = 실행_데이터(data)
        v, r = out["v"], out["r"]

        print(f"\n  사업연도id={사업연도id} 계산")
        if not v["ok"]:
            print("\n  [입력 무결성 검증 실패]")
            for chk in v["checks"]:
                if not chk["ok"]:
                    print(f"      ✗ {chk['name']} — {chk['detail']}")
            print("\n  ⚠️ 입력 오류가 있어 스냅샷을 저장하지 않습니다.\n")
            return 1

        print(f"  각사업연도소득 {won(r['각사업연도소득'])} · 과세표준 {won(r['과세표준'])} · "
              f"차감납부세액 {won(r['차감납부세액'])}")

        정답 = out.get("정답")
        if 정답:
            일치 = sum(
                1 for k, ans_k in [
                    ("각사업연도소득", "각사업연도소득"), ("과세표준", "과세표준"),
                    ("산출세액", "산출세액"), ("차감납부세액", "차감납부세액"),
                ]
                if 정답.get(ans_k) is not None and int(r[k]) == int(정답[ans_k])
            )
            print(f"  정답지 대조: {일치}건 일치(참고 — 상세는 cli/reproduce.py)")

        스냅샷id = 저장(conn, 사업연도id, out, 엔진버전=엔진버전)
        conn.commit()
        print(f"  ✅ 계산스냅샷id={스냅샷id} 저장\n")
        return 0
    finally:
        conn.close()


def main():
    argv = sys.argv[1:]

    def opt(flag):
        return argv[argv.index(flag) + 1] if flag in argv else None

    db_path = opt("--db")
    fyid = opt("--fiscal-year-id")
    if not db_path or not fyid:
        print(__doc__)
        sys.exit(2)
    sys.exit(run(db_path, int(fyid), opt("--engine-version")))


if __name__ == "__main__":
    main()
