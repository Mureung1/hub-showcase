"""collect_sources CLI가 batch_service.run_collectable_sources를 한 번 호출하고,
결과를 그대로 출력하며 overall_status를 종료 코드로 매핑하는 것을 검증한다.

batch_service.run_collectable_sources만 mock한다 — 실제 DB/HTTP를 쓰는
service.run, repository.* 는 이 mock 아래에 있어 호출될 일이 없다.
"""

from __future__ import annotations

import contextlib
import io
import re
import unittest
from unittest import mock

from app.content import service
from app.content.models import (
    BatchCollectionResult,
    CollectionPlan,
    FeedError,
    ItemStatus,
    PlannedItem,
    RejectReason,
    SourceCollectionFailure,
)
from app.jobs import collect_sources


def make_item(status: ItemStatus, reject_reason: RejectReason | None = None) -> PlannedItem:
    """집계 프로퍼티(duplicate_in_db 등) 계산에 필요한 최소 PlannedItem."""
    return PlannedItem(
        status=status,
        title="t",
        original_url="https://example.com/a",
        canonical_url="https://example.com/a",
        reject_reason=reject_reason,
    )


def make_plan(
    source_id: str,
    *,
    inserted: int = 0,
    duplicate_in_db: int = 0,
    duplicate_in_feed: int = 0,
    duplicate_race: int = 0,
    rejected: int = 0,
    failed_items: list[dict] | None = None,
) -> CollectionPlan:
    """CLI가 각 집계 label을 그대로 출력하는지 확인하는 데 필요한 plan을 만든다."""
    # duplicate_in_db/in_feed/rejected는 CollectionPlan의 계산 속성이라
    # 숫자를 직접 넣을 수 없고, 실제 item 상태로 표현해야 한다.
    items = (
        [make_item(ItemStatus.DUPLICATE_IN_DB) for _ in range(duplicate_in_db)]
        + [make_item(ItemStatus.DUPLICATE_IN_FEED) for _ in range(duplicate_in_feed)]
        + [make_item(ItemStatus.REJECTED, RejectReason.QUALITY_BELOW_THRESHOLD) for _ in range(rejected)]
    )
    failed_items = failed_items or []
    return CollectionPlan(
        source_id=source_id,
        feed_url="https://example.com/feed.xml",
        mode="save",
        fetched_count=len(items) + inserted + duplicate_race + len(failed_items),
        parsed_count=len(items) + inserted + duplicate_race + len(failed_items),
        items=items,
        inserted_count=inserted,
        duplicate_race_count=duplicate_race,
        failed_count=len(failed_items),
        failed_items=failed_items,
        run_status="partial_failure" if failed_items else "success",
    )


def label_value(output: str, label: str) -> str:
    """`label   : value` 한 줄에서 값만 뽑는다.

    공백·정렬은 구현 세부사항이라 고정하지 않되, 집계값처럼 우연히 다른 숫자와
    겹칠 수 있는 값은 반드시 해당 label 줄에서 나온 값인지 정확히 확인해야 한다.
    """
    match = re.search(rf"^{re.escape(label)}\s*:\s*(.+)$", output, re.MULTILINE)
    assert match is not None, f"label {label!r} not found in output:\n{output}"
    return match.group(1).strip()


class DefaultsToDryRunTest(unittest.TestCase):
    def test_defaults_to_dry_run_and_returns_success_exit_code(self):
        """옵션이 없으면 dry-run으로 batch service를 정확히 한 번 호출하고,
        전체 성공이면 exit code 0을 반환한다."""
        result = BatchCollectionResult(mode=service.MODE_DRY_RUN, plans=[make_plan("a", inserted=1)], failures=[])

        with mock.patch.object(
            collect_sources.batch_service, "run_collectable_sources", return_value=result
        ) as run_mock:
            stdout = io.StringIO()
            with contextlib.redirect_stdout(stdout):
                exit_code = collect_sources.main([])

        # 옵션 없음 -> dry-run 모드로, 정확히 한 번만 호출됐는지 함께 확인한다.
        run_mock.assert_called_once_with(service.MODE_DRY_RUN)
        self.assertEqual(exit_code, 0)
        output = stdout.getvalue()
        self.assertIn("overall_status", output)
        self.assertIn("success", output)


class SaveReportsPartialFailureTest(unittest.TestCase):
    def test_save_reports_partial_failure_aggregates_and_failures_with_exit_code_1(self):
        """--save 실행에서 partial_failure 결과의 집계값과 source별 실패 정보를
        출력하고 exit code 1을 반환한다."""
        # 각 집계 항목을 서로 다른 값으로 둬서, 우연히 같은 숫자가 찍혀 통과하는
        # 일을 막고 label별로 올바른 값이 붙는지 구분해서 검증한다.
        plan_a = make_plan("a", inserted=3, duplicate_in_db=1, duplicate_in_feed=2, duplicate_race=1, rejected=1)
        plan_b = make_plan(
            "b",
            inserted=1,
            failed_items=[{"title": "Broken Title", "canonical_url": "https://example.com/broken", "error": "RpcTimeout"}],
        )
        failures = [SourceCollectionFailure(source_id="c", error_code=FeedError.FETCH_TIMEOUT)]
        result = BatchCollectionResult(mode=service.MODE_SAVE, plans=[plan_a, plan_b], failures=failures)

        with mock.patch.object(
            collect_sources.batch_service, "run_collectable_sources", return_value=result
        ) as run_mock:
            stdout = io.StringIO()
            with contextlib.redirect_stdout(stdout):
                exit_code = collect_sources.main(["--save"])

        run_mock.assert_called_once_with(service.MODE_SAVE)
        self.assertEqual(exit_code, 1)
        output = stdout.getvalue()

        # 집계 label마다 정확한 값이 붙는지 확인한다(우연히 다른 숫자와 겹쳐서
        # 통과하는 걸 막으려고 label_value로 해당 줄의 값만 뽑아 비교한다).
        self.assertEqual(label_value(output, "inserted"), "4")  # 3(a) + 1(b)
        self.assertEqual(label_value(output, "duplicate_in_db"), "1")
        self.assertEqual(label_value(output, "duplicate_in_feed"), "2")
        self.assertEqual(label_value(output, "duplicate_race"), "1")
        self.assertEqual(label_value(output, "rejected"), "1")
        # failed_item_total: PipelineError로 통째로 실패한 source(c)는 여기 포함되지 않고,
        # source는 성공했지만 item 하나가 저장 실패한 plan_b의 failed_count(1)만 잡힌다.
        self.assertEqual(label_value(output, "failed_item"), "1")

        # source 단위 PipelineError 실패: 오류 코드 문자열을 하드코딩하지 않고
        # FeedError.value를 기준으로 검증해 enum 값이 바뀌어도 테스트가 그 정의를 따라가게 한다.
        self.assertIn("c", output)
        self.assertIn(FeedError.FETCH_TIMEOUT.value, output)

        # item 단위 실패 상세: source는 성공했지만 item 저장이 일부 실패한 경우
        # (plan.failed_items)도 title/canonical_url/error가 함께 드러나야 한다.
        # (title/canonical_url/error 외 응답 본문·환경변수 등은 애초에 failed_items에 없다.)
        self.assertIn("Broken Title", output)
        self.assertIn("https://example.com/broken", output)
        self.assertIn("RpcTimeout", output)


class AllSourcesFailedTest(unittest.TestCase):
    def test_all_sources_failed_reports_failures_with_exit_code_2(self):
        """모든 source가 PipelineError로 실패하면 exit code 2를 반환하고
        각 실패 source의 정보를 출력한다."""
        failures = [
            SourceCollectionFailure(source_id="a", error_code=FeedError.FETCH_TIMEOUT),
            SourceCollectionFailure(source_id="b", error_code=FeedError.SOURCE_NOT_FOUND),
        ]
        result = BatchCollectionResult(mode=service.MODE_DRY_RUN, plans=[], failures=failures)

        with mock.patch.object(collect_sources.batch_service, "run_collectable_sources", return_value=result):
            stdout = io.StringIO()
            with contextlib.redirect_stdout(stdout):
                exit_code = collect_sources.main(["--dry-run"])

        self.assertEqual(exit_code, 2)
        output = stdout.getvalue()
        self.assertIn("a", output)
        self.assertIn(FeedError.FETCH_TIMEOUT.value, output)
        self.assertIn("b", output)
        self.assertIn(FeedError.SOURCE_NOT_FOUND.value, output)


class InvalidArgumentsTest(unittest.TestCase):
    def test_invalid_arguments_exit_with_code_2_without_calling_batch_service(self):
        """옵션 조합이나 이름이 잘못되면 SystemExit(2)가 발생하고 batch service는 호출되지 않는다."""
        cases = {
            "mutually_exclusive": ["--save", "--dry-run"],
            "unknown_option": ["--unknown"],
            # 이 CLI에는 --source-id가 없다(단일 source용 collect_feed.py 전용 옵션).
            "undefined_source_id_option": ["--source-id", "x"],
        }
        for label, argv in cases.items():
            with self.subTest(label):
                with mock.patch.object(collect_sources.batch_service, "run_collectable_sources") as run_mock:
                    # argparse가 에러를 stderr에 쓰므로, 테스트 출력이 지저분해지지 않게 감싼다.
                    with contextlib.redirect_stderr(io.StringIO()):
                        with self.assertRaises(SystemExit) as ctx:
                            collect_sources.main(argv)

                self.assertEqual(ctx.exception.code, 2)
                run_mock.assert_not_called()
