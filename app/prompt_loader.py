"""prompts/*.md 로드. 코드에 프롬프트를 박지 않기 위한 유일한 통로."""

import re
from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

_PROMPT_BLOCK_RE = re.compile(r"## 프롬프트\s*\n```text\n(.*?)\n```", re.DOTALL)
_FEEDBACK_BLOCK_RE = re.compile(r"### `\{feedback_block\}`.*?```text\n(.*?)\n```", re.DOTALL)


def load(name: str) -> str:
    """prompts/{name}.md에서 '## 프롬프트' 블록의 텍스트만 뽑아 반환한다."""
    path = PROMPTS_DIR / f"{name}.md"
    content = path.read_text(encoding="utf-8")

    match = _PROMPT_BLOCK_RE.search(content)
    if not match:
        raise ValueError(f"{path}에서 '## 프롬프트' 블록을 찾지 못했다")
    return match.group(1)


def load_feedback_block() -> str:
    """summarize.md에서 '### `{feedback_block}`' 하위 블록의 텍스트만 뽑아 반환한다.

    지금은 summarize 재시도 때만 쓰는 유일한 호출자라 파일명을 고정한다.
    다른 단계도 필요해지면 그때 name 인자를 추가한다.
    """
    path = PROMPTS_DIR / "summarize.md"
    content = path.read_text(encoding="utf-8")

    match = _FEEDBACK_BLOCK_RE.search(content)
    if not match:
        raise ValueError(f"{path}에서 '{{feedback_block}}' 블록을 찾지 못했다")
    return match.group(1)


def fill(template: str, **kwargs) -> str:
    """{key} 자리표시자만 안전하게 치환한다.

    str.format()은 프롬프트 안 JSON 예시의 중괄호까지 자리표시자로
    해석해 깨지므로 쓰지 않는다. 단순 치환은 정확히 일치하는
    {key} 부분 문자열만 바꾸므로 다른 중괄호를 건드리지 않는다.
    """
    for key, value in kwargs.items():
        template = template.replace("{" + key + "}", str(value))
    return template
