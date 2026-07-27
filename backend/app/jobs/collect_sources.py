"""여러 콘텐츠 소스 일괄 수집 실행 CLI. docs/plan/engineering/content-pipeline.md 16장.

    uv run python -m app.jobs.collect_sources --dry-run
    uv run python -m app.jobs.collect_sources --save
"""

from __future__ import annotations

import argparse
import sys

from app.content import batch_service, service
from app.content.models import BatchCollectionResult

EXIT_SUCCESS = 0
EXIT_PARTIAL_FAILURE = 1
EXIT_FAILURE = 2

_EXIT_CODE_BY_STATUS = {
    "success": EXIT_SUCCESS,
    "partial_failure": EXIT_PARTIAL_FAILURE,
    "failure": EXIT_FAILURE,
}


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="collect_sources", description="수집 대상 콘텐츠 소스 일괄 실행")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", action="store_true", help="저장하지 않고 계획만 출력 (기본값)")
    group.add_argument("--save", action="store_true", help="planned_new item을 실제로 저장")
    return parser.parse_args(argv)


def _print_result(result: BatchCollectionResult) -> None:
    print(f"mode                : {result.mode}")
    print(f"total_source_count  : {result.total_source_count}")
    print(f"successful_source   : {result.successful_source_count}")
    print(f"failed_source       : {result.failed_source_count}")
    print(f"inserted            : {result.inserted_total}")
    print(f"duplicate_in_db     : {result.duplicate_in_db_total}")
    print(f"duplicate_in_feed   : {result.duplicate_in_feed_total}")
    print(f"duplicate_race      : {result.duplicate_race_total}")
    print(f"rejected            : {result.rejected_total}")
    print(f"failed_item         : {result.failed_item_total}")
    print(f"overall_status      : {result.overall_status}")

    # 실행 이력·모니터링 화면이 아직 없어 CLI 출력이 유일한 디버깅 단서다.
    # 단, plan.failed_items는 service._save()가 title/canonical_url/error(예외 타입명)만
    # 채워 넣으므로 여기서도 그 세 필드(+source_id)만 출력한다. RPC 응답 본문, 환경변수,
    # 인증정보는 애초에 failed_items에 담기지 않는다.
    for plan in result.plans:
        for failed in plan.failed_items:
            print(f"  ITEM_FAILED {plan.source_id} {failed['error']}: {failed['title']} | {failed['canonical_url']}")
    for failure in result.failures:
        print(f"  SOURCE_FAILED {failure.source_id}: {failure.error_code.value}")


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    mode = service.MODE_SAVE if args.save else service.MODE_DRY_RUN

    result = batch_service.run_collectable_sources(mode)
    _print_result(result)

    return _EXIT_CODE_BY_STATUS[result.overall_status]


if __name__ == "__main__":
    raise SystemExit(main())
