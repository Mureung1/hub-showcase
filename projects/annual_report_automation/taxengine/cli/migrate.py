"""CSV → SQLite 이관 CLI.

    python -m taxengine.cli.migrate --company "회사명" 폴더1 [폴더2 ...]
    python -m taxengine.cli.migrate --company-id 1 --owner-email a@b.com 폴더3

    --db PATH|URL      DB 파일 경로 또는 postgres:// URL (기본: TAXWIZ_DATABASE_URL 환경변수,
                        그것도 없으면 taxengine/db/taxwiz.db — SQLite는 없으면 schema.sql로 새로 만듦)
    --company 이름      새 회사를 만들어 이관
    --company-id ID     기존 회사id에 이어붙임 (연도가 자동으로 전기와 연결됨)
    --owner-email 이메일  이 회사의 소유자로 연결할 사용자 (없으면 사용자 연결 생략)
    --dry-run           실제로 커밋하지 않고 무엇이 이관될지만 확인

폴더는 오래된 사업연도 → 최신 사업연도 순서로 나열한다(사업연도.전기사업연도id·자산.전기자산id를
이 순서로 자동 연결한다). 자세한 설계 근거는 notes/DB-스키마-설계.md §9 참고.
"""

import sys
from pathlib import Path

from taxengine.db.conn import 기본_대상
from taxengine.db.migrate import db_열기, 이관

_값있는_플래그 = {"--db", "--company", "--company-id", "--owner-email"}


def _인자_파싱(argv: list[str]) -> tuple[dict, bool, list[str]]:
    값 = {}
    dry_run = False
    dirs = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--dry-run":
            dry_run = True
            i += 1
        elif a in _값있는_플래그:
            if i + 1 >= len(argv):
                raise SystemExit(f"{a} 다음에 값이 필요함")
            값[a] = argv[i + 1]
            i += 2
        else:
            dirs.append(a)
            i += 1
    return 값, dry_run, dirs


def run(argv: list[str]) -> int:
    값, dry_run, dirs = _인자_파싱(argv)

    if not dirs:
        print(__doc__)
        return 2
    if bool(값.get("--company")) == bool(값.get("--company-id")):
        print("⚠️ --company(새 회사) 또는 --company-id(기존 회사) 중 정확히 하나를 지정하세요.")
        return 2

    대상 = 값.get("--db") or 기본_대상()  # 문자열 postgres:// URL이면 Postgres, 아니면 SQLite 경로
    conn = db_열기(대상)
    try:
        결과 = 이관(
            conn, [Path(d) for d in dirs],
            company_name=값.get("--company"),
            company_id=int(값["--company-id"]) if 값.get("--company-id") else None,
            owner_email=값.get("--owner-email"),
            dry_run=dry_run,
        )
    except ValueError as e:
        print(f"\n  ⚠️ {e}\n")
        return 1
    finally:
        conn.close()

    태그 = "[dry-run] " if dry_run else ""
    # URL에는 비밀번호가 들어 있으므로 콘솔에 그대로 찍지 않는다
    표시 = "Postgres(접속 URL은 표시 생략)" if str(대상).startswith("postgres") else str(대상)
    print(f"\n  {태그}DB: {표시}")
    print(f"  회사id={결과['회사id']}, {len(결과['사업연도id들'])}개 사업연도 이관"
          f"{'(커밋 안 함)' if dry_run else ' 완료'}:")
    for d, 사업연도id in zip(결과["dirs"], 결과["사업연도id들"]):
        print(f"    {d} → 사업연도id={사업연도id}")
    print("")
    return 0


def main():
    sys.exit(run(sys.argv[1:]))


if __name__ == "__main__":
    main()
