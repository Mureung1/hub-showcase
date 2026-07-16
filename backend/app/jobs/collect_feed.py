"""RSS 수집 실행 CLI. content_pipeline.md 3장.

    uv run python -m app.jobs.collect_feed --source-id <uuid> --dry-run
    uv run python -m app.jobs.collect_feed --source-id <uuid> --save

로그에는 secret, feed 응답 전문, excerpt 전문을 남기지 않는다.
title, 원래/정규화 URL, 상태, 사유만 출력한다.
"""

from __future__ import annotations

import argparse
import sys

from app.content import service
from app.content.models import CollectionPlan, ItemStatus, PipelineError

EXIT_SUCCESS = 0
EXIT_PARTIAL_FAILURE = 1
EXIT_FAILURE = 2


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="collect_feed", description="RSS/Atom 수집 파이프라인 실행")
    parser.add_argument("--source-id", required=True, help="수집할 source의 UUID")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", action="store_true", help="저장하지 않고 계획만 출력 (기본값)")
    group.add_argument("--save", action="store_true", help="planned_new item을 실제로 저장")
    return parser.parse_args(argv)


def _print_plan(plan: CollectionPlan) -> None:
    print(f"source_id       : {plan.source_id}")
    print(f"feed_url        : {plan.feed_url}")
    print(f"mode            : {plan.mode}")
    print(f"fetched/parsed  : {plan.fetched_count}/{plan.parsed_count}")
    print(f"planned_new     : {plan.planned_new_count}")
    print(f"duplicate_in_db : {plan.duplicate_in_db_count}")
    print(f"duplicate_feed  : {plan.duplicate_in_feed_count}")
    print(f"rejected        : {plan.rejected_count} {plan.rejected_by_reason or ''}")
    print(
        f"missing_published_at: {plan.missing_published_at_count} "
        f"({plan.missing_published_at_ratio:.0%} of planned_new)"
    )
    if plan.mode == service.MODE_SAVE:
        print(f"inserted        : {plan.inserted_count}")
        print(f"duplicate_race  : {plan.duplicate_race_count}")
        print(f"failed          : {plan.failed_count}")
        for failed in plan.failed_items:
            print(f"  FAILED {failed['error']}: {failed['title']} | {failed['canonical_url']}")

    print("-" * 60)
    for item in plan.items:
        reason = f" [{item.reject_reason.value}]" if item.reject_reason else ""
        print(f"{item.status.value:16} {item.title[:60]}{reason}")
        if item.canonical_url != item.original_url:
            print(f"                 {item.original_url} -> {item.canonical_url}")


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    mode = service.MODE_SAVE if args.save else service.MODE_DRY_RUN

    try:
        plan = service.run(args.source_id, mode)
    except PipelineError as exc:
        print(f"FAILURE {exc.code.value}: {exc.detail or ''}", file=sys.stderr)
        return EXIT_FAILURE

    _print_plan(plan)

    if any(item.status == ItemStatus.FAILED for item in plan.items):
        return EXIT_PARTIAL_FAILURE
    return EXIT_SUCCESS


if __name__ == "__main__":
    raise SystemExit(main())
