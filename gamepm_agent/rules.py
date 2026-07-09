from __future__ import annotations

import re

from .models import DocumentType, IntentResult, IntentType


REQUIRED_FIELDS: dict[DocumentType, list[str]] = {
    DocumentType.NPC: [
        "name",
        "role",
        "location",
        "related_quest",
        "dialogue_tone",
        "design_intent",
    ],
    DocumentType.QUEST: [
        "quest_name",
        "start_condition",
        "completion_condition",
        "main_npc",
        "reward",
        "failure_condition",
    ],
    DocumentType.ITEM: [
        "item_name",
        "category",
        "acquisition",
        "effect",
        "balance_value",
    ],
    DocumentType.SYSTEM: ["system_name", "goal", "rules", "inputs", "outputs"],
    DocumentType.WORLD_SETTING: ["setting_name", "summary", "rules", "constraints"],
    DocumentType.MEETING_NOTE: ["meeting_title", "date", "attendees", "decisions"],
    DocumentType.UNKNOWN: [],
}


CHANGE_KEYWORDS = (
    "add",
    "append",
    "change",
    "create",
    "draft",
    "make",
    "modify",
    "reflect",
    "remove",
    "update",
    "write",
    "문서로",
    "만들어",
    "반영",
    "변경",
    "생성",
    "수정",
    "작성",
    "추가",
)

SEARCH_KEYWORDS = (
    "?",
    "find",
    "search",
    "show",
    "what",
    "where",
    "검색",
    "뭐",
    "무엇",
    "어디",
    "찾아",
)


def classify_intent(text: str) -> IntentResult:
    normalized = text.strip().lower()
    if not normalized:
        return IntentResult(
            IntentType.NEEDS_CLARIFICATION,
            0.0,
            "Empty input cannot be classified.",
        )

    has_change = any(keyword in normalized for keyword in CHANGE_KEYWORDS)
    has_search = any(keyword in normalized for keyword in SEARCH_KEYWORDS)

    if has_change and has_search:
        return IntentResult(
            IntentType.NEEDS_CLARIFICATION,
            0.45,
            "Input contains both change and search signals.",
        )
    if has_change:
        return IntentResult(
            IntentType.CHANGE_REQUEST,
            0.82,
            "Input contains explicit document creation or update language.",
        )
    if has_search:
        return IntentResult(
            IntentType.SEARCH,
            0.78,
            "Input looks like a project search question.",
        )
    return IntentResult(
        IntentType.TEMPORARY_IDEA,
        0.7,
        "No explicit apply request was found, so the input is treated as an idea.",
    )


def infer_document_type(text: str) -> DocumentType:
    normalized = text.lower()
    candidates: list[tuple[DocumentType, tuple[str, ...]]] = [
        (DocumentType.NPC, ("npc", "character", "캐릭터", "등장인물", "npc")),
        (DocumentType.QUEST, ("quest", "퀘스트", "임무")),
        (DocumentType.ITEM, ("item", "아이템", "장비", "소모품")),
        (DocumentType.SYSTEM, ("system", "시스템", "규칙", "전투", "경제")),
        (DocumentType.WORLD_SETTING, ("world", "setting", "세계관", "설정")),
        (DocumentType.MEETING_NOTE, ("meeting", "회의", "회의록")),
    ]
    for document_type, keywords in candidates:
        if any(keyword in normalized for keyword in keywords):
            return document_type
    return DocumentType.UNKNOWN


def missing_required_fields(document_type: DocumentType, content: str) -> list[str]:
    fields = REQUIRED_FIELDS.get(document_type, [])
    normalized = content.lower()
    missing: list[str] = []
    for field_name in fields:
        readable = field_name.replace("_", " ")
        if field_name not in normalized and readable not in normalized:
            missing.append(field_name)
    return missing


def default_title(text: str, document_type: DocumentType) -> str:
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    first_line = re.sub(r"^#+\s*", "", first_line)
    if first_line:
        return first_line[:80]
    return f"New {document_type.value.replace('_', ' ').title()} Document"


def build_markdown_draft(title: str, document_type: DocumentType, request_text: str) -> str:
    fields = REQUIRED_FIELDS.get(document_type, [])
    lines = [f"# {title}", "", f"Document Type: {document_type.value}", "", "## Request", request_text.strip()]
    if fields:
        lines.extend(["", "## Required Fields"])
        for field_name in fields:
            lines.append(f"- {field_name}: TBD")
    return "\n".join(lines).rstrip() + "\n"
