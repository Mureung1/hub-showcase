"""수집 파이프라인의 DB 접근. docs/plan/engineering/content-pipeline.md 16장.

parser·scoring 등 변환 로직은 DB를 모르고, DB 접근은 이 모듈에만 둔다.
사용자와 무관한 배치이므로 secret key(service_role) admin client를 쓴다.
"""

from __future__ import annotations

from app.content.models import PlannedItem
from app.db.supabase import create_admin_client


def fetch_source_row(source_id: str) -> dict | None:
    """sources 행 하나를 dict로. 없으면 None."""
    client = create_admin_client()
    result = client.table("sources").select("*").eq("id", source_id).limit(1).execute()
    rows = result.data or []
    return rows[0] if rows else None


def fetch_source_interests(source_id: str) -> list[tuple[str, float]]:
    """source의 관심사를 (이름, 가중치) 목록으로. source_rule 태깅 지표 계산에 쓴다."""
    client = create_admin_client()
    result = (
        client.table("source_interests")
        .select("weight, interests(name)")
        .eq("source_id", source_id)
        .execute()
    )
    interests: list[tuple[str, float]] = []
    for row in result.data or []:
        interest = row.get("interests") or {}
        name = interest.get("name")
        if name is not None:
            interests.append((name, float(row.get("weight", 1.0))))
    return interests


def fetch_existing_canonical_urls(canonical_urls: list[str]) -> set[str]:
    """주어진 canonical URL 중 이미 articles에 있는 것만 set으로 반환한다."""
    if not canonical_urls:
        return set()
    client = create_admin_client()
    result = (
        client.table("articles")
        .select("canonical_url")
        .in_("canonical_url", canonical_urls)
        .execute()
    )
    return {row["canonical_url"] for row in (result.data or [])}


def ingest_article(source_id: str, item: PlannedItem) -> dict:
    """ingest_rss_article RPC를 호출한다. {status, article_id} 반환.

    RPC 실패(예외)는 호출자가 처리한다.
    """
    client = create_admin_client()
    result = client.rpc(
        "ingest_rss_article",
        {"p_source_id": source_id, "p_article": item.to_rpc_payload()},
    ).execute()
    return result.data
