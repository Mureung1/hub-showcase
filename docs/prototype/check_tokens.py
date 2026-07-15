# docs/prototype/check_tokens.py — 토큰 하드코딩 검사
import re, sys, pathlib

# docs/design-system.md 금지조항 3 예외 목록과 동기화. 이미 기록된 예외는
# "기존 예외 N건 통과"로 요약만 하고, 새로 나온 값만 상세 위반으로 보고한다.
EXCEPTIONS = [
    "border-left: 3px solid var(--accent)",             # S3 요약 박스 왼쪽 선
    "width: 88px",                                       # S3 .info-key 폭
    "gap: 6px",                                          # 칩 × 삭제 아이콘-텍스트 간격
    "width: 40px; height: 24px",                         # 토글 크기
    "top: 3px; left: 3px; width: 18px; height: 18px",    # 토글 knob 크기
    "left: 19px",                                        # 토글 on 상태 knob 위치
    "margin-bottom: 3px",                                # 탭바 아이콘 하단 여백
]

def is_exempt(line):
    return any(ex in line for ex in EXCEPTIONS)

violations = []
exempted = 0
for f in pathlib.Path("docs/prototype").glob("*.html"):
    text = f.read_text(encoding="utf-8")

    if 'href="tokens.css"' not in text:   # tokens.css 연결 누락 검사
        violations.append(f"{f.name}  tokens.css <link> 없음")

    for i, line in enumerate(text.splitlines(), 1):
        if re.search(r"#[0-9a-fA-F]{3,8}\b", line):       # 헥스코드
            if is_exempt(line):
                exempted += 1
            else:
                violations.append(f"{f.name}:{i}  헥스코드: {line.strip()}")
        if re.search(r"[:\s]-?\d+px", line) and "1px" not in line:  # px 직접 사용(1px 테두리 예외, 음수 포함)
            if is_exempt(line):
                exempted += 1
            else:
                violations.append(f"{f.name}:{i}  px 직접값: {line.strip()}")

if violations:
    print(f"❌ 토큰 위반 (기존 예외 {exempted}건 통과):\n" + "\n".join(violations))
    sys.exit(1)
print(f"✅ 토큰 검사 통과 (기존 예외 {exempted}건 포함)")
