"""시드 CSV 의 공통 규약.

컬럼 순서, NULL 표기, jsonb·배열 직렬화를 한곳에서 정한다.
``agent/data/demo_seed/CONTRACT.md`` 9장이 이 파일의 기준이다.

데이터베이스에 접속하지 않는다.
"""

from __future__ import annotations

import csv
import hashlib
import json
import unicodedata
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path

NULL = r"\N"

# 적재 순서 = 외래키 순서. build_demo_seed 와 load_demo_seed 가 이 순서를 그대로 쓴다.
TABLE_COLUMNS: dict[str, tuple[str, ...]] = {
    "dataset_versions": (
        "dataset_version", "job_role_id", "as_of_date", "note", "sealed_at",
    ),
    # 실행 봉투가 원본보다 먼저 온다.
    # source_assessments.assessed_by_run_id 가 agent_runs 를 참조하므로
    # 분석 버전과 실행 행이 원본 적재보다 앞에 있어야 외래키가 성립한다.
    "requirement_taxonomies": ("taxonomy_id", "job_role_id"),
    "requirement_taxonomy_versions": (
        "taxonomy_version_id", "taxonomy_id", "version_number",
        "taxonomy_policy_version", "published_at", "superseded_at",
    ),
    "knowledge_versions": (
        "knowledge_version", "job_role_id", "taxonomy_version_id", "published_at",
    ),
    "analysis_versions": (
        "analysis_version", "job_role_id", "dataset_version", "taxonomy_version_id",
        "knowledge_version", "model_version", "prompt_version",
        "retrieval_policy_version", "metric_policy_version", "scope_spec", "status",
        "tokens", "cost", "started_at", "ended_at",
    ),
    "agent_runs": (
        "agent_run_id", "analysis_version", "agent_name", "objective_id", "iteration",
        "stop_reason", "tokens", "cost", "started_at", "ended_at",
    ),
    "sources": (
        "source_id", "source_type", "url", "publisher", "author", "robots_policy",
        "license_note", "job_role_ids", "company_id", "first_seen_at",
    ),
    "source_snapshots": (
        "snapshot_id", "source_id", "content_hash", "raw_content", "published_at",
        "fetched_at", "dataset_version", "supersedes_snapshot_id",
    ),
    "source_observations": (
        "observation_id", "snapshot_id", "observed_at", "fetch_status",
        "canonical_url", "http_status", "notes",
    ),
    "source_assessments": (
        "assessment_id", "snapshot_id", "source_tier", "allowed_uses",
        "reliability_score", "assessment_version", "assessed_at", "assessed_by_run_id",
    ),
    "postings": (
        "posting_id", "source_id", "company_id", "job_role_id", "first_posted_at",
    ),
    "posting_versions": (
        "posting_version_id", "posting_id", "snapshot_id", "title", "career_label_raw",
        "edu_label_raw", "entry_label_raw", "entry_label", "posted_at", "closed_at",
        "dataset_version",
    ),
    "source_chunks": (
        "chunk_id", "snapshot_id", "section", "ordinal", "text", "context",
        "embedding_text", "token_count", "dataset_version",
    ),
    "requirement_dimensions": ("dimension_id", "taxonomy_id", "dimension_kind"),
    "requirement_dimension_versions": (
        "dimension_version_id", "dimension_id", "taxonomy_version_id",
        "internal_canonical_label", "display_label", "definition", "lifecycle_status",
        "standard_mapping_status", "standard_id", "mapping_confidence",
        "mapping_evidence", "review_status", "role_boundary_eligible",
    ),
    "requirement_aliases": (
        "alias_id", "dimension_id", "taxonomy_version_id", "alias_text", "alias_source",
    ),
    "requirement_dimension_relations": (
        "relation_id", "taxonomy_version_id", "src_dimension_id", "dst_dimension_id",
        "relation_type",
    ),
    "capabilities": (
        "capability_id", "job_role_id", "canonical_label", "definition", "is_active",
    ),
    "capability_dimension_links": (
        "capability_id", "dimension_id", "taxonomy_version_id",
    ),
    "requirement_mentions": (
        "mention_id", "posting_version_id", "snapshot_id", "chunk_id", "raw_expression",
        "evidence_span_start", "evidence_span_end", "stated_requiredness", "section",
        "extraction_confidence", "extraction_run_id", "dataset_version",
    ),
    "chunk_extractions": (
        "chunk_id", "dataset_version", "extraction_run_id", "mention_count",
        "extracted_at",
    ),
    "posting_requirement_assignments": (
        "assignment_id", "mention_id", "taxonomy_version_id", "dimension_id",
        "normalized_label", "requiredness", "depth_level", "assignment_confidence",
        "assignment_method", "verifier_status",
    ),
    "dimension_metric_applicability": (
        "taxonomy_version_id", "dimension_id", "metric_family", "applicable", "reason",
    ),
    "statistics_facts": (
        "fact_id", "analysis_version", "metric_family", "metric_policy_version",
        "scope_level", "scope_id", "entry_segment", "period_id", "dimension_id",
        "secondary_dimension_id", "measure", "numerator", "denominator", "value",
        "sample_size", "sample_status", "uncertainty",
    ),
    "capability_depth_profiles": (
        "profile_id", "capability_id", "taxonomy_version_id", "scope_level", "scope_id",
        "entry_segment", "period_id", "depth_distribution", "expected_depth",
        "sample_size", "evidence_support", "confidence", "analysis_version",
    ),
    "saturation_observations": (
        "observation_id", "analysis_version", "job_role_id", "scope_id",
        "posting_count", "new_candidate_count", "cumulative_dimension_count",
        "marginal_gain", "observed_at",
    ),
    "knowledge_nodes": (
        "node_id", "graph_layer", "node_type", "ref_table", "ref_id", "label",
        "ontology_version", "dataset_version", "taxonomy_version_id", "analysis_version",
    ),
    "knowledge_edges": (
        "edge_id", "graph_layer", "edge_type", "src_node_id", "dst_node_id", "weight",
        "evidence_id", "produced_by_run_id", "verification_status", "ontology_version",
        "dataset_version", "taxonomy_version_id", "analysis_version", "valid_from",
        "valid_to",
    ),
    "graph_paths": (
        "path_id", "path_type", "node_sequence", "edge_sequence", "taxonomy_version_id",
        "knowledge_version", "analysis_version", "graph_policy_version", "computed_at",
    ),
    "wiki_pages": ("page_id", "capability_id", "knowledge_version", "status"),
    "wiki_revisions": (
        "revision_id", "page_id", "definition", "why_required", "depth_criteria",
        "prerequisites", "common_misconceptions", "interview_verification",
        "learning_sequence", "produced_by_run_id",
    ),
    "wiki_evidence": ("revision_id", "field_name", "chunk_id", "source_tier"),
    "analysis_outputs": (
        "output_id", "analysis_version", "job_role_id", "scope_level", "scope_id",
        "output_type", "payload", "produced_by_agent", "verification_status",
        "generated_at",
    ),
    "analysis_claims": (
        "claim_id", "analysis_version", "output_id", "claim_type", "requirement_kind",
        "scope_level", "scope_id", "claim_text", "structured_slots", "confidence",
        "confidence_components", "verification_status",
    ),
    "analysis_claim_evidence": (
        "claim_id", "support_type", "support_id", "relation", "weight",
    ),
    "coverage_assertions": (
        "assertion_id", "analysis_version", "scope_level", "scope_id", "dimension_id",
        "population_n", "checked_n", "matched_n", "assertion", "coverage_complete",
    ),
    "checklist_concepts": ("concept_id", "job_role_id", "canonical_title", "kind"),
    "checklist_items": (
        "item_id", "concept_id", "analysis_version", "scope_level", "scope_id", "title",
        "subtitle", "reason", "evidence_needed", "channels", "required", "is_deviation",
    ),
    "roadmap_items": (
        "roadmap_item_id", "analysis_version", "scope_level", "scope_id", "step_order",
        "phase_label", "weeks", "priority", "title", "body", "deliverable", "reason",
        "tags",
    ),
    "roadmap_item_fills": ("roadmap_item_id", "concept_id", "fill_kind"),
    "study_tracks": (
        "track_id", "analysis_version", "scope_level", "scope_id", "capability_id",
        "phase_label", "priority", "depth_reference",
    ),
    "verification_results": (
        "result_id", "analysis_version", "target_type", "target_id", "check_name",
        "autonomy_level", "verdict", "severity", "reason_code", "repair_action",
        "judge_model", "detail",
    ),
    "active_analysis_versions": (
        "job_role_id", "analysis_version", "activated_at",
    ),
    "user_postings": (
        "user_posting_id", "content_hash", "normalized_text", "char_length",
        "job_role_id", "detected_by", "first_seen_at",
    ),
    "user_posting_analyses": (
        "user_analysis_id", "user_posting_id", "analysis_version",
        "taxonomy_version_id", "output_type", "payload", "produced_by", "generated_at",
    ),
}

LOAD_ORDER: tuple[str, ...] = tuple(TABLE_COLUMNS)

# jsonb 컬럼. 값이 dict·list 면 json 문자열로 바꾼다.
JSONB_COLUMNS: frozenset[tuple[str, str]] = frozenset(
    {
        ("source_chunks", "context"),
        ("requirement_dimension_versions", "mapping_evidence"),
        ("analysis_versions", "scope_spec"),
        ("statistics_facts", "uncertainty"),
        ("capability_depth_profiles", "depth_distribution"),
        ("capability_depth_profiles", "evidence_support"),
        ("wiki_revisions", "depth_criteria"),
        ("wiki_revisions", "prerequisites"),
        ("wiki_revisions", "common_misconceptions"),
        ("wiki_revisions", "interview_verification"),
        ("wiki_revisions", "learning_sequence"),
        ("analysis_outputs", "payload"),
        ("analysis_claims", "structured_slots"),
        ("analysis_claims", "confidence_components"),
        ("verification_results", "detail"),
        ("user_posting_analyses", "payload"),
    }
)

# text[] 컬럼. PostgreSQL 배열 리터럴로 쓴다.
ARRAY_COLUMNS: frozenset[tuple[str, str]] = frozenset(
    {
        ("sources", "job_role_ids"),
        ("source_assessments", "allowed_uses"),
        ("graph_paths", "node_sequence"),
        ("graph_paths", "edge_sequence"),
        ("checklist_items", "channels"),
        ("roadmap_items", "tags"),
    }
)


def sha256_hex(text: str) -> str:
    """UTF-8 로 인코딩한 문자열의 SHA-256 hex 64자."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def array_literal(values: Iterable[str]) -> str:
    """PostgreSQL text[] 리터럴. 값에 쉼표·따옴표·공백이 있으면 감싼다."""
    parts: list[str] = []
    for value in values:
        item = str(value)
        if item == "" or any(ch in item for ch in ',{}"\\ \t\n'):
            escaped = item.replace("\\", "\\\\").replace('"', '\\"')
            parts.append(f'"{escaped}"')
        else:
            parts.append(item)
    return "{" + ",".join(parts) + "}"


def encode(table: str, column: str, value: object) -> str:
    """한 칸을 CSV 문자열로 바꾼다."""
    if value is None:
        return NULL
    if (table, column) in JSONB_COLUMNS:
        if isinstance(value, str):
            return value
        return json.dumps(value, ensure_ascii=False, sort_keys=False)
    if (table, column) in ARRAY_COLUMNS:
        if isinstance(value, str):
            return value
        return array_literal(value)  # type: ignore[arg-type]
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def row_values(table: str, row: Mapping[str, object]) -> list[str]:
    """계약이 정한 컬럼 순서로 한 행을 편다. 없는 컬럼은 NULL 이다."""
    columns = TABLE_COLUMNS[table]
    unknown = set(row) - set(columns)
    if unknown:
        raise KeyError(f"{table} 에 없는 컬럼: {sorted(unknown)}")
    return [encode(table, column, row.get(column)) for column in columns]


def write_table(path: Path, table: str, rows: Sequence[Mapping[str, object]]) -> int:
    """테이블 하나를 CSV 로 쓴다. 헤더를 포함한다."""
    path.parent.mkdir(parents=True, exist_ok=True)
    columns = TABLE_COLUMNS[table]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(columns)
        for row in rows:
            writer.writerow(row_values(table, row))
    return len(rows)


def write_part(root: Path, part: str, tables: Mapping[str, Sequence[Mapping[str, object]]]) -> dict[str, int]:
    """한 갈래의 조각을 ``parts/<part>/<table>.csv`` 로 쓴다."""
    counts: dict[str, int] = {}
    for table, rows in tables.items():
        if table not in TABLE_COLUMNS:
            raise KeyError(f"계약에 없는 테이블: {table}")
        if not rows:
            continue
        counts[table] = write_table(root / "parts" / part / f"{table}.csv", table, rows)
    return counts


def normalize_posting_text(raw: str) -> str:
    """사용자 입력 공고 원문 정규화. CONTRACT 6.2 와 같은 규칙이다."""
    import re

    text = unicodedata.normalize("NFC", raw)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "", text)
    text = re.sub(r"0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}", "", text)
    text = re.sub(r"\d{6}[-\s]?[1-4]\d{6}", "", text)
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    collapsed: list[str] = []
    for line in lines:
        if line == "" and collapsed and collapsed[-1] == "":
            continue
        collapsed.append(line)
    return "\n".join(collapsed).strip()


def demo_seed_root() -> Path:
    """``agent/data/demo_seed`` 절대 경로."""
    return Path(__file__).resolve().parents[2] / "data" / "demo_seed"
