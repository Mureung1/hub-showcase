"""섹션 분할과 문맥 생성.

원문을 검색 단위로 나누고 문맥을 붙인다. 정의는 docs/knowledge-schema.md 4장이다.

결정적 helper 다. 같은 원문에서 같은 청크가 나오며 생성 모델을 쓰지 않는다. 문서
자체의 장기 문맥이 필요한 경우에만 생성 모델로 요약을 덧붙이며 그 단계는 여기 없다.

섹션을 남기는 이유는 필수와 우대가 구간 라벨로만 갈리기 때문이다. 섹션이 사라진
청크는 "3년 이상"이 지원 자격인지 우대 사항인지 구분하지 못한다.
"""

from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass, field
from typing import Any

from careersignal.repositories.indexing import IndexRepository

MAX_CHARS = 1200
"""한 청크가 담는 글자 수 상한. 넘으면 줄 경계에서 나눈다."""

HEADER_MAX_CHARS = 40
"""구간 제목으로 볼 첫 줄의 길이 상한."""

CHARS_PER_TOKEN = 2.2
"""토큰 수 어림값의 나눗수.

한국어와 영어가 섞인 본문의 대략치다. 실제 토큰 수가 필요해지면 모델의 토크나이저로
바꾼다. `source_chunks.token_count` 는 예산 판단에만 쓰인다.
"""

_SENTENCE_END = re.compile(r"[.!?。]\s*$")
_HEADER_MARK = re.compile(r"^\s*(#{1,6}\s|[\[■⎥▍◆●]|\d+\.\s)")
_BULLET = re.compile(r"^\s*[-·•*▪–—]\s")
"""목록 항목의 표시.

목록 항목은 짧고 문장으로 끝나지 않아 제목처럼 보인다. 제목으로 잡으면 그 위의
진짜 구간 제목을 덮어써 자격 요건과 우대 사항을 가르지 못하게 된다.
"""


def token_estimate(text: str) -> int:
    """토큰 수 어림값. 정확한 값이 아니라는 것을 이름으로 밝힌다."""
    return max(1, math.ceil(len(text) / CHARS_PER_TOKEN))


def chunk_identifier(snapshot_id: str, ordinal: int) -> str:
    """같은 스냅샷의 같은 자리는 같은 청크다."""
    material = f"{snapshot_id}:{ordinal}".encode()
    return f"chunk_{hashlib.sha256(material).hexdigest()[:24]}"


def looks_like_header(line: str) -> bool:
    """이 줄이 구간 제목인가.

    표시가 붙었거나, 짧으면서 문장으로 끝나지 않으면 제목으로 본다. 사이트마다 표기가
    달라 한 가지 규칙으로 정하지 못한다.
    """
    stripped = line.strip()
    if not stripped or _BULLET.match(stripped):
        return False
    if _HEADER_MARK.match(stripped):
        return True
    return len(stripped) <= HEADER_MAX_CHARS and not _SENTENCE_END.search(stripped)


@dataclass(frozen=True, slots=True)
class Section:
    """제목 하나와 그 아래 본문."""

    title: str | None
    text: str


def split_sections(raw: str) -> tuple[Section, ...]:
    """빈 줄로 나눈 덩어리에서 제목과 본문을 가른다.

    덩어리의 첫 줄이 제목으로 보이고 아래에 본문이 있으면 그 줄을 제목으로 삼는다.
    제목만 있는 덩어리는 다음 덩어리의 제목이 된다.
    """
    blocks = [b for b in re.split(r"\n\s*\n", raw.replace("\r\n", "\n")) if b.strip()]
    sections: list[Section] = []
    carried: str | None = None

    for block in blocks:
        lines = [line for line in block.split("\n") if line.strip()]
        if not lines:
            continue
        if len(lines) == 1 and looks_like_header(lines[0]):
            carried = lines[0].strip()
            continue
        if looks_like_header(lines[0]):
            title, body = lines[0].strip(), lines[1:]
        else:
            title, body = carried, lines
        if not body:
            carried = title
            continue
        sections.append(Section(title=title, text="\n".join(body).strip()))
        carried = title
    return tuple(sections)


def split_long(text: str, limit: int = MAX_CHARS) -> tuple[str, ...]:
    """긴 본문을 줄 경계에서 나눈다. 문장을 자르지 않는다."""
    if len(text) <= limit:
        return (text,)
    parts: list[str] = []
    current: list[str] = []
    size = 0
    for line in text.split("\n"):
        if current and size + len(line) + 1 > limit:
            parts.append("\n".join(current))
            current, size = [], 0
        current.append(line)
        size += len(line) + 1
    if current:
        parts.append("\n".join(current))
    return tuple(parts)


def build_context(source: dict[str, Any], section: str | None) -> dict[str, Any]:
    """검색에 쓰는 문맥. 메타데이터에서 결정적으로 만든다."""
    return {
        "source_id": source["source_id"],
        "source_type": source["source_type"],
        "publisher": source.get("publisher"),
        "company_id": source.get("company_id"),
        "job_role_ids": list(source.get("job_role_ids") or ()),
        "section": section,
    }


def build_embedding_text(context: dict[str, Any], text: str) -> str:
    """문맥을 접두로 붙인 문자열. 임베딩과 키워드 검색의 입력이다."""
    head = " · ".join(
        str(v)
        for v in (
            context.get("publisher"),
            context.get("source_type"),
            context.get("section"),
        )
        if v
    )
    return f"{head}\n{text}" if head else text


@dataclass(frozen=True, slots=True)
class ChunkOutcome:
    """청크 생성 한 번의 결과."""

    created_chunks: int = 0
    indexed_snapshots: int = 0
    skipped_snapshots: int = 0
    empty: tuple[str, ...] = field(default_factory=tuple)
    """본문에서 청크가 하나도 나오지 않은 스냅샷."""


class ChunkIndexer:
    """스냅샷을 청크로 나눠 저장한다."""

    def __init__(self, repository: IndexRepository) -> None:
        self._repository = repository

    def run(self, dataset_version: str) -> ChunkOutcome:
        """아직 나누지 않은 스냅샷만 처리한다.

        스냅샷은 변경되지 않으므로 한 번 나눈 것을 다시 나누지 않는다. 새 스냅샷이
        생기면 그것만 처리한다.
        """
        done = self._repository.chunked_snapshots(dataset_version)
        created = indexed = skipped = 0
        empty: list[str] = []

        for row in self._repository.snapshots_to_index(dataset_version):
            snapshot_id = row["snapshot_id"]
            if snapshot_id in done:
                skipped += 1
                continue

            ordinal = 0
            for section in split_sections(row["raw_content"] or ""):
                for text in split_long(section.text):
                    context = build_context(row, section.title)
                    self._repository.add_chunk(
                        {
                            "chunk_id": chunk_identifier(snapshot_id, ordinal),
                            "snapshot_id": snapshot_id,
                            "section": section.title,
                            "ordinal": ordinal,
                            "text": text,
                            "context": context,
                            "embedding_text": build_embedding_text(context, text),
                            "token_count": token_estimate(text),
                            "dataset_version": dataset_version,
                        }
                    )
                    ordinal += 1
                    created += 1
            if ordinal == 0:
                empty.append(snapshot_id)
            else:
                indexed += 1

        return ChunkOutcome(
            created_chunks=created,
            indexed_snapshots=indexed,
            skipped_snapshots=skipped,
            empty=tuple(empty),
        )
