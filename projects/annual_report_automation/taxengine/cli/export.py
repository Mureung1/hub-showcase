"""Excel 출력 CLI — 세무사 전달용 초안(근거 각주 포함)을 xlsx로 저장한다.

    python -m taxengine.cli.export [--dir <폴더>] [--out <파일.xlsx>]
    기본 출력 파일명: <폴더이름>-세무조정.xlsx
"""

import sys
from pathlib import Path

from taxengine.pipeline import 실행
from taxengine.export.excel import 작성


def run(dir_str: str, out_str: str) -> int:
    d = Path(dir_str)
    out = 실행(d)
    작성(out, out_str)
    print(f"\n  ✅ Excel 저장: {out_str}\n")
    return 0


def main():
    argv = sys.argv[1:]

    def opt(flag):
        return argv[argv.index(flag) + 1] if flag in argv else None

    dir_str = opt("--dir") or "data/example/fy2025"
    기본출력 = f"{Path(dir_str).name}-세무조정.xlsx"
    sys.exit(run(dir_str, opt("--out") or 기본출력))


if __name__ == "__main__":
    main()
