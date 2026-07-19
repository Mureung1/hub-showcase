from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, str(root / "scripts/check_code_structure.py"), "--root", str(root), "--self-test"],
        check=False,
    )
    if result.returncode:
        return result.returncode
    print("Code structure checker tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
