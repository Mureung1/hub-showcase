# docs/prototype/check_tokens.py — 토큰 하드코딩 검사
import re, sys, pathlib

violations = []
for f in pathlib.Path("docs/prototype").glob("*.html"):
    for i, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if re.search(r"#[0-9a-fA-F]{3,8}\b", line):       # 헥스코드
            violations.append(f"{f.name}:{i}  헥스코드: {line.strip()}")
        if re.search(r"[:\s]-?\d+px", line) and "1px" not in line:  # px 직접 사용(1px 테두리 예외, 음수 포함)
            violations.append(f"{f.name}:{i}  px 직접값: {line.strip()}")

if violations:
    print("❌ 토큰 위반:\n" + "\n".join(violations)); sys.exit(1)
print("✅ 토큰 검사 통과")