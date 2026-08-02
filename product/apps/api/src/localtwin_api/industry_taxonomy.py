"""Build a published taxonomy directly from the raw public-data code path."""

from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha256
from uuid import uuid4

from sqlalchemy import func, insert, literal, select
from sqlalchemy.orm import Session

from localtwin_api.db_models import (
    IndustryTaxonomyNode,
    IndustryTaxonomyVersion,
    StoreCatalogPublication,
    StoreMarketLink,
    StorePoint,
    StoreTaxonomyAssignment,
    StoreTaxonomyAssignmentRun,
)

PUBLICATION_KEY = "seoul-commercial-default"


def _path(*parts: str) -> str:
    return "/".join(parts)


def published_assignment_run_id(session: Session) -> str | None:
    return session.scalar(
        select(StoreCatalogPublication.assignment_run_id).where(
            StoreCatalogPublication.publication_key == PUBLICATION_KEY
        )
    )


def published_taxonomy_nodes(session: Session) -> list[IndustryTaxonomyNode]:
    run_id = published_assignment_run_id(session)
    if not run_id:
        return []
    version_id = session.scalar(
        select(StoreTaxonomyAssignmentRun.taxonomy_version_id).where(
            StoreTaxonomyAssignmentRun.id == run_id
        )
    )
    if not version_id:
        return []
    return list(
        session.scalars(
            select(IndustryTaxonomyNode)
            .where(IndustryTaxonomyNode.taxonomy_version_id == version_id)
            .order_by(
                IndustryTaxonomyNode.level,
                IndustryTaxonomyNode.display_name,
                IndustryTaxonomyNode.id,
            )
        )
    )


def published_leaf_node_ids(session: Session, node_id: str) -> list[str]:
    """Resolve a published tree node to its leaf nodes without Python category matching."""

    nodes = published_taxonomy_nodes(session)
    by_parent: dict[str | None, list[IndustryTaxonomyNode]] = {}
    for node in nodes:
        by_parent.setdefault(node.parent_path_key, []).append(node)
    selected = next((node for node in nodes if node.id == node_id), None)
    if selected is None:
        return []
    resolved: list[str] = []
    pending = [selected]
    while pending:
        current = pending.pop()
        if current.is_leaf:
            resolved.append(current.id)
        else:
            pending.extend(by_parent.get(current.path_key, []))
    return resolved


def published_taxonomy_counts(session: Session, market_code: str) -> dict[str, int]:
    run_id = published_assignment_run_id(session)
    if not run_id:
        return {}
    rows = session.execute(
        select(StoreTaxonomyAssignment.leaf_node_id, func.count(StoreTaxonomyAssignment.store_id))
        .join(StoreMarketLink, StoreMarketLink.store_id == StoreTaxonomyAssignment.store_id)
        .where(
            StoreTaxonomyAssignment.assignment_run_id == run_id,
            StoreMarketLink.market_code == market_code,
        )
        .group_by(StoreTaxonomyAssignment.leaf_node_id)
    ).all()
    leaf_counts = {node_id: int(count) for node_id, count in rows}
    counts = dict(leaf_counts)
    nodes = published_taxonomy_nodes(session)
    leaf_paths = {node.id: node.path_key for node in nodes if node.is_leaf}
    for node in nodes:
        if node.is_leaf:
            continue
        counts[node.id] = sum(
            count
            for leaf_id, count in leaf_counts.items()
            if leaf_paths.get(leaf_id, "").startswith(f"{node.path_key}/")
        )
    return counts


def materialize_current_taxonomy(session: Session) -> str:
    """Create and publish one deterministic assignment run for the current store snapshot."""

    raw_rows = session.execute(
        select(
            StorePoint.category_large_code,
            StorePoint.category_large_name,
            StorePoint.category_middle_code,
            StorePoint.category_middle_name,
            StorePoint.category_small_code,
            StorePoint.category_small_name,
        ).distinct()
    ).all()
    snapshot_ids = set(session.scalars(select(StorePoint.source_snapshot_id).distinct()).all())
    if not raw_rows:
        raise ValueError("Cannot build taxonomy without store points.")
    if len(snapshot_ids) != 1:
        raise ValueError("Store points must belong to one current source snapshot.")
    snapshot_id = snapshot_ids.pop()
    raw_paths = {
        (
            large_code or "UNKNOWN",
            large_name or "업종 미상",
            middle_code or "UNKNOWN",
            middle_name or "업종 미상",
            small_code or "UNKNOWN",
            small_name or "업종 미상",
        )
        for large_code, large_name, middle_code, middle_name, small_code, small_name in raw_rows
    }
    fingerprint = sha256(repr(sorted(raw_paths)).encode()).hexdigest()
    existing = session.scalar(
        select(IndustryTaxonomyVersion).where(
            IndustryTaxonomyVersion.source_fingerprint == fingerprint
        )
    )
    if existing:
        run = session.scalar(
            select(StoreTaxonomyAssignmentRun).where(
                StoreTaxonomyAssignmentRun.taxonomy_version_id == existing.id
            )
        )
        if run:
            session.merge(
                StoreCatalogPublication(
                    publication_key=PUBLICATION_KEY,
                    assignment_run_id=run.id,
                    published_at=datetime.now(UTC).isoformat(),
                )
            )
            return run.id

    version_id = str(uuid4())
    now = datetime.now(UTC).isoformat()
    version = IndustryTaxonomyVersion(
        id=version_id,
        source_snapshot_id=snapshot_id,
        version_name=f"raw-{snapshot_id[:12]}",
        status="VALIDATED",
        source_fingerprint=fingerprint,
        created_at=now,
    )
    session.add(version)
    node_ids: dict[str, str] = {}
    node_rows: list[dict[str, object]] = []
    for large_code, large_name, middle_code, middle_name, small_code, small_name in sorted(
        raw_paths
    ):
        paths = (
            (1, _path(large_code), large_code, large_name, None, False),
            (2, _path(large_code, middle_code), middle_code, middle_name, _path(large_code), False),
            (
                3,
                _path(large_code, middle_code, small_code),
                small_code,
                small_name,
                _path(large_code, middle_code),
                True,
            ),
        )
        for level, path_key, code, name, parent_path, is_leaf in paths:
            if path_key in node_ids:
                continue
            node_id = str(uuid4())
            node_ids[path_key] = node_id
            node_rows.append(
                {
                    "id": node_id,
                    "taxonomy_version_id": version_id,
                    "level": level,
                    "source_code": code,
                    "source_name": name,
                    "display_name": name,
                    "parent_path_key": parent_path,
                    "path_key": path_key,
                    "is_leaf": is_leaf,
                }
            )
    session.flush()
    session.execute(insert(IndustryTaxonomyNode), node_rows)
    run_id = str(uuid4())
    session.add(
        StoreTaxonomyAssignmentRun(
            id=run_id,
            source_snapshot_id=snapshot_id,
            taxonomy_version_id=version_id,
            status="VALIDATED",
            input_fingerprint=fingerprint,
            created_at=now,
        )
    )
    # PostgreSQL creates all assignments set-wise. This avoids hydrating or
    # iterating 500k ORM objects during an operational promotion.
    leaf_path = func.concat_ws(
        "/",
        func.coalesce(StorePoint.category_large_code, "UNKNOWN"),
        func.coalesce(StorePoint.category_middle_code, "UNKNOWN"),
        func.coalesce(StorePoint.category_small_code, "UNKNOWN"),
    )
    assignment_select = select(
        literal(run_id), StorePoint.store_id, IndustryTaxonomyNode.id, literal("RESOLVED")
    ).join(
        IndustryTaxonomyNode,
        (IndustryTaxonomyNode.taxonomy_version_id == version_id)
        & (IndustryTaxonomyNode.path_key == leaf_path),
    )
    session.execute(
        insert(StoreTaxonomyAssignment).from_select(
            ["assignment_run_id", "store_id", "leaf_node_id", "status"], assignment_select
        )
    )
    session.merge(
        StoreCatalogPublication(
            publication_key=PUBLICATION_KEY, assignment_run_id=run_id, published_at=now
        )
    )
    return run_id
